# Agent Skills Dependencies

This document lists the runtimes, packages, binaries, browsers, and fonts needed by each skill. Skills do not download replacement skills or mutate dependency manifests at runtime. The machine-readable equivalent is [`registry/dependencies.json`](registry/dependencies.json).

## Dependency Classes

| Class | Meaning |
|---|---|
| Authoring | Required to create the skill's primary output |
| Analysis | Required only for input reading, profiling, or data preparation |
| QA | Required by the skills' own check and preview commands |
| Optional route | Required only when the skill selects that documented generation route |
| Shared | Used across multiple skills or by repository/runtime setup |

The machine that runs a skill provides its dependencies. Each format skill carries its own checks, and `artifact-taste/preview.py` renders any output to page images; the skills assume no other validation or rendering tool.

## Image Target

| Component | Current target |
|---|---|
| Operating system | Debian 12 Bookworm |
| Node.js | 22.x |
| Python | 3.11.x |
| Browser | Playwright Chromium headless shell |
| Office engine | LibreOffice Writer, Calc, and Impress from Debian Bookworm |
| XML parser | Python standard library, with expat 2.4.1 or newer (the OOXML validators check it and reject any DOCTYPE) |

Package versions below are the current image pins or scaffold-declared ranges. They are not acceptance evidence: consumers must run the skill smoke matrix before promotion.

## Shared System Dependencies

| Package/binary | Skills | Purpose |
|---|---|---|
| `python3`, `python3-pip` | PDF, XLSX, DOCX QA | Python generators, analysis, and validators |
| Node.js 22 | PDF, PPTX, DOCX | JavaScript generators |
| `zip`, `unzip` | All Office formats | Package inspection and source bundling |
| LibreOffice Core, Writer, Calc, Impress | PPTX, XLSX, DOCX, artifact-taste preview | Headless compatibility, recalculation, and conversion to PDF for page previews |
| `poppler-utils` | PDF, DOCX, artifact-taste preview | `pdftotext` for the Arabic text check and the DOCX contents page numbers; `pdftoppm` renders page images |
| Chromium headless shell | PDF, artifact-taste `image.cjs` | Browser rendering; drawn images for any format |
| DejaVu, Liberation, Noto, Noto CJK, Noto Color Emoji fonts | All visual formats | Predictable multilingual rendering and fallbacks |

## PDF

### Authoring And Routes

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Python | `pypdf` | 6.15.0 | PDF inspection, merging, targeted manipulation, and the check command | BSD-3-Clause |
| Python | `Pillow` | 12.3.0 | Optional: image dimensions and normalization (no skill imports it) | MIT-CMU |
| Python | `matplotlib` | 3.11.1 | Optional: chart images until DOCX has an SVG chart recipe (PDF charts are inline SVG) | PSF-compatible |
| Node | `playwright` | 1.62.1 | HTML/CSS-to-PDF: the single PDF route for every language | Apache-2.0 |

ReportLab is no longer used, including for Latin documents. Documents are plain HTML and CSS printed by `build.cjs`.

### QA

- `poppler-utils` (`pdftotext` for the Arabic text check)
- Chromium headless shell
- Shared fonts, plus the Arabic-capable fonts shipped in `skills/fonts/`, which the build loads by file URL

## PPTX

### Authoring

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Node | `pptxgenjs` | 4.0.1 | Editable PowerPoint generation, charts, shapes, images, and layouts | MIT |

### QA

- LibreOffice Impress
- The shared OOXML validator, which uses the Python standard library XML parser
- Shared fonts

## XLSX

### Authoring And Analysis

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Python | `XlsxWriter` | 3.2.9 | New workbook creation, formulas, formatting, validation, and charts | BSD-2-Clause |
| Python | `openpyxl` | 3.1.5 | Read-only analysis and deterministic QA inspection | MIT |
| Python | `pandas` | 3.0.5 | Tabular analysis for XLSX, XLSM, CSV, and TSV inputs | BSD-3-Clause |

`openpyxl` is not an arbitrary uploaded-workbook writer in this skill. Generated workbooks are written with XlsxWriter and recalculated through LibreOffice.

### Recalculation And QA

- LibreOffice Calc
- Shared fonts

## DOCX

### Authoring

| Ecosystem | Package | Pinned version | Purpose | License |
|---|---|---:|---|---|
| Node | `docx` | 9.7.1 | Editable Word document generation | MIT |
| Python | `pypdf` | 6.15.0 | Page count and page fill in the check (reads the LibreOffice PDF) | BSD-3-Clause |

### QA

- LibreOffice Writer, which the kit also runs at save to work out contents page numbers
- `poppler-utils` (`pdftotext` for those page numbers)
- Shared fonts

## Reference Installation

The commands below are a convenience baseline for Debian 12. Production deployments should pin an image digest and package versions and preserve applicable license notices.

```bash
apt-get update && apt-get install -y --no-install-recommends \
  python3 python3-pip zip unzip poppler-utils \
  libreoffice-core libreoffice-writer libreoffice-calc libreoffice-impress \
  fonts-dejavu fonts-liberation fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji
```

```bash
pip3 install \
  XlsxWriter==3.2.9 openpyxl==3.1.5 pandas==3.0.5 \
  pypdf==6.15.0 Pillow==12.3.0 matplotlib==3.11.1
```

```bash
npm install -g \
  playwright@1.62.1 pptxgenjs@4.0.1 docx@9.7.1
npx playwright install --only-shell chromium
```

## Runtime Verification

Verify dependencies before publishing an image:

```bash
python3 -c "import xlsxwriter, openpyxl, pandas, pypdf, PIL, matplotlib; from xml.parsers import expat; assert expat.version_info >= (2, 4, 1)"
node -e "require('playwright'); require('pptxgenjs'); require('docx')"
command -v soffice pdfinfo pdftoppm pdftotext zip unzip
```

The consuming host should additionally run representative creation, recalculation, rendering, and validator smoke tests. Package presence alone does not prove the complete skill contract.

## Licensing

Runtime packages are not relicensed by this repository. Their upstream licenses remain authoritative. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for first-party files that carry separate licenses and for the runtime-dependency notice policy.
