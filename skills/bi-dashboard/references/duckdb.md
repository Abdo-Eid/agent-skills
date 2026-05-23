# DuckDB Reference

Use the DuckDB Python client for schema discovery, compact profiling, reconciliation checks, and aggregation before writing `scaffold/data/dashboard-data.json`.

The fixed `scripts/ingest.py` helpers cover ingestion, column cleaning, and registration — use them instead of reimplementing those patterns here.

## Python Client Basics

```python
import duckdb

con = duckdb.connect()

# Register a pandas DataFrame as a virtual table
con.register("leads", df)

# Query it
result = con.execute("SELECT * FROM leads LIMIT 5").fetchdf()

# Query a CSV directly (no registration needed)
result = con.execute("SELECT * FROM 'data/input.csv' LIMIT 5").fetchdf()

# Query multiple CSVs as one table
result = con.execute("SELECT * FROM read_csv('data/*.csv', union_by_name=true)").fetchdf()
```

## Data Types

| DuckDB type | Use for |
|---|---|
| `INTEGER`, `BIGINT` | counts, IDs, whole numbers |
| `DOUBLE`, `DECIMAL(p,s)` | rates, amounts, percentages |
| `VARCHAR` | names, categories, status values |
| `DATE`, `TIMESTAMP` | dates and datetimes |
| `BOOLEAN` | flags |
| `LIST`, `STRUCT` | nested aggregates |

## Aggregation Patterns

### Counting with conditions
```sql
SELECT
    stage,
    COUNT(*)                                        AS total,
    COUNT(*) FILTER (WHERE status = 'won')          AS won,
    COUNT(*) FILTER (WHERE status = 'lost')         AS lost,
    COUNT(*) FILTER (WHERE is_stale = true)         AS stale
FROM leads
GROUP BY stage
ORDER BY total DESC
```

### Safe division (avoid divide-by-zero)
```sql
SELECT
    source,
    won * 100.0 / NULLIF(total, 0) AS win_rate
FROM stage_counts
```

### Latest record per group
```sql
-- Window function approach
WITH ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY updated_at DESC) AS rn
    FROM lead_history
)
SELECT * FROM ranked WHERE rn = 1
```

### Top N per group
```sql
WITH ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) AS rn
    FROM sales
)
SELECT * FROM ranked WHERE rn <= 5
```

### Finding duplicates
```sql
SELECT email, COUNT(*) AS count
FROM leads
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC
```

## Date and Time

```sql
-- Current date
WHERE close_date >= current_date

-- Relative ranges (prefer >= / < over BETWEEN)
WHERE created_at >= current_date - INTERVAL '30 days'
  AND created_at < current_date

-- Avoid BETWEEN for dates — it is inclusive on both ends
-- and can produce off-by-one errors on timestamps

-- Truncate to period
SELECT date_trunc('month', created_at) AS month, COUNT(*) AS count
FROM leads
GROUP BY month
ORDER BY month

-- Extract parts
SELECT
    date_part('year', created_at)  AS year,
    date_part('month', created_at) AS month
FROM leads

-- Format
SELECT strftime(created_at, '%Y-%m') AS period FROM leads

-- Staleness in days
SELECT
    lead_id,
    (current_date - last_activity_date::DATE) AS days_stale
FROM leads
WHERE last_activity_date IS NOT NULL
```

## String Operations

```sql
-- Concatenation
SELECT first_name || ' ' || last_name AS full_name FROM contacts

-- Case-insensitive match
WHERE LOWER(source) LIKE '%partner%'

-- Pattern match
WHERE email ILIKE '%@gmail.com'

-- Trim and normalize
SELECT TRIM(LOWER(source)) AS source_clean FROM leads
```

## Type Casting

```sql
-- Safe cast (returns NULL on failure instead of error)
SELECT TRY_CAST(revenue_str AS DOUBLE) AS revenue FROM raw

-- Explicit cast
SELECT CAST(created_at AS DATE) AS date FROM events

-- Shorthand
SELECT revenue_str::DOUBLE AS revenue FROM raw
```

## NULL Handling

```sql
-- Always use IS NULL / IS NOT NULL
WHERE closed_at IS NULL

-- Default value when NULL
SELECT COALESCE(owner_name, 'Unassigned') AS owner FROM leads

-- Exclude NULLs from aggregates (COUNT ignores NULLs by default)
SELECT AVG(deal_value) FROM leads WHERE deal_value IS NOT NULL
```

## Useful DuckDB Features

```sql
-- Exclude columns from SELECT *
SELECT * EXCLUDE (raw_json, internal_id) FROM leads

-- Random sample (useful for profiling large files)
SELECT * FROM leads USING SAMPLE 10%

-- Pivot (wide format for dashboard KPIs)
PIVOT leads ON stage USING COUNT(*) AS count

-- Unpivot (long format for chart series)
UNPIVOT metrics ON (q1, q2, q3, q4) INTO NAME quarter VALUE amount
```

## CSV and File Ingestion

```sql
-- Auto-detected (covers most cases)
SELECT * FROM 'data/input.csv' LIMIT 10

-- Explicit options when auto-detect fails
SELECT * FROM read_csv('data/input.csv',
    header=true,
    delim='\t',       -- tab-delimited
    skip=2,           -- skip header rows
    nullstr='NA'      -- treat 'NA' as NULL
)

-- Multiple CSVs with varying schemas
SELECT * FROM read_csv('data/*.csv', union_by_name=true)

-- Parquet
SELECT * FROM 'data/input.parquet' LIMIT 10
```

## Reconciliation Checks

Always verify aggregated totals match expectations before writing output JSON.

```python
total_rows = con.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
grouped_total = con.execute("SELECT SUM(count) FROM stage_counts").fetchone()[0]

if total_rows != grouped_total:
    raise ValueError(
        f"Reconciliation failed: row count {total_rows} != grouped total {grouped_total}"
    )
```

The fixed `scripts/ingest.py` provides `require_equal(a, b, label)` for this pattern.

## Schema Discovery (for profiling)

```python
# Column names and types
info = con.execute("DESCRIBE leads").fetchdf()

# Tables registered in session
tables = con.execute("SHOW TABLES").fetchdf()

# Null counts per column
for col in df.columns:
    null_count = con.execute(
        f"SELECT COUNT(*) FROM leads WHERE \"{col}\" IS NULL"
    ).fetchone()[0]

# Cardinality of categorical columns
card = con.execute(
    "SELECT COUNT(DISTINCT stage) AS n FROM leads"
).fetchone()[0]
```

## Friendly SQL Idioms

DuckDB supports a concise dialect. Use these in `aggregate.py` to keep queries readable.

### SUMMARIZE — instant statistical profile
```sql
-- One-liner: min, max, avg, std, nulls, distinct count for every column
SUMMARIZE input_data
```

In Python:
```python
print(con.execute("SUMMARIZE input_data").fetchdf().to_string())
```

Useful as a quick alternative to manual profiling in `scripts/profile.py` for
simple cases where the fixed profiler output is not needed.

### GROUP BY ALL
```sql
-- Auto-groups by all non-aggregate columns — no need to list them
SELECT stage, source, COUNT(*) AS total, SUM(revenue) AS revenue
FROM leads
GROUP BY ALL
```

### count() shorthand
```sql
-- DuckDB idiom — no need for count(*)
SELECT stage, count() AS total FROM leads GROUP BY stage
```

### SELECT * REPLACE
```sql
-- Transform a column in-place without rewriting the full SELECT
SELECT * REPLACE (ROUND(win_rate, 2) AS win_rate) FROM stage_metrics
```

### UNION ALL BY NAME
```sql
-- Combine tables with different column orders by matching names
SELECT * FROM this_month
UNION ALL BY NAME
SELECT * FROM last_month
```

### Dot chaining
```sql
-- Method-style chaining on strings
SELECT source.trim().lower() AS source_clean FROM leads
```

### Top-N as a list
```sql
-- max(col, n) returns the top N values as a list
SELECT stage, max(lead_value, 3) AS top_deals FROM leads GROUP BY stage
```

### FILTER clause (conditional aggregation)
```sql
-- Already in Aggregation Patterns above — also valid as a Friendly SQL idiom
SELECT
    count() FILTER (WHERE status = 'won')  AS won,
    count() FILTER (WHERE status = 'lost') AS lost
FROM leads
```
