"""Domain-neutral deterministic starter. Replace with task-specific aggregation."""

import json
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "data" / "dashboard-data.json"


def main() -> None:
    payload = {
        "metadata": {
            "mode": "domain-neutral deterministic starter",
            "generatedAt": datetime.now(UTC).isoformat(),
            "replaceBeforeDelivery": True,
        },
        "assessment": {
            "title": "Replace this assessment with a measured task conclusion",
            "detail": "The starter demonstrates portable dashboard capabilities without assuming a business domain.",
        },
        "kpis": [
            {"label": "Primary total", "value": "6,750", "note": "Sum across the displayed periods"},
            {"label": "Current rate", "value": "81.0%", "note": "Example target: at least 80.0%"},
            {"label": "Group count", "value": "4", "note": "Distinct groups in this sample"},
            {"label": "Flagged groups", "value": "1", "note": "Structured threshold exception"},
        ],
        "charts": {
            "trend": [
                {"period": "P1", "primary": 980, "rate": 76.0},
                {"period": "P2", "primary": 1040, "rate": 77.5},
                {"period": "P3", "primary": 1090, "rate": 79.0},
                {"period": "P4", "primary": 1160, "rate": 80.5},
                {"period": "P5", "primary": 1210, "rate": 82.0},
                {"period": "P6", "primary": 1270, "rate": 81.0},
            ],
            "groups": [
                {"group": "Group A", "primary": 1820, "secondary": 72},
                {"group": "Group B", "primary": 1710, "secondary": 84},
                {"group": "Group C", "primary": 1640, "secondary": 118},
                {"group": "Group D", "primary": 1580, "secondary": 91},
            ],
            "composition": [
                {"category": "Category 1", "value": 34},
                {"category": "Category 2", "value": 28},
                {"category": "Category 3", "value": 22},
                {"category": "Category 4", "value": 16},
            ],
            "relationship": [
                {"group": "Group A", "x": 84, "y": 72},
                {"group": "Group B", "x": 81, "y": 84},
                {"group": "Group C", "x": 76, "y": 118},
                {"group": "Group D", "x": 79, "y": 91},
            ],
        },
        "insights": [
            {"finding": "The primary measure rises from 980 in P1 to 1,270 in P6.", "meaning": "The sample demonstrates a measured trend statement tied directly to generated values."},
            {"finding": "Group C is the only group above the secondary threshold of 100.", "meaning": "The sample demonstrates how a structured exception supports a focused action."},
        ],
        "actions": [
            {"finding": "Group C has a secondary value of 118 against a target of at most 100.", "action": "Replace this with a task-specific owner and measurable response."},
        ],
        "exceptions": [
            {"entity": "Group C", "periods": ["P6"], "metric": "Secondary measure", "actual": 118, "unit": "units", "target": 100, "operator": "<=", "variance": 18, "driver": "Replace with an evidence-backed task driver", "owner": "Task owner", "action": "Replace with a task-specific action"},
        ],
    }

    trend_total = sum(row["primary"] for row in payload["charts"]["trend"])
    group_total = sum(row["primary"] for row in payload["charts"]["groups"])
    if trend_total != 6750 or group_total != trend_total:
        raise ValueError("Starter primary totals no longer reconcile.")
    if len(payload["charts"]["trend"]) != 6 or len(payload["charts"]["groups"]) != 4:
        raise ValueError("Starter period or group count changed unexpectedly.")
    if sum(row["value"] for row in payload["charts"]["composition"]) != 100:
        raise ValueError("Starter composition no longer reconciles to 100 percent.")
    exception_keys = {(row["entity"], row["metric"], tuple(row["periods"])) for row in payload["exceptions"]}
    if len(payload["exceptions"]) != 1 or len(exception_keys) != 1:
        raise ValueError("Starter exception keys no longer reconcile.")
    if any(not rows for rows in payload["charts"].values()):
        raise ValueError("A required starter chart dataset is empty.")

    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("Wrote dashboard-data.json: domain-neutral deterministic starter.")


if __name__ == "__main__":
    main()
