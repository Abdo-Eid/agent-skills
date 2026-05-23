# Markdown Report

When the user asks for a written summary after the HTML dashboard is delivered, generate a Markdown report directly from `data/dashboard-data.json`. No script or extra dependencies needed.

## Structure

```md
# [Dashboard Title] — Summary Report
**Generated:** [date]

## Key Metrics
| Metric | Value |
|---|---|
| ... | ... |

## Executive Summary
[2-3 sentences: current state, main risk or opportunity, confidence level.]

## Key Findings
- **Finding:** ... **Meaning:** ... **Action:** ...

## Recommendations
- ...
```

Follow the Finding → Meaning → Action pattern for every item under Key Findings. Keep the report concise — one page equivalent. Save the file as `outputs/report.md`.
