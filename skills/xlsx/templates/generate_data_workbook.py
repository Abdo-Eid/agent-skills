#!/usr/bin/env python3
"""Starter generator for a traceable CSV cleaning and EDA workbook."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import xlsxwriter
from xlsxwriter.format import Format
from xlsxwriter.utility import xl_cell_to_rowcol, xl_col_to_name
from xlsxwriter.worksheet import Worksheet


# Add only source-documented, column-specific sentinels. Empty strings are handled separately.
MISSING_TOKENS_BY_COLUMN: dict[str, set[str]] = {}


def resolve_xlsx_skill_dir(argument: Path | None) -> Path:
    configured = argument or (
        Path(value) if (value := os.environ.get("AGENT_SKILLS_ROOT")) else None
    )
    if configured is None:
        raise RuntimeError("the host must pass --skills-root or set AGENT_SKILLS_ROOT")
    skill_dir = configured.resolve() / "xlsx"
    helper = skill_dir / "scripts" / "recalculate_workbook.py"
    if not helper.is_file():
        raise RuntimeError(f"XLSX recalculation helper is missing: {helper}")
    return skill_dir


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]], str]:
    raw_bytes = path.read_bytes()
    if not raw_bytes:
        raise ValueError(f"input CSV is empty: {path}")
    text = raw_bytes.decode("utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",\t;|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(text.splitlines(), dialect=dialect)
    headers = list(reader.fieldnames or [])
    if not headers or any(not header.strip() for header in headers):
        raise ValueError("input CSV needs a non-empty header for every column")
    if len(headers) != len(set(headers)):
        raise ValueError(f"input CSV headers must be unique: {headers!r}")
    rows = [{header: str(row.get(header) or "") for header in headers} for row in reader]
    if not rows:
        raise ValueError("input CSV needs at least one data row")
    return headers, rows, hashlib.sha256(raw_bytes).hexdigest()


def workbook_formats(workbook: xlsxwriter.Workbook) -> dict[str, Format]:
    border = {"border": 1, "border_color": "#D9E2EC"}
    return {
        "title": workbook.add_format(
            {"bold": True, "font_size": 20, "font_color": "#17324D", "bottom": 2}
        ),
        "subtitle": workbook.add_format({"font_color": "#526273", "italic": True}),
        "header": workbook.add_format(
            {
                "bold": True,
                "font_color": "#FFFFFF",
                "bg_color": "#17324D",
                "align": "center",
                "valign": "vcenter",
                **border,
            }
        ),
        "data": workbook.add_format({"valign": "top", **border}),
        "integer": workbook.add_format({"num_format": "#,##0", **border}),
        "formula": workbook.add_format({"font_color": "#000000", "valign": "top", **border}),
        "label": workbook.add_format({"bold": True, "font_color": "#273746"}),
        "note": workbook.add_format(
            {"font_color": "#526273", "font_size": 9, "text_wrap": True, "valign": "top"}
        ),
        "status": workbook.add_format({"bold": True, "font_color": "#17324D"}),
    }


def write_cell(sheet: Worksheet, address: str, value: object, cell_format: Format | None = None) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write(row, column, value, cell_format)


def write_number(sheet: Worksheet, address: str, value: float, cell_format: Format | None = None) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write_number(row, column, value, cell_format)


def write_formula(sheet: Worksheet, address: str, formula: str, cell_format: Format | None = None) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write_formula(row, column, formula, cell_format)


def configure_data_sheet(sheet: Worksheet, last_row: int, last_column: int) -> None:
    sheet.freeze_panes(1, 1)
    sheet.hide_gridlines(0)
    sheet.set_landscape()
    sheet.set_paper(9)
    sheet.fit_to_pages(1, 0)
    sheet.repeat_rows(0)
    sheet.set_margins(0.25, 0.25, 0.5, 0.5)
    sheet.print_area(0, 0, last_row, last_column)
    sheet.set_footer("&LTraceable data workbook&CPage &P of &N&R&D")


def excel_string(value: str) -> str:
    return value.replace('"', '""')


def clean_formula(source_cell: str, header: str) -> str:
    trimmed = f"TRIM('Raw Data'!{source_cell})"
    conditions = [f'{trimmed}=""']
    conditions.extend(
        f'{trimmed}="{excel_string(token)}"'
        for token in sorted(MISSING_TOKENS_BY_COLUMN.get(header, set()))
    )
    missing = conditions[0] if len(conditions) == 1 else f"OR({','.join(conditions)})"
    return f'=IF({missing},"",{trimmed})'


def is_declared_missing(value: str, header: str) -> bool:
    trimmed = value.strip()
    return not trimmed or trimmed in MISSING_TOKENS_BY_COLUMN.get(header, set())


def display_label(header: str) -> str:
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", header.replace("_", " "))
    return " ".join(spaced.split()).title()


def add_table(
    sheet: Worksheet,
    name: str,
    headers: list[str],
    data_rows: int,
) -> None:
    sheet.add_table(
        0,
        0,
        data_rows,
        len(headers) - 1,
        {
            "name": name,
            "style": "Table Style Light 9",
            "columns": [{"header": header} for header in headers],
        },
    )


def build_raw_workbook(
    raw_path: Path,
    input_path: Path,
    headers: list[str],
    rows: list[dict[str, str]],
    source_hash: str,
) -> int:
    workbook = xlsxwriter.Workbook(raw_path, {"constant_memory": False})
    style = workbook_formats(workbook)
    workbook.set_properties(
        {
            "title": "Traceable Data Cleaning and EDA Workbook",
            "comments": f"Source SHA-256: {source_hash}",
        }
    )

    overview = workbook.add_worksheet("Overview")
    raw = workbook.add_worksheet("Raw Data")
    cleaned = workbook.add_worksheet("Cleaned Data")
    profile = workbook.add_worksheet("Data Profile")

    overview.set_column(0, 0, 27)
    overview.set_column(1, 1, 72)
    write_cell(overview, "A1", "Data Workbook Overview", style["title"])
    write_cell(overview, "A2", "Adapt column-specific cleaning and analysis before delivery.", style["subtitle"])
    write_cell(overview, "A4", "Source file", style["label"])
    row, column = xl_cell_to_rowcol("B4")
    overview.write_string(row, column, input_path.name)
    write_cell(overview, "A5", "Source SHA-256", style["label"])
    write_cell(overview, "B5", source_hash)
    write_cell(overview, "A6", "Source rows", style["label"])
    write_number(overview, "B6", len(rows))
    write_cell(overview, "A7", "Cleaned rows", style["label"])
    write_formula(overview, "B7", "=COUNTA('Cleaned Data'!A:A)-1", style["status"])
    write_cell(overview, "A8", "Lineage check", style["label"])
    write_formula(
        overview,
        "B8",
        f'=IF(AND(COUNT(\'Cleaned Data\'!A2:A{len(rows) + 1})={len(rows)},'
        f"COUNT('Raw Data'!A2:A{len(rows) + 1})={len(rows)}),\"PASS\",\"CHECK\")",
        style["status"],
    )
    write_cell(overview, "A10", "Cleaning contract", style["label"])
    write_cell(
        overview,
        "B10",
        "Raw Data preserves source text. Cleaned Data trims surrounding whitespace and applies "
        "only the column-specific sentinels declared in MISSING_TOKENS_BY_COLUMN. Adapt numeric, "
        "date, category, and unit rules to the source semantics; preserve Source Row lineage.",
        style["note"],
    )
    overview.set_row(9, 58)
    overview.hide_gridlines(0)
    overview.set_portrait()
    overview.fit_to_pages(1, 1)
    overview.print_area(0, 0, 9, 1)
    formula_count = 2

    table_headers = ["Source Row", *headers]
    for column, header in enumerate(table_headers):
        raw.write(0, column, header, style["header"])
        cleaned.write(0, column, header, style["header"])
    for row_index, source in enumerate(rows, start=1):
        raw.write_number(row_index, 0, row_index + 1, style["integer"])
        cleaned.write_formula(
            row_index,
            0,
            f"='Raw Data'!A{row_index + 1}",
            style["integer"],
        )
        formula_count += 1
        for column_index, header in enumerate(headers, start=1):
            if source[header] == "":
                raw.write_blank(row_index, column_index, None, style["data"])
            else:
                raw.write_string(row_index, column_index, source[header], style["data"])
            if is_declared_missing(source[header], header):
                cleaned.write_blank(row_index, column_index, None, style["formula"])
                continue
            source_cell = f"{xl_col_to_name(column_index)}{row_index + 1}"
            cleaned.write_formula(
                row_index,
                column_index,
                clean_formula(source_cell, header),
                style["formula"],
            )
            formula_count += 1
    add_table(raw, "RawDataTable", table_headers, len(rows))
    add_table(cleaned, "CleanedDataTable", table_headers, len(rows))
    raw.set_column(0, 0, 12)
    cleaned.set_column(0, 0, 12)
    raw.set_column(1, len(headers), 18)
    cleaned.set_column(1, len(headers), 18)
    configure_data_sheet(raw, len(rows), len(headers))
    configure_data_sheet(cleaned, len(rows), len(headers))

    profile.set_column(0, 0, 24)
    profile.set_column(1, 1, 28)
    profile.set_column(2, 2, 42)
    profile.set_column(3, 5, 16)
    profile_headers = [
        "Source Header",
        "Display Label",
        "Definition / Unit",
        "Source Count",
        "Blank Count",
        "Distinct Source Values",
    ]
    profile.write_row(0, 0, profile_headers, style["header"])
    for row_index, header in enumerate(headers, start=1):
        source_column = xl_col_to_name(row_index)
        source_range = f"'Raw Data'!{source_column}2:{source_column}{len(rows) + 1}"
        profile.write(row_index, 0, header, style["data"])
        profile.write(row_index, 1, display_label(header), style["data"])
        profile.write(
            row_index,
            2,
            "Adapt: describe the source meaning, unit, cleaning rule, and caveat.",
            style["data"],
        )
        profile.write_formula(row_index, 3, f"=COUNTA({source_range})", style["integer"])
        profile.write_formula(row_index, 4, f'=COUNTIF({source_range},"")', style["integer"])
        escaped_values = (
            f'SUBSTITUTE(SUBSTITUTE(SUBSTITUTE({source_range},"~","~~"),'
            f'"*","~*"),"?","~?")'
        )
        profile.write_formula(
            row_index,
            5,
            f'=SUMPRODUCT(({source_range}<>"")/'
            f'COUNTIF({source_range},"="&{escaped_values}))',
            style["integer"],
        )
        formula_count += 3
    add_table(profile, "DataProfileTable", profile_headers, len(headers))
    profile.freeze_panes(1, 0)
    profile.hide_gridlines(0)
    profile.set_portrait()
    profile.fit_to_pages(1, 0)
    profile.repeat_rows(0)
    profile.print_area(0, 0, len(headers), 5)

    workbook.close()
    if not raw_path.is_file() or raw_path.stat().st_size <= 0:
        raise RuntimeError(f"expected non-empty raw workbook, received {raw_path}")
    return formula_count


def write_contract(
    output_path: Path,
    headers: list[str],
    row_count: int,
    formula_count: int,
) -> None:
    last_row = row_count + 1
    last_column = xl_col_to_name(len(headers))
    contract = {
        "schemaVersion": 1,
        "exactSheets": ["Overview", "Raw Data", "Cleaned Data", "Data Profile"],
        "minimumFormulaCells": formula_count,
        "requireFormulaCaches": True,
        "expectedValues": [
            {"cell": "Overview!B6", "value": row_count},
            {"cell": "Overview!B7", "value": row_count},
            {"cell": "Overview!B8", "value": "PASS"},
        ],
        "requiredTables": [
            {"sheet": "Raw Data", "name": "RawDataTable", "ref": f"A1:{last_column}{last_row}", "dataRows": row_count},
            {"sheet": "Cleaned Data", "name": "CleanedDataTable", "ref": f"A1:{last_column}{last_row}", "dataRows": row_count},
            {"sheet": "Data Profile", "name": "DataProfileTable", "dataRows": len(headers)},
        ],
        "keyRelations": [
            {
                "subsetRange": f"Cleaned Data!A2:A{last_row}",
                "supersetRange": f"Raw Data!A2:A{last_row}",
                "requireUnique": True,
            }
        ],
        "sheetViews": [
            {"sheet": "Raw Data", "showGridLines": True, "allowHiddenRows": False, "allowHiddenColumns": False},
            {"sheet": "Cleaned Data", "showGridLines": True, "allowHiddenRows": False, "allowHiddenColumns": False},
        ],
        "borderRanges": [
            {"range": f"Raw Data!A2:{last_column}{last_row}", "style": "thin"},
            {"range": f"Cleaned Data!A2:{last_column}{last_row}", "style": "thin"},
        ],
        "freezePanes": [
            {"sheet": "Raw Data", "cell": "B2"},
            {"sheet": "Cleaned Data", "cell": "B2"},
        ],
        "printSettings": [
            {"sheet": "Raw Data", "orientation": "landscape", "fitToWidth": 1, "requirePrintArea": True},
            {"sheet": "Cleaned Data", "orientation": "landscape", "fitToWidth": 1, "requirePrintArea": True},
        ],
    }
    Path(str(output_path) + ".qa.json").write_text(
        json.dumps(contract, indent=2), encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--skills-root", type=Path)
    args = parser.parse_args()

    input_path = args.input.resolve()
    output_path = args.output.resolve()
    if input_path.suffix.lower() != ".csv":
        raise ValueError("--input must end in .csv")
    if output_path.suffix.lower() != ".xlsx":
        raise ValueError("--output must end in .xlsx")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_path.with_name(f".{output_path.stem}.raw.xlsx")

    headers, rows, source_hash = read_csv(input_path)
    formula_count = build_raw_workbook(raw_path, input_path, headers, rows, source_hash)
    recalculate = resolve_xlsx_skill_dir(args.skills_root) / "scripts" / "recalculate_workbook.py"
    result = subprocess.run(
        [sys.executable, str(recalculate), str(raw_path), str(output_path)],
        check=False,
        text=True,
        capture_output=True,
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(f"recalculation failed: {(result.stdout + result.stderr).strip()[:1500]}")
    if not output_path.is_file() or output_path.stat().st_size <= 0:
        raise RuntimeError(f"expected non-empty final workbook, received {output_path}")
    try:
        recalc_report = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("recalculation returned malformed JSON") from error
    if not recalc_report.get("ok") or not recalc_report.get("bytesChanged"):
        raise RuntimeError(f"recalculation postconditions failed: {recalc_report}")
    write_contract(output_path, headers, len(rows), formula_count)
    contract_path = Path(str(output_path) + ".qa.json")
    if not contract_path.is_file() or contract_path.stat().st_size <= 0:
        raise RuntimeError(f"expected non-empty QA contract, received {contract_path}")
    raw_path.unlink(missing_ok=True)
    print(
        json.dumps(
            {
                "ok": True,
                "artifact": str(output_path),
                "qaContract": str(contract_path),
                "sourceSha256": source_hash,
                "rows": len(rows),
                "columns": len(headers),
                "recalculation": recalc_report,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
