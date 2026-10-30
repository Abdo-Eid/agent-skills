# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""One-call DOCX check: OOXML validation, style/table/footer audit, LibreOffice page count, page fill, expected text.
Usage: python check.py file.docx [--pages N] [--expect "text" ...] [--text] [--fit "node src/build.cjs"]
Exit 1 only for: invalid package, no real heading styles, typed bullets/leader dots, wrong page count, missing --expect text.
The page-fill lines are information and never change the exit code. --expect ignores case, whitespace and quote/dash style.
--fit CMD (needs --pages N): re-runs CMD with DOCX_SPREAD=s (spacing only) until the file has N pages with a filled last page."""
import argparse, os, re, shutil, subprocess, sys, tempfile, unicodedata, zipfile
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('docx'); ap.add_argument('--pages', type=int); ap.add_argument('--expect', nargs='*', default=[]); ap.add_argument('--text', action='store_true'); ap.add_argument('--fit')
a = ap.parse_intermixed_args()
bad = []

SOFFICE = os.environ.get('SOFFICE') or next((p for p in (r'C:\Program Files\LibreOffice\program\soffice.exe', shutil.which('soffice.exe'), shutil.which('libreoffice'), shutil.which('soffice') if os.name != 'nt' else None) if p and os.path.exists(p)), None)


def convert(docx):
    """-> (page count, [fill per page], text). Fill = how far down the page the last text reaches."""
    from pypdf import PdfReader
    with tempfile.TemporaryDirectory() as td:
        subprocess.run([SOFFICE, f'-env:UserInstallation={Path(td, "prof").as_uri()}', '--headless', '--convert-to', 'pdf', '--outdir', td, docx], capture_output=True, timeout=180)
        pdf = Path(td, Path(docx).stem + '.pdf')
        if not pdf.exists(): return 0, [], ''
        rd = PdfReader(str(pdf)); fills, text = [], ''
        for pg in rd.pages:
            ys = []
            def visit(t, cm, tm, fd, fs):
                if t.strip(): ys.append(tm[5] * cm[3] + cm[5])
            text += (pg.extract_text(visitor_text=visit) or '') + '\n'
            h = float(pg.mediabox.height); body = [y for y in ys if 50 < y < h - 60]
            fills.append(1 - min(body) / h if body else 0)
        return len(rd.pages), fills, text


def fit(cmd, n):
    """Secant search over the spacing spread on length L = pages - 1 + last-page fill; the last page should end at about 85% (a full page reaches 90%)."""
    goal, hist, ok = n - 1 + .85 / .9, [], []
    build = lambda s: subprocess.run(cmd, shell=True, env={**os.environ, 'DOCX_SPREAD': str(s)}, capture_output=True, text=True)
    for _ in range(5):
        if not hist: s = 1.0
        elif len(hist) == 1: s = 1.5 if hist[0][1] < goal else .8
        else:
            (s0, l0), (s1, l1) = sorted(hist, key=lambda h: abs(h[1] - goal))[:2]
            s = s1 + (goal - l1) * (s1 - s0) / (l1 - l0) if l1 != l0 else s1
        s = round(min(1.8, max(.7, s)), 2)
        if any(abs(s - h[0]) < .02 for h in hist): break
        r = build(s)
        if r.returncode: print(r.stdout + r.stderr); bad.append('--fit command failed'); return
        pages, fills, _ = convert(a.docx)
        if not pages: bad.append('LibreOffice could not convert'); return
        print(f'fit: spread {s} -> {pages} pages, last page {fills[-1]:.0%}')
        hist.append((s, pages - 1 + fills[-1] / .9))
        if pages == n: ok.append((s, fills[-1]))
        if pages == n and .78 <= fills[-1] <= .87: break
    good = [o for o in ok if .78 <= o[1] <= .87]
    if not ok:
        bad.append(f'--fit could not reach {n} pages (spread .7 to 1.8): ' + ('add real content, not blank lines' if hist[-1][1] < goal else 'cut content'))
        build(1.0)                                    # leave the file built at the default spread
        return
    s, f = (good or [max(ok, key=lambda o: o[1])])[-1]
    if s != hist[-1][0]: build(s)
    print(f'fit: using spread {s}, last page {f:.0%}; keep it by adding spread: {s} to K.doc' + ('' if good else '. Last page is light: the content is short for this page count, add real content if you can'))


# 1. fit first (it rebuilds the file), then package validity and structure audit of the final file
if a.fit and a.pages and SOFFICE: fit(a.fit, a.pages)
r = subprocess.run([sys.executable, str(Path(__file__).parent / 'scripts' / 'validate_ooxml.py'), 'docx', a.docx], capture_output=True, text=True)
print('validate_ooxml:', (r.stdout or r.stderr).strip()[:200])
if r.returncode: bad.append('OOXML invalid'); print('FAIL (exit 1): ' + '; '.join(bad)); sys.exit(1)
z = zipfile.ZipFile(a.docx)
doc = z.read('word/document.xml').decode('utf8')
foot = ''.join(z.read(n).decode('utf8') for n in z.namelist() if re.match(r'word/footer\d*\.xml', n))
sty = {s: len(re.findall(f'<w:pStyle w:val="{s}"', doc)) for s in ('Title', 'Heading1', 'Heading2', 'Heading3')}
print('styles used:', sty, '| tables:', doc.count('<w:tbl>'), '| header rows:', doc.count('<w:tblHeader/>'), '| list items:', doc.count('<w:numPr>'), '| bidi paragraphs:', doc.count('<w:bidi/>'))
fields = 'PAGE' in foot and 'NUMPAGES' in foot
print('footer fields:', 'PAGE + NUMPAGES' if fields else 'PAGE' if 'PAGE' in foot else 'none')
if not sty['Title'] and not sty['Heading1']: bad.append('no Title/Heading1 styles used (use real heading styles)')
if re.search(r'<w:t[^>]*>[^<]*(\.{6,}|\u2022\s)', doc): bad.append('typed leader dots or bullet characters in text')

# 3. page count, fill, text
text, n = '', 0
if SOFFICE:
    n, fills, text = convert(a.docx)
    if not n: bad.append('LibreOffice could not convert')
    for i, f in enumerate(fills, 1): print(f'page {i}: body reaches {f:.0%} of page height')
    print(f'{n} pages')
    if a.pages and n != a.pages: bad.append(f'expected {a.pages} pages, got {n} (--fit "<build command>" spreads spacing to a fixed count)')
    low = [i for i, f in enumerate(fills, 1) if f < .7 and (i < n or n <= 3)]
    if low: print(f'note: page(s) {low} under 70% full (information only; exit code unaffected)')
else:
    print('soffice not found: page part skipped')

# 4. expected text: ignore case, whitespace, quote and dash style (letter-spaced or all-caps styles extract oddly)
fold = lambda s: re.sub(r'\s+', '', unicodedata.normalize('NFKC', s).translate({0x2018: 39, 0x2019: 39, 0x201c: 34, 0x201d: 34, 0x2013: 45, 0x2014: 45, 0x2212: 45})).lower()
for e in a.expect:
    if not text or fold(e) in fold(text): continue
    m = re.fullmatch(r'\s*Page\s+(\d+)\s+of\s+(\d+)\s*', e, re.I)
    if m and fields and int(m[2]) != n: bad.append(f'{e!r}: page-number fields are live, this file has {n} pages, not {m[2]}')
    elif m: bad.append(f'{e!r}: no such footer text (fields present: {fields})')
    else: bad.append(f'missing text: {e!r}')
if a.text: print('---\n' + text)
print('FAIL (exit 1): ' + '; '.join(bad) if bad else 'OK (exit 0)'); sys.exit(1 if bad else 0)
