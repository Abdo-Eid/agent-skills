#!/usr/bin/env python3
"""Starter generator for a formula-driven, recalculated XLSX workbook."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import xlsxwriter
from xlsxwriter.format import Format
from xlsxwriter.utility import xl_cell_to_rowcol, xl_col_to_name
from xlsxwriter.worksheet import Worksheet


def resolve_xlsx_skill_dir(argument: Path | None) -> Path:
    configured = argument or (
        Path(value) if (value := os.environ.get("AGENT_SKILLS_ROOT")) else None
    )
    if configured is None:
        raise RuntimeError(
            "the host must pass --skills-root or set AGENT_SKILLS_ROOT"
        )
    skill_dir = configured.resolve() / "xlsx"
    helper = skill_dir / "scripts" / "recalculate_workbook.py"
    if not helper.is_file():
        raise RuntimeError(
            f"XLSX recalculation helper is missing under skills root: {helper}"
        )
    return skill_dir


def formats(workbook: xlsxwriter.Workbook) -> dict[str, Format]:
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
            }
        ),
        "label": workbook.add_format({"font_color": "#273746"}),
        "input_currency": workbook.add_format(
            {"font_color": "#0000FF", "num_format": '$#,##0.00;($#,##0.00);-""'}
        ),
        "input_percentage": workbook.add_format(
            {"font_color": "#0000FF", "num_format": "0.0%"}
        ),
        "formula_currency": workbook.add_format(
            {"font_color": "#000000", "num_format": '$#,##0.00;($#,##0.00);-""'}
        ),
        "cross_sheet_currency": workbook.add_format(
            {"font_color": "#008000", "num_format": '$#,##0.00;($#,##0.00);-""'}
        ),
        "formula_percentage": workbook.add_format(
            {"font_color": "#000000", "num_format": "0.0%"}
        ),
        "total_currency": workbook.add_format(
            {
                "bold": True,
                "top": 1,
                "font_color": "#000000",
                "num_format": '$#,##0.00;($#,##0.00);-""',
            }
        ),
        "note": workbook.add_format(
            {"font_color": "#6B7785", "font_size": 9, "text_wrap": True, "valign": "top"}
        ),
    }


def write_cell(sheet: Worksheet, address: str, value: Any, cell_format: Format | None = None) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write(row, column, value, cell_format)


def write_number(sheet: Worksheet, address: str, value: float, cell_format: Format) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write_number(row, column, value, cell_format)


def write_formula(sheet: Worksheet, address: str, formula: str, cell_format: Format) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write_formula(row, column, formula, cell_format)


def write_row(sheet: Worksheet, address: str, values: list[str], cell_format: Format) -> None:
    row, column = xl_cell_to_rowcol(address)
    sheet.write_row(row, column, values, cell_format)


def configure_sheet(
    sheet: Worksheet,
    print_area: tuple[int, int, int, int],
    landscape: bool,
) -> None:
    if landscape:
        sheet.set_landscape()
    else:
        sheet.set_portrait()
    sheet.set_paper(9)
    sheet.fit_to_pages(1, 1)
    sheet.set_margins(0.3, 0.3, 0.5, 0.5)
    sheet.print_area(*print_area)
    sheet.hide_gridlines(0)
    sheet.set_footer("&LGenerated workbook&CPage &P of &N&R&D")


def build_raw_workbook(raw_path: Path) -> None:
    workbook = xlsxwriter.Workbook(raw_path)
    style = formats(workbook)
    workbook.set_properties(
        {
            "title": "Example Formula-Driven Workbook",
            "company": "Zynda.ai",
            "created": datetime.now(UTC).replace(tzinfo=None),
        }
    )

    assumptions = workbook.add_worksheet("Assumptions")
    forecast = workbook.add_worksheet("Forecast")
    summary = workbook.add_worksheet("Executive Summary")

    assumptions.set_column(0, 0, 28)
    assumptions.set_column(1, 1, 18)
    assumptions.set_column(2, 2, 38)
    write_cell(assumptions, "A1", "Example Model Assumptions", style["title"])
    write_row(assumptions, "A3", ["Assumption", "Value", "Explanation"], style["header"])
    write_cell(assumptions, "A4", "Opening annual value", style["label"])
    write_number(assumptions, "B4", 1_000_000, style["input_currency"])
    write_cell(assumptions, "C4", "Input: starting annual recurring value", style["note"])
    write_cell(assumptions, "A5", "Monthly addition", style["label"])
    write_number(assumptions, "B5", 25_000, style["input_currency"])
    write_cell(assumptions, "C5", "Input: new value added each month", style["note"])
    write_cell(assumptions, "A6", "Monthly expansion", style["label"])
    write_number(assumptions, "B6", 0.012, style["input_percentage"])
    write_cell(assumptions, "C6", "Input: expansion applied to opening value", style["note"])
    write_cell(assumptions, "A7", "Monthly churn", style["label"])
    write_number(assumptions, "B7", 0.005, style["input_percentage"])
    write_cell(assumptions, "C7", "Input: churn applied to opening value", style["note"])
    assumptions.freeze_panes(3, 0)
    configure_sheet(assumptions, (0, 0, 7, 2), landscape=False)

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    forecast.set_column(0, 0, 27)
    forecast.set_column(1, 12, 13)
    write_cell(forecast, "A1", "Example Monthly Forecast", style["title"])
    write_row(forecast, "A2", ["Metric", *months], style["header"])
    rows = {
        "opening": 2,
        "addition": 3,
        "expansion": 4,
        "churn": 5,
        "closing": 6,
        "monthly": 7,
    }
    labels = [
        "Opening annual value",
        "Monthly addition",
        "Expansion",
        "Churn",
        "Closing annual value",
        "Monthly recurring value",
    ]
    for offset, label in enumerate(labels, start=2):
        forecast.write(offset, 0, label, style["label"])
    for column in range(1, 13):
        excel_column = xl_col_to_name(column)
        previous = xl_col_to_name(column - 1)
        opening = "=Assumptions!$B$4" if column == 1 else f"={previous}7"
        forecast.write_formula(rows["opening"], column, opening, style["cross_sheet_currency"])
        forecast.write_formula(rows["addition"], column, "=Assumptions!$B$5", style["cross_sheet_currency"])
        forecast.write_formula(
            rows["expansion"],
            column,
            f"={excel_column}3*Assumptions!$B$6",
            style["formula_currency"],
        )
        forecast.write_formula(
            rows["churn"],
            column,
            f"={excel_column}3*Assumptions!$B$7",
            style["formula_currency"],
        )
        forecast.write_formula(
            rows["closing"],
            column,
            f"={excel_column}3+{excel_column}4+{excel_column}5-{excel_column}6",
            style["total_currency"],
        )
        forecast.write_formula(
            rows["monthly"],
            column,
            f"={excel_column}7/12",
            style["formula_currency"],
        )
    forecast.freeze_panes(2, 1)
    configure_sheet(forecast, (0, 0, 7, 12), landscape=True)

    summary.set_column(0, 0, 28)
    summary.set_column(1, 1, 18)
    summary.set_column(3, 10, 12)
    write_cell(summary, "A1", "Executive Summary", style["title"])
    write_cell(summary, "A2", "Formula-driven outputs; blue cells are inputs in Assumptions.", style["subtitle"])
    write_row(summary, "A4", ["Metric", "Value"], style["header"])
    write_cell(summary, "A5", "December closing annual value", style["label"])
    write_formula(summary, "B5", "=Forecast!M7", style["cross_sheet_currency"])
    write_cell(summary, "A6", "Full-year additions", style["label"])
    write_formula(summary, "B6", "=SUM(Forecast!B4:M4)", style["cross_sheet_currency"])
    write_cell(summary, "A7", "December monthly recurring value", style["label"])
    write_formula(summary, "B7", "=Forecast!M8", style["cross_sheet_currency"])

    chart = workbook.add_chart({"type": "line"})
    if chart is None:
        raise RuntimeError("XlsxWriter did not create the requested chart")
    chart.add_series(
        {
            "name": "=Forecast!$A$7",
            "categories": "=Forecast!$B$2:$M$2",
            "values": "=Forecast!$B$7:$M$7",
            "line": {"color": "#245B8A", "width": 2.25},
            "marker": {"type": "circle", "size": 5},
        }
    )
    chart.add_series(
        {
            "name": "=Forecast!$A$8",
            "categories": "=Forecast!$B$2:$M$2",
            "values": "=Forecast!$B$8:$M$8",
            "y2_axis": True,
            "line": {"color": "#C65D38", "width": 2.25},
            "marker": {"type": "diamond", "size": 5},
        }
    )
    chart.set_title({"name": "Closing Annual Value and Monthly Run Rate"})
    chart.set_x_axis({"name": "Month"})
    chart.set_y_axis({"name": "Annual value", "num_format": "$#,##0"})
    chart.set_y2_axis({"name": "Monthly value", "num_format": "$#,##0"})
    chart.set_legend({"position": "bottom"})
    summary.insert_chart(3, 3, chart, {"x_scale": 1.35, "y_scale": 1.2})
    configure_sheet(summary, (0, 0, 19, 10), landscape=True)

    workbook.close()
    if not raw_path.is_file() or raw_path.stat().st_size <= 0:
        raise RuntimeError(f"expected non-empty raw workbook, received {raw_path}")


def write_contract(output_path: Path) -> None:
    contract = {
        "schemaVersion": 1,
        "exactSheets": ["Assumptions", "Forecast", "Executive Summary"],
        "minimumFormulaCells": 75,
        "requireFormulaCaches": True,
        "requiredFormulas": [
            {"cell": "Executive Summary!B5", "formula": "=Forecast!M7"},
            {"cell": "Executive Summary!B6", "formula": "=SUM(Forecast!B4:M4)"},
        ],
        "expectedValues": [
            {
                "cell": "Executive Summary!B5",
                "value": 1_399_134.4544708885,
                "tolerance": 0.01,
            },
            {
                "cell": "Executive Summary!B6",
                "value": 300_000.0,
                "tolerance": 0.01,
            },
            {
                "cell": "Executive Summary!B7",
                "value": 116_594.53787257404,
                "tolerance": 0.01,
            },
        ],
        "rangeValues": [
            {
                "range": "Forecast!B2:M2",
                "values": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            }
        ],
        "requiredCharts": [
            {"sheet": "Executive Summary", "minimum": 1, "minimumSeries": 2}
        ],
        "freezePanes": [
            {"sheet": "Assumptions", "cell": "A4"},
            {"sheet": "Forecast", "cell": "B3"},
        ],
        "printSettings": [
            {
                "sheet": "Forecast",
                "orientation": "landscape",
                "fitToWidth": 1,
                "requirePrintArea": True,
            },
            {
                "sheet": "Executive Summary",
                "orientation": "landscape",
                "fitToWidth": 1,
                "requirePrintArea": True,
            },
        ],
    }
    Path(str(output_path) + ".qa.json").write_text(json.dumps(contract, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--skills-root",
        type=Path,
        help="Directory containing all installed skills; defaults to AGENT_SKILLS_ROOT.",
    )
    args = parser.parse_args()
    output_path = args.output.resolve()
    if output_path.suffix.lower() != ".xlsx":
        raise ValueError("--output must end in .xlsx")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_path.with_name(f".{output_path.stem}.raw.xlsx")

    build_raw_workbook(raw_path)
    skill_dir = resolve_xlsx_skill_dir(args.skills_root)
    recalculate = skill_dir / "scripts" / "recalculate_workbook.py"
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
    write_contract(output_path)
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
                "recalculation": recalc_report,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
