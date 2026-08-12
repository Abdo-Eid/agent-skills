"""
Compact planning profiler for BI dashboard input files.

Prints row count, column list, date ranges, notable nulls, and top categorical
values — facts only, no interpretation.

Quick alternative: DuckDB's built-in SUMMARIZE produces a one-liner statistical
profile per column (min, max, avg, std, nulls, distinct count) and can
supplement or replace manual profiling for simple cases:

    import duckdb
    con = duckdb.connect()
    con.register("input_data", df)
    print(con.execute("SUMMARIZE input_data").fetchdf().to_string())
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

import duckdb

from ingest import load_input_dataframe, records, register_dataframe, scalar_int


def compact_list(values: list[str], limit: int = 12) -> str:
    shown = values[:limit]
    suffix = f", +{len(values) - limit} more" if len(values) > limit else ""
    return ", ".join(shown) + suffix


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def likely_date_columns(columns: list[str]) -> list[str]:
    hints = ("date", "time", "created", "updated", "closed", "month", "year")
    return [column for column in columns if any(hint in column.lower() for hint in hints)]


def categorical_columns(conn: duckdb.DuckDBPyConnection, columns: list[str], row_count: int) -> list[str]:
    candidates: list[str] = []
    for column in columns:
        ident = quote_ident(column)
        distinct_count = scalar_int(
            conn,
            f"SELECT count(DISTINCT {ident}) FROM input_data WHERE {ident} IS NOT NULL",
        )
        if 1 < distinct_count <= min(25, max(8, row_count // 20)):
            candidates.append(column)
    return candidates[:6]


def top_values(conn: duckdb.DuckDBPyConnection, column: str, limit: int = 6) -> list[dict]:
    ident = quote_ident(column)
    return records(
        conn,
        f"""
        SELECT CAST({ident} AS VARCHAR) AS value, count(*) AS count
        FROM input_data
        WHERE {ident} IS NOT NULL
        GROUP BY 1
        ORDER BY count DESC, value
        LIMIT {limit}
        """,
    )


def null_rates(conn: duckdb.DuckDBPyConnection, columns: list[str], row_count: int) -> list[dict]:
    output: list[dict] = []
    for column in columns:
        missing = scalar_int(conn, f"SELECT count(*) FROM input_data WHERE {quote_ident(column)} IS NULL")
        if missing:
            output.append({"column": column, "missing": missing, "rate": missing / row_count})
    return sorted(output, key=lambda item: item["missing"], reverse=True)[:8]


def date_ranges(conn: duckdb.DuckDBPyConnection, columns: list[str]) -> list[dict]:
    ranges: list[dict] = []
    for column in likely_date_columns(columns)[:5]:
        ident = quote_ident(column)
        try:
            result = records(
                conn,
                f"""
                SELECT
                  min(try_cast({ident} AS TIMESTAMP)) AS min_value,
                  max(try_cast({ident} AS TIMESTAMP)) AS max_value
                FROM input_data
                WHERE try_cast({ident} AS TIMESTAMP) IS NOT NULL
                """,
            )[0]
        except Exception:
            continue
        if result.get("min_value") is not None and result.get("max_value") is not None:
            ranges.append({"column": column, "min": str(result["min_value"]), "max": str(result["max_value"])})
    return ranges


def profile(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    conn = duckdb.connect()
    df = load_input_dataframe(path)
    if df.empty:
        raise ValueError(f"Input file has no usable rows: {path}")

    register_dataframe(conn, df)
    columns = list(df.columns)
    row_count = scalar_int(conn, "SELECT count(*) FROM input_data")

    lines = [
        f"Profile: {path.name}",
        f"Rows: {row_count:,}",
        f"Columns ({len(columns)}): {', '.join(columns)}",
    ]

    for item in date_ranges(conn, columns):
        lines.append(f"Date range {item['column']}: {item['min']} -> {item['max']}")

    nulls = null_rates(conn, columns, row_count)
    if nulls:
        formatted = [f"{item['column']} {item['missing']:,} ({item['rate']:.0%})" for item in nulls]
        lines.append(f"Notable nulls: {compact_list(formatted, 8)}")

    for column in categorical_columns(conn, columns, row_count):
        formatted = [f"{row['value']} {row['count']:,}" for row in top_values(conn, column)]
        lines.append(f"Top {column}: {compact_list(formatted, 6)}")

    lines.append("Use these facts to choose the dashboard story, KPIs, chart set, insights, and actions before writing final code.")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Print a compact planning profile for a BI dashboard input file.")
    parser.add_argument("input", help="CSV or XLSX file to profile")
    args = parser.parse_args()
    sys.stdout.write(profile(Path(args.input).expanduser().resolve()) + "\n")


if __name__ == "__main__":
    main()
