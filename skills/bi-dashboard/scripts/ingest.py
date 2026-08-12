import hashlib
import json
import re
from pathlib import Path

import duckdb
import pandas as pd


SUPPORTED_INPUTS = {".csv", ".xlsx"}


def file_hash(path: Path, algorithm: str = "sha256") -> str:
    digest = hashlib.new(algorithm)
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_column_names(columns) -> list[str]:
    cleaned: list[str] = []
    seen: dict[str, int] = {}

    for index, column in enumerate(columns, start=1):
        raw = "" if column is None else str(column).strip()
        name = raw.lower()
        name = re.sub(r"[^0-9a-zA-Z_]+", "_", name)
        name = re.sub(r"_+", "_", name).strip("_")
        if not name or name == "nan":
            name = f"column_{index}"
        if name[0].isdigit():
            name = f"col_{name}"

        count = seen.get(name, 0) + 1
        seen[name] = count
        cleaned.append(name if count == 1 else f"{name}_{count}")

    return cleaned


def compact_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(axis=0, how="all").dropna(axis=1, how="all")
    df = df.reset_index(drop=True)
    df.columns = clean_column_names(df.columns)
    return df


def likely_header_row(raw: pd.DataFrame, max_rows: int = 10) -> int:
    sample = raw.head(max_rows)
    best_index = 0
    best_score = -1

    for row_index, row in sample.iterrows():
        values = [str(value).strip() for value in row.tolist() if pd.notna(value)]
        non_empty = [value for value in values if value and value.lower() != "nan"]
        alpha_cells = sum(bool(re.search(r"[A-Za-z]", value)) for value in non_empty)
        unique_cells = len(set(value.lower() for value in non_empty))
        score = len(non_empty) * 3 + alpha_cells + unique_cells
        if score > best_score:
            best_score = score
            best_index = int(row_index)

    return best_index


def read_csv_with_header_detection(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path, header=None, dtype=object, nrows=25)
    header = likely_header_row(raw)
    df = pd.read_csv(path, header=header, dtype=object)
    return compact_dataframe(df)


def read_excel_first_sheet(path: Path) -> pd.DataFrame:
    workbook = pd.ExcelFile(path)
    if not workbook.sheet_names:
        raise ValueError(f"No sheets found in {path.name}")

    raw = pd.read_excel(
        workbook,
        sheet_name=workbook.sheet_names[0],
        header=None,
        dtype=object,
        nrows=25,
    )
    header = likely_header_row(raw)
    df = pd.read_excel(
        workbook,
        sheet_name=workbook.sheet_names[0],
        header=header,
        dtype=object,
    )
    return compact_dataframe(df)


def load_input_dataframe(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_INPUTS:
        supported = ", ".join(sorted(SUPPORTED_INPUTS))
        raise ValueError(f"Unsupported input type {suffix!r}. Supported: {supported}")

    if suffix == ".csv":
        return read_csv_with_header_detection(path)
    return read_excel_first_sheet(path)


def register_dataframe(
    conn: duckdb.DuckDBPyConnection,
    df: pd.DataFrame,
    table_name: str = "input_data",
) -> None:
    conn.register("_input_df", df)
    conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM _input_df")
    conn.unregister("_input_df")


def q(conn: duckdb.DuckDBPyConnection, sql: str):
    return conn.sql(sql).df()


def records(conn: duckdb.DuckDBPyConnection, sql: str) -> list[dict]:
    return q(conn, sql).to_dict(orient="records")


def scalar_int(conn: duckdb.DuckDBPyConnection, sql: str) -> int:
    return int(q(conn, sql).iloc[0, 0])


def require_equal(label: str, actual: int, expected: int) -> None:
    if actual != expected:
        raise ValueError(f"{label} mismatch: expected {expected}, got {actual}")


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    json.loads(text)
    path.write_text(text, encoding="utf-8")
