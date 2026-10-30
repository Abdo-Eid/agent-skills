#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate XLSX package integrity, formulas, caches, and its required QA contract."""

from __future__ import annotations

import argparse
from collections import Counter
import json
import math
import posixpath
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import unquote

from xml.etree import ElementTree
from xml.parsers import expat

# OOXML parts never carry a DTD, so any DOCTYPE is rejected before parsing; expat 2.4.1 and later
# also limits entity expansion. This replaces the defusedxml dependency.
if expat.version_info < (2, 4, 1):
    raise SystemExit(f"expat {expat.version_info} is too old: 2.4.1 or newer is required")
_DOCTYPE = tuple("<!DOCTYPE".encode(codec) for codec in ("utf-8", "utf-16-le", "utf-16-be"))


def parse_xml(data: bytes) -> ElementTree.Element:
    if any(marker in data for marker in _DOCTYPE):
        raise ElementTree.ParseError("DOCTYPE is not allowed in an OOXML part")
    return ElementTree.fromstring(data)


ERROR_VALUES = {"#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A"}
REQUIRED_PARTS = {
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
}


def issue(
    issues: list[dict[str, Any]],
    code: str,
    message: str,
    location: str | None = None,
    severity: str = "error",
) -> None:
    if len(issues) >= 500:
        return
    row: dict[str, Any] = {"severity": severity, "code": code, "message": message}
    if location:
        row["location"] = location
    issues.append(row)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def relationship_base(rels_path: str) -> str:
    if rels_path == "_rels/.rels":
        return ""
    marker = "/_rels/"
    if marker not in rels_path or not rels_path.endswith(".rels"):
        return ""
    prefix, rel_name = rels_path.split(marker, 1)
    source_part = posixpath.join(prefix, rel_name[:-5])
    return posixpath.dirname(source_part)


def check_relationships(
    archive: zipfile.ZipFile,
    names: set[str],
    issues: list[dict[str, Any]],
) -> int:
    checked = 0
    for rels_path in sorted(name for name in names if name.endswith(".rels")):
        try:
            root = parse_xml(archive.read(rels_path))
        except Exception:
            continue
        base = relationship_base(rels_path)
        for relation in root.iter():
            if local_name(relation.tag) != "Relationship":
                continue
            checked += 1
            if relation.attrib.get("TargetMode", "").lower() == "external":
                continue
            target = unquote(relation.attrib.get("Target", "")).replace("\\", "/")
            if not target:
                issue(
                    issues,
                    "XLSX_RELATIONSHIP_TARGET_MISSING",
                    "relationship has no target",
                    rels_path,
                )
                continue
            resolved = posixpath.normpath(
                target.lstrip("/") if target.startswith("/") else posixpath.join(base, target)
            )
            if resolved == ".." or resolved.startswith("../"):
                issue(
                    issues,
                    "XLSX_RELATIONSHIP_TARGET_UNSAFE",
                    f"relationship target escapes the package: {target}",
                    rels_path,
                )
            elif resolved not in names:
                issue(
                    issues,
                    "XLSX_RELATIONSHIP_TARGET_MISSING",
                    f"relationship target does not exist: {resolved}",
                    rels_path,
                )
    return checked


def check_content_types(
    archive: zipfile.ZipFile,
    names: set[str],
    issues: list[dict[str, Any]],
) -> int:
    if "[Content_Types].xml" not in names:
        return 0
    try:
        root = parse_xml(archive.read("[Content_Types].xml"))
    except Exception:
        return 0
    overrides = 0
    for element in root.iter():
        if local_name(element.tag) != "Override":
            continue
        overrides += 1
        part = element.attrib.get("PartName", "").lstrip("/")
        if not part or part not in names:
            issue(
                issues,
                "XLSX_CONTENT_TYPE_TARGET_MISSING",
                "content type override targets a missing package part",
                part or "[Content_Types].xml",
            )
    return overrides


def check_xml_indexes(
    archive: zipfile.ZipFile,
    names: set[str],
    issues: list[dict[str, Any]],
) -> None:
    style_count = 0
    if "xl/styles.xml" in names:
        try:
            root = parse_xml(archive.read("xl/styles.xml"))
            for element in root.iter():
                if local_name(element.tag) == "cellXfs":
                    style_count = sum(
                        1 for child in element if local_name(child.tag) == "xf"
                    )
                    break
        except Exception:
            pass

    shared_count = 0
    if "xl/sharedStrings.xml" in names:
        try:
            root = parse_xml(archive.read("xl/sharedStrings.xml"))
            shared_count = sum(1 for element in root if local_name(element.tag) == "si")
        except Exception:
            pass

    for worksheet_path in sorted(
        name
        for name in names
        if name.startswith("xl/worksheets/") and name.endswith(".xml")
    ):
        try:
            root = parse_xml(archive.read(worksheet_path))
        except Exception:
            continue
        for cell in root.iter():
            if local_name(cell.tag) != "c":
                continue
            location = f"{worksheet_path}:{cell.attrib.get('r', '?')}"
            style = cell.attrib.get("s")
            if style is not None:
                try:
                    style_index = int(style)
                    if style_index < 0 or style_index >= style_count:
                        issue(
                            issues,
                            "XLSX_STYLE_INDEX_INVALID",
                            f"cell style index {style_index} is outside {style_count} styles",
                            location,
                        )
                except ValueError:
                    issue(
                        issues,
                        "XLSX_STYLE_INDEX_INVALID",
                        f"cell style index is not an integer: {style!r}",
                        location,
                    )
            if cell.attrib.get("t") != "s":
                continue
            value_element = next(
                (child for child in cell if local_name(child.tag) == "v"), None
            )
            try:
                shared_index = int(
                    (value_element.text or "") if value_element is not None else ""
                )
                if shared_index < 0 or shared_index >= shared_count:
                    raise ValueError
            except (TypeError, ValueError):
                issue(
                    issues,
                    "XLSX_SHARED_STRING_INDEX_INVALID",
                    "cell references a missing shared string",
                    location,
                )


def check_package(path: Path, issues: list[dict[str, Any]]) -> dict[str, int]:
    if not zipfile.is_zipfile(path):
        issue(issues, "XLSX_NOT_ZIP", "artifact is not a valid ZIP package")
        return {"entries": 0, "xmlParts": 0}
    with zipfile.ZipFile(path) as archive:
        all_names = archive.namelist()
        names = set(all_names)
        duplicates = sorted(name for name, count in Counter(all_names).items() if count > 1)
        for name in duplicates:
            issue(issues, "XLSX_DUPLICATE_PART", "duplicate ZIP entry", name)
        for name in all_names:
            pure = PurePosixPath(name)
            if pure.is_absolute() or ".." in pure.parts or "\\" in name:
                issue(issues, "XLSX_UNSAFE_PART_PATH", "unsafe package path", name)
        for missing in sorted(REQUIRED_PARTS.difference(names)):
            issue(issues, "XLSX_REQUIRED_PART_MISSING", "required package part is missing", missing)
        broken = archive.testzip()
        if broken:
            issue(issues, "XLSX_CORRUPT_ZIP_ENTRY", "ZIP checksum failed", broken)
        xml_parts = 0
        for name in all_names:
            if not (name.endswith(".xml") or name.endswith(".rels")):
                continue
            xml_parts += 1
            try:
                parse_xml(archive.read(name))
            except Exception as error:
                issue(issues, "XLSX_XML_INVALID", str(error), name)
        relationship_count = check_relationships(archive, names, issues)
        content_type_count = check_content_types(archive, names, issues)
        check_xml_indexes(archive, names, issues)
        return {
            "entries": len(all_names),
            "xmlParts": xml_parts,
            "relationships": relationship_count,
            "contentTypeOverrides": content_type_count,
        }


def split_cell_reference(reference: str) -> tuple[str, str]:
    if "!" not in reference:
        raise ValueError(f"cell reference must include a sheet: {reference}")
    sheet, cell = reference.rsplit("!", 1)
    if sheet.startswith("'") and sheet.endswith("'"):
        sheet = sheet[1:-1].replace("''", "'")
    return sheet, cell.upper()


def normalize_formula(value: Any) -> str:
    formula = str(value or "")
    if formula and not formula.startswith("="):
        formula = "=" + formula
    return re.sub(r"\s+", "", formula).upper()


def json_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def values_equal(received: Any, expected: Any, tolerance: float) -> bool:
    if isinstance(received, (int, float)) and isinstance(expected, (int, float)):
        if not math.isfinite(float(received)) or not math.isfinite(float(expected)):
            return received == expected
        return abs(float(received) - float(expected)) <= tolerance
    return json_value(received) == expected


def canonical_contract_key(value: Any) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if math.isfinite(number) and number.is_integer():
            return str(int(number))
    return str(value or "").strip()


def cells_in_reference(sheet: Any, reference: str) -> list[Any]:
    selected = sheet[reference]
    if isinstance(selected, tuple):
        return [cell for row in selected for cell in row]
    return [selected]


def load_contract(path: Path, explicit: Path | None, issues: list[dict[str, Any]]) -> dict[str, Any] | None:
    contract_path = explicit or Path(str(path) + ".qa.json")
    if not contract_path.exists():
        issue(
            issues,
            "XLSX_QA_CONTRACT_MISSING",
            "generated workbooks require an adjacent schemaVersion 1 QA contract",
            str(contract_path),
        )
        return None
    try:
        contract = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as error:
        issue(issues, "XLSX_QA_CONTRACT_INVALID", str(error), str(contract_path))
        return None
    if not isinstance(contract, dict) or contract.get("schemaVersion") != 1:
        issue(
            issues,
            "XLSX_QA_CONTRACT_SCHEMA",
            "QA contract must be an object with schemaVersion 1",
            str(contract_path),
        )
        return None
    list_fields = (
        "requiredFormulas",
        "expectedValues",
        "rangeValues",
        "numberFormats",
        "freezePanes",
        "requiredCharts",
        "printSettings",
        "requiredTables",
        "keyRelations",
        "sheetViews",
        "borderRanges",
    )
    for field in list_fields:
        if field in contract and not isinstance(contract[field], list):
            issue(
                issues,
                "XLSX_QA_CONTRACT_SCHEMA",
                f"{field} must be an array",
                str(contract_path),
            )
            contract[field] = []
        elif field in contract:
            valid_items: list[dict[str, Any]] = []
            for index, item in enumerate(contract[field]):
                if not isinstance(item, dict):
                    issue(
                        issues,
                        "XLSX_QA_CONTRACT_SCHEMA",
                        f"{field}[{index}] must be an object",
                        str(contract_path),
                    )
                    continue
                valid_items.append(item)
            contract[field] = valid_items
    if "exactSheets" in contract and not (
        isinstance(contract["exactSheets"], list)
        and all(isinstance(name, str) and name for name in contract["exactSheets"])
    ):
        issue(
            issues,
            "XLSX_QA_CONTRACT_SCHEMA",
            "exactSheets must be an array of non-empty strings",
            str(contract_path),
        )
        contract["exactSheets"] = []
    try:
        minimum_formula_cells = int(contract.get("minimumFormulaCells", 0))
        if minimum_formula_cells < 0:
            raise ValueError
        contract["minimumFormulaCells"] = minimum_formula_cells
    except (TypeError, ValueError):
        issue(
            issues,
            "XLSX_QA_CONTRACT_SCHEMA",
            "minimumFormulaCells must be a non-negative integer",
            str(contract_path),
        )
        contract["minimumFormulaCells"] = 0
    if "requireFormulaCaches" in contract and not isinstance(
        contract["requireFormulaCaches"], bool
    ):
        issue(
            issues,
            "XLSX_QA_CONTRACT_SCHEMA",
            "requireFormulaCaches must be a boolean",
            str(contract_path),
        )
        contract["requireFormulaCaches"] = True
    return contract


def check_contract(
    workbook: Any,
    cached: Any,
    contract: dict[str, Any],
    issues: list[dict[str, Any]],
) -> None:
    exact_sheets = contract.get("exactSheets")
    if exact_sheets is not None and workbook.sheetnames != exact_sheets:
        issue(
            issues,
            "XLSX_SHEET_CONTRACT",
            f"expected sheets {exact_sheets!r}, received {workbook.sheetnames!r}",
        )

    for assertion in contract.get("requiredFormulas", []):
        try:
            sheet_name, coordinate = split_cell_reference(assertion["cell"])
            received = workbook[sheet_name][coordinate].value
            expected = assertion["formula"]
            if normalize_formula(received) != normalize_formula(expected):
                issue(
                    issues,
                    "XLSX_FORMULA_CONTRACT",
                    f"expected {expected!r}, received {received!r}",
                    assertion["cell"],
                )
        except Exception as error:
            issue(issues, "XLSX_FORMULA_CONTRACT_INVALID", str(error), assertion.get("cell"))

    for assertion in contract.get("expectedValues", []):
        try:
            sheet_name, coordinate = split_cell_reference(assertion["cell"])
            received = cached[sheet_name][coordinate].value
            expected = assertion["value"]
            tolerance = float(assertion.get("tolerance", 0))
            if not values_equal(received, expected, tolerance):
                issue(
                    issues,
                    "XLSX_VALUE_CONTRACT",
                    f"expected {expected!r} +/- {tolerance}, received {json_value(received)!r}",
                    assertion["cell"],
                )
        except Exception as error:
            issue(issues, "XLSX_VALUE_CONTRACT_INVALID", str(error), assertion.get("cell"))

    for assertion in contract.get("rangeValues", []):
        try:
            sheet_name, cell_range = split_cell_reference(assertion["range"])
            received = [
                json_value(cell.value) for cell in cells_in_reference(cached[sheet_name], cell_range)
            ]
            expected = assertion["values"]
            if received != expected:
                issue(
                    issues,
                    "XLSX_RANGE_CONTRACT",
                    f"expected {expected!r}, received {received!r}",
                    assertion["range"],
                )
        except Exception as error:
            issue(issues, "XLSX_RANGE_CONTRACT_INVALID", str(error), assertion.get("range"))

    for assertion in contract.get("numberFormats", []):
        try:
            sheet_name, coordinate = split_cell_reference(assertion["cell"])
            received = workbook[sheet_name][coordinate].number_format
            expected = assertion["format"]
            if received != expected:
                issue(
                    issues,
                    "XLSX_NUMBER_FORMAT_CONTRACT",
                    f"expected {expected!r}, received {received!r}",
                    assertion["cell"],
                )
        except Exception as error:
            issue(issues, "XLSX_NUMBER_FORMAT_CONTRACT_INVALID", str(error), assertion.get("cell"))

    for assertion in contract.get("freezePanes", []):
        try:
            sheet = workbook[assertion["sheet"]]
            received = str(sheet.freeze_panes or "")
            expected = assertion["cell"]
            if received != expected:
                issue(
                    issues,
                    "XLSX_FREEZE_PANE_CONTRACT",
                    f"expected {expected!r}, received {received!r}",
                    assertion["sheet"],
                )
        except Exception as error:
            issue(issues, "XLSX_FREEZE_PANE_CONTRACT_INVALID", str(error), assertion.get("sheet"))

    for assertion in contract.get("requiredCharts", []):
        try:
            sheet = workbook[assertion["sheet"]]
            charts = list(getattr(sheet, "_charts", []))
            received = len(charts)
            expected = int(assertion.get("minimum", 1))
            if received < expected:
                issue(
                    issues,
                    "XLSX_CHART_CONTRACT",
                    f"expected at least {expected} chart(s), received {received}",
                    assertion["sheet"],
                )
            minimum_series = int(assertion.get("minimumSeries", 0))
            if minimum_series > 0:
                largest_series_count = max(
                    (
                        sum(
                            len(getattr(part, "ser", []))
                            for part in (getattr(chart, "_charts", None) or [chart])
                        )
                        for chart in charts
                    ),
                    default=0,
                )
                if largest_series_count < minimum_series:
                    issue(
                        issues,
                        "XLSX_CHART_SERIES_CONTRACT",
                        f"expected a chart with at least {minimum_series} series, received {largest_series_count}",
                        assertion["sheet"],
                    )
        except Exception as error:
            issue(issues, "XLSX_CHART_CONTRACT_INVALID", str(error), assertion.get("sheet"))

    for assertion in contract.get("printSettings", []):
        try:
            sheet = workbook[assertion["sheet"]]
            expected_orientation = assertion.get("orientation")
            if expected_orientation and sheet.page_setup.orientation != expected_orientation:
                issue(
                    issues,
                    "XLSX_PRINT_ORIENTATION_CONTRACT",
                    f"expected {expected_orientation!r}, received {sheet.page_setup.orientation!r}",
                    assertion["sheet"],
                )
            if "fitToWidth" in assertion:
                received_width = sheet.page_setup.fitToWidth
                fit_properties = sheet.sheet_properties.pageSetUpPr
                fit_enabled = bool(fit_properties and fit_properties.fitToPage)
                effective_width = (
                    1 if fit_enabled and received_width is None else int(received_width or 0)
                )
                if not fit_enabled or effective_width != int(assertion["fitToWidth"]):
                    issue(
                        issues,
                        "XLSX_PRINT_WIDTH_CONTRACT",
                        f"expected fitToPage=true and fitToWidth={assertion['fitToWidth']}, "
                        f"received fitToPage={fit_enabled!r}, fitToWidth={effective_width!r}",
                        assertion["sheet"],
                    )
            if assertion.get("requirePrintArea") and not sheet.print_area:
                issue(
                    issues,
                    "XLSX_PRINT_AREA_CONTRACT",
                    "expected an explicit print area",
                    assertion["sheet"],
                )
        except Exception as error:
            issue(issues, "XLSX_PRINT_CONTRACT_INVALID", str(error), assertion.get("sheet"))

    for assertion in contract.get("requiredTables", []):
        try:
            from openpyxl.utils.cell import range_boundaries

            sheet = workbook[assertion["sheet"]]
            table_name = assertion.get("name")
            table = sheet.tables.get(table_name) if table_name else None
            if table is None and not table_name and len(sheet.tables) == 1:
                table = next(iter(sheet.tables.values()))
            if table is None:
                issue(
                    issues,
                    "XLSX_TABLE_CONTRACT",
                    f"required table {table_name or '<single table>'!r} not found; received {list(sheet.tables)!r}",
                    assertion["sheet"],
                )
                continue
            received_ref = str(table.ref)
            expected_ref = assertion.get("ref")
            if expected_ref and received_ref != expected_ref:
                issue(
                    issues,
                    "XLSX_TABLE_RANGE_CONTRACT",
                    f"expected {expected_ref!r}, received {received_ref!r}",
                    f"{assertion['sheet']}!{table.name}",
                )
            if "dataRows" in assertion:
                _, min_row, _, max_row = range_boundaries(received_ref)
                received_rows = int(max_row or 0) - int(min_row or 0)
                if getattr(table, "totalsRowShown", False):
                    received_rows -= 1
                if received_rows != int(assertion["dataRows"]):
                    issue(
                        issues,
                        "XLSX_TABLE_ROW_COUNT_CONTRACT",
                        f"expected {assertion['dataRows']} data rows, received {received_rows}",
                        f"{assertion['sheet']}!{table.name}",
                    )
            expected_headers = assertion.get("headers")
            if expected_headers is not None:
                received_headers = [column.name for column in table.tableColumns]
                if received_headers != expected_headers:
                    issue(
                        issues,
                        "XLSX_TABLE_HEADER_CONTRACT",
                        f"expected {expected_headers!r}, received {received_headers!r}",
                        f"{assertion['sheet']}!{table.name}",
                    )
        except Exception as error:
            issue(issues, "XLSX_TABLE_CONTRACT_INVALID", str(error), assertion.get("sheet"))

    for assertion in contract.get("keyRelations", []):
        try:
            subset_sheet, subset_range = split_cell_reference(assertion["subsetRange"])
            superset_sheet, superset_range = split_cell_reference(assertion["supersetRange"])
            subset_cells = cells_in_reference(cached[subset_sheet], subset_range)
            superset_cells = cells_in_reference(cached[superset_sheet], superset_range)
            ignore_blanks = assertion.get("ignoreBlanks", True)
            subset_values = [
                (f"{subset_sheet}!{cell.coordinate}", canonical_contract_key(cell.value))
                for cell in subset_cells
                if not ignore_blanks or canonical_contract_key(cell.value)
            ]
            superset_values = {
                canonical_contract_key(cell.value)
                for cell in superset_cells
                if not ignore_blanks or canonical_contract_key(cell.value)
            }
            unexpected = [(location, value) for location, value in subset_values if value not in superset_values]
            if unexpected:
                truncated = (
                    f"; and {len(unexpected) - 20} more" if len(unexpected) > 20 else ""
                )
                issue(
                    issues,
                    "XLSX_KEY_SUBSET_CONTRACT",
                    f"unexpected keys {unexpected[:20]!r}{truncated}; "
                    f"superset={assertion['supersetRange']}",
                    assertion["subsetRange"],
                )
            if assertion.get("requireUnique"):
                counts = Counter(value for _, value in subset_values)
                duplicates = sorted(value for value, count in counts.items() if count > 1)
                if duplicates:
                    issue(
                        issues,
                        "XLSX_KEY_UNIQUENESS_CONTRACT",
                        f"duplicate keys {duplicates[:20]!r}",
                        assertion["subsetRange"],
                    )
        except Exception as error:
            issue(
                issues,
                "XLSX_KEY_RELATION_CONTRACT_INVALID",
                str(error),
                assertion.get("subsetRange"),
            )

    for assertion in contract.get("sheetViews", []):
        try:
            sheet = workbook[assertion["sheet"]]
            if "showGridLines" in assertion:
                received = sheet.sheet_view.showGridLines is not False
                if received != bool(assertion["showGridLines"]):
                    issue(
                        issues,
                        "XLSX_GRIDLINES_CONTRACT",
                        f"expected showGridLines={assertion['showGridLines']}, received {received}",
                        assertion["sheet"],
                    )
            if assertion.get("allowHiddenRows") is False:
                hidden_rows = [row for row, dimension in sheet.row_dimensions.items() if dimension.hidden]
                if hidden_rows:
                    issue(
                        issues,
                        "XLSX_HIDDEN_ROWS_CONTRACT",
                        f"hidden rows are not allowed: {hidden_rows[:20]!r}",
                        assertion["sheet"],
                    )
            if assertion.get("allowHiddenColumns") is False:
                hidden_columns = [
                    column for column, dimension in sheet.column_dimensions.items() if dimension.hidden
                ]
                if hidden_columns:
                    issue(
                        issues,
                        "XLSX_HIDDEN_COLUMNS_CONTRACT",
                        f"hidden columns are not allowed: {hidden_columns[:20]!r}",
                        assertion["sheet"],
                    )
        except Exception as error:
            issue(issues, "XLSX_SHEET_VIEW_CONTRACT_INVALID", str(error), assertion.get("sheet"))

    for assertion in contract.get("borderRanges", []):
        try:
            sheet_name, cell_range = split_cell_reference(assertion["range"])
            expected_style = assertion.get("style", "thin")
            sides = assertion.get("sides", ["left", "right", "top", "bottom"])
            failures: list[str] = []
            for cell in cells_in_reference(workbook[sheet_name], cell_range):
                for side in sides:
                    received_style = getattr(cell.border, side).style
                    if received_style != expected_style:
                        failures.append(f"{cell.coordinate}.{side}={received_style!r}")
                        break
                if len(failures) >= 20:
                    break
            if failures:
                issue(
                    issues,
                    "XLSX_BORDER_CONTRACT",
                    f"expected {expected_style!r} borders; mismatches {failures!r}",
                    assertion["range"],
                )
        except Exception as error:
            issue(issues, "XLSX_BORDER_CONTRACT_INVALID", str(error), assertion.get("range"))


def check_workbook_structures(workbook: Any, issues: list[dict[str, Any]]) -> None:
    try:
        from openpyxl.utils.cell import range_boundaries
    except ImportError:
        return

    for defined_name in workbook.defined_names.values():
        text = str(getattr(defined_name, "attr_text", "") or "")
        if "#REF!" in text.upper():
            issue(
                issues,
                "XLSX_DEFINED_NAME_BROKEN",
                "defined name contains #REF!",
                str(getattr(defined_name, "name", "defined-name")),
            )

    for sheet in workbook.worksheets:
        for merged_range in sheet.merged_cells.ranges:
            try:
                range_boundaries(str(merged_range))
            except Exception as error:
                issue(
                    issues,
                    "XLSX_MERGED_RANGE_INVALID",
                    str(error),
                    f"{sheet.title}!{merged_range}",
                )
        for table in sheet.tables.values():
            try:
                range_boundaries(str(table.ref))
            except Exception as error:
                issue(
                    issues,
                    "XLSX_TABLE_RANGE_INVALID",
                    str(error),
                    f"{sheet.title}!{getattr(table, 'ref', '?')}",
                )
        validations = getattr(sheet.data_validations, "dataValidation", [])
        for validation in validations:
            for validation_range in validation.ranges.ranges:
                try:
                    range_boundaries(str(validation_range))
                except Exception as error:
                    issue(
                        issues,
                        "XLSX_VALIDATION_RANGE_INVALID",
                        str(error),
                        f"{sheet.title}!{validation_range}",
                    )


def check_chart_references(
    path: Path,
    sheet_names: list[str],
    issues: list[dict[str, Any]],
) -> None:
    with zipfile.ZipFile(path) as archive:
        chart_paths = sorted(
            name
            for name in archive.namelist()
            if name.startswith("xl/charts/") and name.endswith(".xml")
        )
        for chart_path in chart_paths:
            try:
                root = parse_xml(archive.read(chart_path))
            except Exception:
                continue
            references = [
                str(element.text or "")
                for element in root.iter()
                if local_name(element.tag) == "f" and str(element.text or "").strip()
            ]
            if not references:
                issue(
                    issues,
                    "XLSX_CHART_SERIES_MISSING",
                    "chart has no worksheet range references",
                    chart_path,
                )
                continue
            for reference in references:
                if "#REF!" in reference.upper():
                    issue(
                        issues,
                        "XLSX_CHART_REFERENCE_BROKEN",
                        "chart range contains #REF!",
                        f"{chart_path}:{reference}",
                    )
                    continue
                if "!" not in reference or reference.startswith("["):
                    continue
                sheet_name = reference.rsplit("!", 1)[0]
                if sheet_name.startswith("'") and sheet_name.endswith("'"):
                    sheet_name = sheet_name[1:-1].replace("''", "'")
                if sheet_name not in sheet_names:
                    issue(
                        issues,
                        "XLSX_CHART_SHEET_MISSING",
                        f"chart references unknown worksheet {sheet_name!r}",
                        chart_path,
                    )


def check_chart_caches(path: Path, cached: Any, issues: list[dict[str, Any]]) -> None:
    """Each series' cached points (numbers and text categories) must equal the cells they reference."""
    from openpyxl.utils.cell import range_boundaries
    from openpyxl.utils.datetime import to_excel

    with zipfile.ZipFile(path) as archive:
        chart_paths = sorted(n for n in archive.namelist() if n.startswith("xl/charts/chart") and n.endswith(".xml"))
        for chart_path in chart_paths:
            try:
                root = parse_xml(archive.read(chart_path))
            except Exception:
                continue
            for ref in (e for e in root.iter() if local_name(e.tag) in ("numRef", "strRef")):
                formula = next((str(e.text or "") for e in ref if local_name(e.tag) == "f"), "")
                cache = next((e for e in ref if local_name(e.tag) in ("numCache", "strCache")), None)
                location = f"{chart_path}:{formula}"
                try:
                    sheet_name, area = formula.rsplit("!", 1)
                    if sheet_name.startswith("'"):
                        sheet_name = sheet_name[1:-1].replace("''", "'")
                    c0, r0, c1, r1 = range_boundaries(area.replace("$", ""))
                    cells = [c.value for row in cached[sheet_name].iter_rows(r0, r1, c0, c1) for c in row]
                except Exception:
                    continue  # multi-area, defined-name or external reference
                expected = {i: (to_excel(v) if hasattr(v, "isoformat") else v) for i, v in enumerate(cells)
                            if v is not None and v != ""}
                points = {}
                if cache is not None:
                    for pt in cache:
                        if local_name(pt.tag) == "pt":
                            points[int(pt.attrib["idx"])] = next((e.text or "" for e in pt if local_name(e.tag) == "v"), "")
                if not points:
                    if expected:
                        issue(issues, "XLSX_CHART_CACHE_MISSING", "chart series has no cached points", location, "warning")
                    continue
                bad = []
                for i in sorted(set(points) | set(expected)):
                    want, got = expected.get(i), points.get(i)
                    if want is None or got is None:
                        bad.append((i, want, got))
                        continue
                    try:
                        same = math.isclose(float(want), float(got), rel_tol=1e-6, abs_tol=1e-9)
                    except (TypeError, ValueError):
                        same = str(want) == got
                    if not same:
                        bad.append((i, want, got))
                if bad:
                    issue(
                        issues,
                        "XLSX_CHART_CACHE_STALE",
                        f"chart cache differs from cells at {len(bad)} point(s) (index, cell, cache): {bad[:3]!r}",
                        location,
                    )


def check_navigation(workbook: Any, issues: list[dict[str, Any]]) -> None:
    if len(workbook.sheetnames) < 5:
        return
    first = workbook[workbook.sheetnames[0]]
    if first.title.strip().lower() not in {"index", "contents", "overview", "navigation", "dashboard", "الفهرس", "المحتويات", "نظرة عامة", "الملخص", "لوحة التحكم"}:
        issue(
            issues,
            "XLSX_NAVIGATION_SHEET",
            "workbooks with five or more sheets must begin with Index, Contents, Overview, Navigation or Dashboard (in Arabic: الفهرس, المحتويات, نظرة عامة, الملخص or لوحة التحكم)",
            first.title,
        )
    if not hasattr(first, "iter_rows"):
        issue(
            issues,
            "XLSX_NAVIGATION_LINKS",
            "the first navigation entry is not a worksheet with internal links",
            first.title,
        )
        return
    linked = False
    for row in first.iter_rows():
        for cell in row:
            hyperlink = cell.hyperlink
            if hyperlink and (
                str(getattr(hyperlink, "location", "") or "")
                or str(getattr(hyperlink, "target", "") or "").startswith("#")
            ):
                linked = True
                break
            if cell.data_type == "f" and str(cell.value).upper().startswith("=HYPERLINK("):
                linked = True
                break
        if linked:
            break
    if not linked:
        issue(
            issues,
            "XLSX_NAVIGATION_LINKS",
            "the first navigation sheet has no internal worksheet links",
            first.title,
        )


def validate(path: Path, contract_path: Path | None) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    checks: list[dict[str, Any]] = []
    if not path.is_file() or path.stat().st_size <= 0:
        issue(issues, "XLSX_ARTIFACT_MISSING", "artifact must be a non-empty regular file")
        return {"ok": False, "checks": checks, "issues": issues}

    package = check_package(path, issues)
    checks.append({"name": "package", "details": package})
    if any(row["severity"] == "error" for row in issues):
        return {"ok": False, "checks": checks, "issues": issues}

    try:
        from openpyxl import load_workbook
        from openpyxl.formula import Tokenizer
    except ImportError as error:
        issue(issues, "XLSX_RUNTIME_MISSING", f"openpyxl unavailable: {error}")
        return {"ok": False, "checks": checks, "issues": issues}

    try:
        workbook = load_workbook(path, read_only=False, data_only=False, keep_links=True)
        cached = load_workbook(path, read_only=False, data_only=True, keep_links=True)
    except Exception as error:
        issue(issues, "XLSX_OPEN_FAILED", str(error))
        return {"ok": False, "checks": checks, "issues": issues}

    formula_cells = 0
    missing_caches: list[str] = []
    cached_errors: list[str] = []
    sheet_names = list(workbook.sheetnames)
    for sheet in workbook.worksheets:
        cached_sheet = cached[sheet.title]
        for row in sheet.iter_rows():
            for cell in row:
                cached_value = cached_sheet[cell.coordinate].value
                if cell.data_type == "f":
                    formula_cells += 1
                    location = f"{sheet.title}!{cell.coordinate}"
                    formula = str(cell.value or "")
                    if not formula.startswith("=") or formula == "=":
                        issue(
                            issues,
                            "XLSX_FORMULA_INVALID",
                            f"invalid formula text: {formula!r}",
                            location,
                        )
                    else:
                        try:
                            Tokenizer(formula)
                        except Exception as error:
                            issue(
                                issues,
                                "XLSX_FORMULA_INVALID",
                                str(error),
                                location,
                            )
                    if "#REF!" in formula.upper():
                        issue(issues, "XLSX_BROKEN_FORMULA_REFERENCE", "formula contains #REF!", location)
                    if cached_value is None:
                        missing_caches.append(location)
                if cached_sheet[cell.coordinate].data_type == "e" or (
                    isinstance(cached_value, str)
                    and cached_value.upper() in ERROR_VALUES
                ):
                    cached_errors.append(f"{sheet.title}!{cell.coordinate}={cached_value}")

    contract = load_contract(path, contract_path, issues)
    require_caches = formula_cells > 0 and (
        bool(contract.get("requireFormulaCaches", True)) if contract else True
    )
    if require_caches:
        for location in missing_caches[:100]:
            issue(issues, "XLSX_FORMULA_CACHE_MISSING", "formula has no cached result", location)
    for value in cached_errors[:100]:
        issue(issues, "XLSX_CACHED_FORMULA_ERROR", "cached error value", value)
    if contract:
        minimum = int(contract.get("minimumFormulaCells", 0))
        if formula_cells < minimum:
            issue(
                issues,
                "XLSX_FORMULA_COUNT_CONTRACT",
                f"expected at least {minimum} formula cells, received {formula_cells}",
            )
        check_contract(workbook, cached, contract, issues)
    check_workbook_structures(workbook, issues)
    check_chart_references(path, sheet_names, issues)
    check_chart_caches(path, cached, issues)
    check_navigation(workbook, issues)

    checks.append(
        {
            "name": "workbook",
            "details": {
                "sheets": sheet_names,
                "formulaCells": formula_cells,
                "cachedValues": formula_cells - len(missing_caches),
                "missingCachedValues": len(missing_caches),
                "cachedErrors": len(cached_errors),
                "contract": str(contract_path or Path(str(path) + ".qa.json")) if contract else None,
            },
        }
    )
    workbook.close()
    cached.close()
    return {
        "ok": not any(row["severity"] == "error" for row in issues),
        "checks": checks,
        "issues": issues,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--contract", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = validate(args.artifact, args.contract)
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
