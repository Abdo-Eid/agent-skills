# Default Dashboard Style

The default dashboard is a light, information-first business artifact: clear on a shared screen and readable when printed from a normal browser. The starter stylesheet provides a flexible vocabulary, not a domain model or mandatory visual template.

## Direction

- Use warm white or pale neutral surfaces with charcoal text.
- Use one restrained primary accent and reserve warning/danger colors for explicit status.
- Prefer crisp borders and modest shadows over decorative gradients, glass effects, or dense ornament.
- Use tabular figures for KPIs and tables.
- Make the decision hierarchy obvious: assessment, KPIs, primary evidence, supporting comparisons, material exceptions when present, definitions, and methodology.

## Typography

- Keep prose at a comfortable reading size; use short explanatory copy instead of shrinking it to fit a card.
- Use at least 12 px for visible chart text and prefer 14 px for axes, legends, and axis names.
- Use at least 12 px for visible chart data labels. If data labels create crowding, omit non-essential labels and preserve the axis or tooltip rather than shrinking them.
- Use at least 10 pt for printed body text and 9 pt for printed tables. More pages are preferable to unreadable output.

## Print

- Derive print from the same dashboard state as screen output.
- Use a light, high-contrast print palette even when an explicit task requires a dark screen treatment.
- Set an explicit landscape `@page` size and practical margins.
- Keep headings, KPI groups, chart cards, exception cards, and table rows together where practical.
- Repeat table headers and allow long tables to continue across pages.

## Dark Exceptions

Dark surfaces are appropriate only for explicit brand systems or genuine control-room, security, monitoring, or low-light contexts. Keep text contrast high, preserve non-color status labels, and provide a light print treatment. A dark dashboard is a task decision, not the starter default.
