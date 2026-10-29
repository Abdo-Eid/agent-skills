# Third-Party Notices

This document identifies components in the Agent Skills pack that are not governed exclusively by the root proprietary license.

## MIT-Licensed XLSX Helpers

The following files are available under the MIT License:

- `skills/xlsx/scripts/read_workbook.py`
- `skills/xlsx/scripts/recalculate_workbook.py`
- `skills/xlsx/scripts/validate_workbook.py`

Copyright (c) 2026 Abdulhamed Samy Eid

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## SIL Open Font License Fonts

The fonts in `skills/fonts/` are third-party works under the SIL Open Font License, Version 1.1. They are not covered by the root proprietary license. Each family folder contains its `OFL.txt` with the full license text, which must stay with the font files.

| Family | Copyright | Source |
|---|---|---|
| Rubik | Copyright 2015 The Rubik Project Authors | https://github.com/googlefonts/rubik |
| Cairo | Copyright 2009 The Cairo Project Authors | https://github.com/Gue3bara/Cairo |
| IBM Plex Sans Arabic | Copyright 2017 IBM Corp., Reserved Font Name "Plex" | https://github.com/IBM/plex |
| Tajawal | Copyright 2018 Boutros International | http://www.boutrosfonts.com |
| Noto Naskh Arabic | Copyright 2022 The Noto Project Authors | https://github.com/notofonts/arabic |
| Amiri | Copyright 2010-2022 The Amiri Project Authors | https://github.com/aliftype/amiri |
| Instrument Serif | Copyright 2022 The Instrument Serif Project Authors | https://github.com/Instrument/instrument-serif |

Files were taken from the Google Fonts repository (`google/fonts`). IBM Plex Sans Arabic, Tajawal, Amiri and Instrument Serif are unmodified. The Rubik, Cairo and Noto Naskh Arabic Regular, Medium and Bold files are static instances generated from the upstream variable fonts with fontTools; those families declare no Reserved Font Name.

## Lucide Icons

`skills/icons/icons.json` bundles 79 icons from Lucide (https://github.com/lucide-icons/lucide), copyright (c) 2026 Lucide Icons and Contributors, under the ISC License; the icons derived from Feather (copyright (c) 2013-present Cole Bemis) are under the MIT License. The full text of both is in `skills/icons/LICENSE.txt` and must stay with the file. The SVG markup is unmodified apart from removing the outer `svg` element and whitespace.

## Runtime Dependencies

The repository records runtime package names but does not vendor their source code. Node, Python, Debian, browser, office, and font dependencies retain their own licenses. The private OCI image build must preserve applicable notices and produce an SBOM before production promotion.
