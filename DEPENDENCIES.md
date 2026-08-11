# Agent Skills Dependencies

This document lists the runtimes, packages, binaries, browsers, and fonts needed by each skill. Install dependencies before an agent starts; the skills forbid runtime package installation and replacement skill downloads. The machine-readable equivalent is [`registry/dependencies.json`](registry/dependencies.json).

## Dependency Classes

| Class | Meaning |
|---|---|
| Authoring | Required to create the skill's primary output |
| Analysis | Required only for input reading, profiling, or data preparation |
| QA | Required by the host application's validation/rendering contract |
| Optional route | Required only when the skill selects that documented generation route |
| Shared | Used across multiple skills or by repository/runtime setup |

The Zynda document runtime provides every listed dependency in one immutable image. Other hosts may omit QA dependencies when they provide equivalent validators and renderers, but the skill instructions assume a `docQa`-style validation boundary exists.

## Image Target

| Component | Current target |
|---|---|
| Operating system | Debian 12 Bookworm |
| Node.js | 22.x |
| Python | 3.11.x |
| Browser | Playwright Chromium headless shell |
| Office engine | LibreOffice Writer, Calc, and Impress from Debian Bookworm |

Package versions below are the current image pins or scaffold-declared ranges. They are not acceptance evidence: consumers must run the skill smoke matrix before promotion.

## Shared System Dependencies

| Package/binary | Skills | Purpose |
|---|---|---|
| `python3`, `python3-pip` | PDF, XLSX, DOCX QA, BI Dashboard | Python generators, analysis, and validators |
| Node.js 22 | PDF, PPTX, DOCX, BI Dashboard | JavaScript generators and dashboard build |
| `zip`, `unzip` | All Office formats | Package inspection and source bundling |
| LibreOffice Core | PPTX, XLSX, DOCX | Headless compatibility, recalculation, and PDF rendering |
| `poppler-utils` | All rendered formats | `pdfinfo`, `pdftotext`, and `pdftoppm` |
| `qpdf` | PDF | Structural PDF validation |
| ImageMagick | PDF, PPTX, XLSX, DOCX | Rendered-image dimensions and contact sheets |
| Chromium headless shell | PDF HTML route, BI Dashboard QA | Browser rendering |
| DejaVu, Liberation, Noto, Noto CJK, Noto Color Emoji fonts | All visual formats | Predictable multilingual rendering and fallbacks |

## PDF

### Authoring And Optional Routes

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Python | `reportlab` | 5.0.0 | Programmatic PDF generation | BSD |
| Python | `pypdf` | 6.15.0 | PDF inspection, merging, and targeted manipulation | BSD-3-Clause |
| Python | `Pillow` | 12.3.0 | Image normalization and dimensions | MIT-CMU |
| Python | `matplotlib` | 3.11.1 | Optional local chart generation | PSF-compatible |
| Node | `pdf-lib` | 1.17.1 | Optional JavaScript PDF manipulation route | MIT |
| Node | `playwright` | 1.61.1 | Optional HTML/CSS-to-PDF route | Apache-2.0 |

### QA

- `qpdf`
- `poppler-utils`
- ImageMagick
- Chromium headless shell for the HTML route
- Shared fonts

## PPTX

### Authoring

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Node | `pptxgenjs` | 4.0.1 | Editable PowerPoint generation, charts, shapes, images, and layouts | MIT |

### QA

- LibreOffice Impress
- `defusedxml` 0.7.1 through the shared OOXML validator
- `poppler-utils`
- ImageMagick
- Shared fonts

## XLSX

### Authoring And Analysis

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Python | `XlsxWriter` | 3.2.9 | New workbook creation, formulas, formatting, validation, and charts | BSD-2-Clause |
| Python | `openpyxl` | 3.1.5 | Read-only analysis and deterministic QA inspection | MIT |
| Python | `pandas` | 3.0.5 | Tabular analysis for XLSX, XLSM, CSV, and TSV inputs | BSD-3-Clause |
| Python | `defusedxml` | 0.7.1 | Safe OOXML parsing in the validator | PSFL |

`openpyxl` is not an arbitrary uploaded-workbook writer in this skill. Generated workbooks are written with XlsxWriter and recalculated through LibreOffice.

### Recalculation And QA

- LibreOffice Calc
- `poppler-utils`
- ImageMagick
- Shared fonts

## DOCX

### Authoring

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Node | `docx` | 9.7.1 | Editable Word document generation | MIT |
| Python | `defusedxml` | 0.7.1 | Safe package XML validation | PSFL |

### QA

- LibreOffice Writer
- `poppler-utils`
- ImageMagick
- Shared fonts

## BI Dashboard

The dashboard scaffold has its own [`package.json`](skills/bi-dashboard/scaffold/package.json). Install it before the agent starts.

### Authoring And Data Preparation

| Ecosystem | Package | Declared version/range | Purpose | License |
|---|---|---:|---|---|
| Node | `react` | ^19.2.6 | Dashboard UI | MIT |
| Node | `react-dom` | ^19.2.6 | React DOM renderer | MIT |
| Node | `echarts` | ^6.1.0 | Charts and visualization | Apache-2.0 |
| Node | `echarts-for-react` | ^3.0.6 | React ECharts adapter | MIT |
| Node | `vite` | ^8.0.14 | Dashboard build | MIT |
| Node | `@vitejs/plugin-react` | ^6.0.2 | React build integration | MIT |
| Node | `vite-plugin-singlefile` | ^2.3.3 | Portable single-file HTML output | MIT |
| Python | `duckdb` | 1.5.5 | Local analytical queries and aggregation | MIT |
| Python | `pandas` | 3.0.5 | Input normalization and tabular preparation | BSD-3-Clause |

### QA

- Playwright 1.61.1
- Chromium headless shell
- Shared fonts

## Reference Installation

The commands below are a convenience baseline for Debian 12. Production deployments should pin an image digest and package versions and preserve applicable license notices.

```bash
apt-get update && apt-get install -y --no-install-recommends \
  python3 python3-pip zip unzip qpdf poppler-utils imagemagick \
  libreoffice-core libreoffice-writer libreoffice-calc libreoffice-impress \
  fonts-dejavu fonts-liberation fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji
```

```bash
pip3 install \
  XlsxWriter==3.2.9 openpyxl==3.1.5 pandas==3.0.5 defusedxml==0.7.1 \
  reportlab==5.0.0 pypdf==6.15.0 Pillow==12.3.0 duckdb==1.5.5 matplotlib==3.11.1
```

```bash
npm install -g \
  playwright@1.61.1 pptxgenjs@4.0.1 docx@9.7.1 pdf-lib@1.17.1
npx playwright install --only-shell chromium
npm install --prefix skills/bi-dashboard/scaffold
```

## Runtime Verification

Verify dependencies before publishing an image:

```bash
python3 -c "import xlsxwriter, openpyxl, pandas, defusedxml, reportlab, pypdf, PIL, duckdb, matplotlib"
node -e "require('playwright'); require('pptxgenjs'); require('docx'); require('pdf-lib')"
command -v soffice qpdf pdfinfo pdftoppm convert zip unzip
```

The consuming host should additionally run representative creation, recalculation, rendering, and validator smoke tests. Package presence alone does not prove the complete skill contract.

## Licensing

Runtime packages are not relicensed by this repository. Their upstream licenses remain authoritative. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for first-party files that carry separate licenses and for the runtime-dependency notice policy.
