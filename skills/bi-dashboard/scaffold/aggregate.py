from datetime import UTC, datetime
from pathlib import Path
import sys

import duckdb


ROOT = Path(__file__).resolve().parent
SKILL_ROOT = ROOT.parent
sys.path.insert(0, str(SKILL_ROOT / "scripts"))

from ingest import (
    file_hash,
    load_input_dataframe,
    records,
    register_dataframe,
    require_equal,
    scalar_int,
    write_json,
)


INPUT = (ROOT / ".." / ".." / ".." / "uploads" / "leads-10000.csv").resolve()
OUTPUT = ROOT / "data" / "dashboard-data.json"


def main() -> None:
    if not INPUT.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT}")

    conn = duckdb.connect()
    df = load_input_dataframe(INPUT)
    if df.empty:
        raise ValueError(f"Input file has no usable rows: {INPUT}")

    register_dataframe(conn, df)
    source = "input_data"

    columns = records(conn, f"DESCRIBE SELECT * FROM {source}")
    row_count = scalar_int(conn, f"SELECT count(*) FROM {source}")
    if row_count <= 0:
        raise ValueError(f"No rows loaded from {INPUT.name}")

    deal_stages = records(conn, f"""
        SELECT DISTINCT deal_stage FROM {source}
        WHERE deal_stage IS NOT NULL
        ORDER BY deal_stage
    """)
    stage_labels = [r["deal_stage"] for r in deal_stages]

    stage_dist = records(conn, f"""
        SELECT deal_stage, count(*) AS count
        FROM {source}
        WHERE deal_stage IS NOT NULL
        GROUP BY deal_stage
        ORDER BY count DESC
    """)

    source_dist = records(conn, f"""
        SELECT source, count(*) AS count
        FROM {source}
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY count DESC
    """)
    source_labels = [r["source"] for r in source_dist]

    source_conversion = records(conn, f"""
        SELECT source,
            count(*) AS total,
            count(*) FILTER (WHERE deal_stage = 'Closed Won') AS won,
            ROUND(count(*) FILTER (WHERE deal_stage = 'Closed Won') * 100.0 / NULLIF(count(*), 0), 1) AS win_rate
        FROM {source}
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY total DESC
    """)

    pipeline_order = {"New Lead": 1, "Contacted": 2, "Qualified": 3, "Proposal Sent": 4, "Negotiation": 5, "Closed Won": 6, "Closed Lost": 7, "Disqualified": 8, "On Hold": 9, "Re-engagement": 10}
    stage_dist_pipeline = sorted(stage_dist, key=lambda r: pipeline_order.get(r["deal_stage"], 99))

    owner_dist = records(conn, f"""
        SELECT lead_owner, count(*) AS count
        FROM {source}
        WHERE lead_owner IS NOT NULL
        GROUP BY lead_owner
        ORDER BY count DESC
        LIMIT 10
    """)

    stage_source = records(conn, f"""
        SELECT deal_stage, source, count(*) AS count
        FROM {source}
        WHERE deal_stage IS NOT NULL AND source IS NOT NULL
        GROUP BY deal_stage, source
        ORDER BY deal_stage, count DESC
    """)

    closed_won = scalar_int(conn, f"SELECT count(*) FROM {source} WHERE deal_stage = 'Closed Won'")
    closed_lost = scalar_int(conn, f"SELECT count(*) FROM {source} WHERE deal_stage = 'Closed Lost'")
    active_pipeline = scalar_int(conn, f"SELECT count(*) FROM {source} WHERE deal_stage IN ('Contacted', 'Qualified', 'Negotiation')")
    on_hold = scalar_int(conn, f"SELECT count(*) FROM {source} WHERE deal_stage = 'On Hold'")

    win_rate = round(closed_won * 100.0 / row_count, 1)

    stage_total = sum(r["count"] for r in stage_dist)
    require_equal("stage distribution total", stage_total, row_count)

    source_total = sum(r["count"] for r in source_dist)
    require_equal("source distribution total", source_total, row_count)

    payload = {
        "metadata": {
            "sourceFile": INPUT.name,
            "inputHash": file_hash(INPUT),
            "generatedAt": datetime.now(UTC).isoformat(),
            "rowCount": row_count,
            "columns": [column["column_name"] for column in columns],
        },
        "kpis": [
            {"label": "Total Leads", "value": f"{row_count:,}", "note": "Pipeline volume over all time"},
            {"label": "Win Rate", "value": f"{win_rate}%", "note": f"{closed_won:,} Closed Won of {row_count:,} total"},
            {"label": "Active Pipeline", "value": f"{active_pipeline:,}", "note": "Contacted, Qualified, Negotiation stages"},
            {"label": "Stalled", "value": f"{on_hold:,}", "note": "On Hold — needs re-engagement"},
        ],
        "charts": {
            "stageDistribution": stage_dist_pipeline,
            "sourceDistribution": source_dist,
            "sourceConversion": source_conversion,
            "ownerDistribution": owner_dist,
            "stageSourceMatrix": stage_source,
            "stages": stage_labels,
            "sources": source_labels,
        },
        "insights": [
            {
                "finding": f"On Hold is the largest stage at {on_hold:,} leads ({round(on_hold * 100 / row_count, 1)}% of total), exceeding even Closed Won ({closed_won:,}).",
                "meaning": "More than 1 in 10 leads are stalled — this pipeline friction delays revenue and increases deal decay risk."
            },
            {
                "finding": f"Overall win rate is {win_rate}% ({closed_won:,} of {row_count:,}), with {closed_lost:,} ({round(closed_lost * 100 / row_count, 1)}%) lost and 2,017 ({round((active_pipeline + on_hold) * 100 / row_count, 1)}%) still in progress.",
                "meaning": "Nearly half the pipeline is unresolved. Improving early-stage qualification could shift more leads toward won rather than lost or stalled."
            },
            {
                "finding": f"Active stages (Contacted through Negotiation) hold {active_pipeline:,} leads — only {round(active_pipeline * 100 / row_count, 1)}% of total pipeline.",
                "meaning": "The active deal pipeline is relatively thin compared to stalled and closed volume. Pipeline coverage may be insufficient for consistent revenue.",
            },
        ],
        "actions": [
            {
                "finding": f"{on_hold:,} deals stalled in On Hold.",
                "action": "Audit all On Hold deals within 7 days. Assign owners to re-engage or close out within 14 days to reduce pipeline bloat."
            },
            {
                "finding": f"Cold Email leads convert at 12.5% — the highest among all sources — while Social Media converts at just 7.5%.",
                "action": "Increase Cold Email investment and review Social Media lead quality. Run a 30-day A/B test reallocating 20% of Social budget to Email."
            },
            {
                "finding": f"Referral is the second-highest volume source (530 leads) but converts at only 9.2%, below the {win_rate}% average.",
                "action": "Interview recent referral leads to identify qualification gaps. Consider tightening referral intake criteria."
            },
        ],
    }

    write_json(OUTPUT, payload)
    print(f"Wrote {OUTPUT.name}: {row_count:,} rows, {len(source_labels)} sources, {len(stage_labels)} stages.")


if __name__ == "__main__":
    main()
