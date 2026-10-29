# Fonts

Fonts shipped with the skill pack so documents do not depend on whatever the machine has installed. Static TrueType files, Regular, Medium and Bold (Amiri: Regular and Bold; Instrument Serif: Regular only). Every Arabic family also covers Latin and digits. All are licensed under the SIL Open Font License 1.1; each folder carries its own `OFL.txt`. Paths are relative to `<skills-root>/fonts/`.

| Family | Character | Good for |
|---|---|---|
| `Rubik` | Soft geometric sans | Friendly headings and UI-like documents |
| `Cairo` | Modern, slightly condensed sans | Headlines, dashboards, bold covers |
| `IBMPlexSansArabic` | Neutral, precise sans | Business reports, proposals, tables |
| `Tajawal` | Light, compact sans | Dense tables and small text |
| `NotoNaskhArabic` | Traditional Naskh | Long formal body text |
| `Amiri` | Classical book style | Quotations, titles, heritage or literary tone |
| `InstrumentSerif` | Condensed editorial display serif, Latin only, Regular weight only | Large titles and section headings in Latin documents (the PDF kit's Latin heading face unless you choose another); never set it bold or small |

## Using them

- **HTML to PDF (Chromium).** Load by file URL and set direction and language; Chromium joins and orders Arabic itself.
  `@font-face { font-family: "Rubik"; font-weight: 400; src: url("file:///<skills-root>/fonts/Rubik/Rubik-Regular.ttf"); }`
  with `<html lang="ar" dir="rtl">`. Declare one `@font-face` per weight.
- **PPTX, DOCX, XLSX.** These formats store only the font name. The font must be installed where the file is opened or rendered; this pack does not install fonts. Use a family from this folder only if it is installed on the machines that open or render the file; otherwise prefer a font the readers already have.

## Coverage notes

All six cover the core Arabic letters. Tajawal lacks the Persian and Urdu letter U+06CC; Cairo, Rubik and Tajawal lack a few rare letters in U+063B to U+063F. Check coverage before using a family for Persian, Urdu, Pashto or Kurdish.

## Provenance

Downloaded from the Google Fonts repository (`google/fonts`, `ofl/` directory). The IBM Plex Sans Arabic, Tajawal and Amiri files are unmodified. For Rubik, Cairo and Noto Naskh Arabic the upstream variable fonts were instanced to the static weights with fontTools; their licenses declare no Reserved Font Name. Copyright lines are in `THIRD_PARTY_NOTICES.md` at the repository root.
