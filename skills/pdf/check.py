# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""One-call PDF check: opens it strictly, counts pages, reports how full each page is, lists fonts.
For Arabic and other right-to-left PDFs it also confirms the text is real and selectable,
and that every Arabic glyph was set in one of the shipped Arabic fonts (<skills-root>/fonts).
It does not compare the text with what you wrote: read that on the preview pages.
Usage: python check.py file.pdf [--pages N] [--text] [--rtl]   (exit 1 on any failure)"""
import argparse, os, re, shutil, subprocess, sys, unicodedata
from pypdf import PdfReader

sys.stdout.reconfigure(encoding='utf-8')  # Windows consoles default to cp1252 and crash on Arabic
AR = re.compile(r'[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]')
NOISE = re.compile(r'[‎‏‪-‮⁦-⁩ً-ْٰـ]')  # bidi marks, vowel marks, tatweel
ap = argparse.ArgumentParser()
ap.add_argument('pdf'); ap.add_argument('--pages', type=int)
ap.add_argument('--text', action='store_true'); ap.add_argument('--rtl', action='store_true', help='require selectable Arabic text')
a = ap.parse_args()
bad = []
try:
    r = PdfReader(a.pdf, strict=True)
except Exception as e:
    sys.exit(f'FAIL cannot open: {e}')
n = len(r.pages)
if a.pages and n != a.pages: bad.append(f'expected {a.pages} pages, got {n}')
shipped = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
families = [d.lower() for d in os.listdir(shipped) if os.path.isdir(os.path.join(shipped, d))] if os.path.isdir(shipped) else []
flat = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
MARGIN = 24 * 72 / 25.4  # the build's top and bottom margin, in points


def arabic_in_tounicode(font):
    """True if this font's ToUnicode map yields Arabic code points, i.e. it was used to draw Arabic."""
    tu = font.get('/ToUnicode')
    if tu is None: return False
    for line in tu.get_object().get_data().decode('latin1').splitlines():
        t = re.findall(r'<([0-9A-Fa-f]+)>', line)
        if len(t) >= 2 and AR.match(chr(int(t[-1][:4], 16))): return True
    return False


fonts, ar_fonts, alltext = set(), set(), []
for i, pg in enumerate(r.pages, 1):
    ys = []
    def visit(text, cm, tm, fd, fs):
        if text.strip(): ys.append(tm[5] * cm[3] + cm[5])
    t = pg.extract_text(visitor_text=visit) or ''
    alltext.append(t)
    h = float(pg.mediabox.height)
    body = [y for y in ys if 60 < y < h - 40]  # ignore header/footer text
    low = min(body) if body else None
    reach = min(1, (h - low - MARGIN) / (h - 2 * MARGIN)) if low else 0  # share of the page's content area, top margin to footer
    used = f'text reaches {reach:.0%} of the content height' if low else 'no body text'
    print(f'page {i}: {len(t)} chars, {used}')
    if low is None or (reach < .55 and (i < n or n <= 3)): print(f'WARN (not a failure): page {i} looks mostly empty; add real content, make what is there larger, or use fewer pages. Do not stretch boxes to fill it')
    for f in (pg.get('/Resources') or {}).get('/Font', {}).values():
        f = f.get_object(); name = re.sub(r'^[A-Z]{6}\+', '', str(f.get('/BaseFont')).lstrip('/'))
        fonts.add(name)
        if arabic_in_tounicode(f): ar_fonts.add(name)
print(f'{n} pages, title={r.metadata.title if r.metadata else None!r}, fonts={sorted(fonts)}')


def extract():
    """Text for the Arabic checks. Readers differ in the details (Poppler swaps the letters inside a ligature, pypdf loses some words), so nothing here compares exact words."""
    exe = shutil.which('pdftotext')
    out = subprocess.run([exe, '-enc', 'UTF-8', a.pdf, '-'], capture_output=True).stdout.decode('utf-8', 'replace') if exe else ''
    return (out, 'pdftotext') if out.strip() else ('\n'.join(alltext), 'pypdf')


raw, how = extract()
full = NOISE.sub('', unicodedata.normalize('NFKC', raw))  # NFKC turns the presentation forms Chromium maps glyphs to back into base letters
n_ar = len(AR.findall(full))
if n_ar or a.rtl:
    print(f'arabic ({how}): fonts used for Arabic={sorted(ar_fonts)}')
    if not n_ar: bad.append('no selectable Arabic text in the PDF (outlined, rasterised or drawn with a font that has no Arabic map)')
    elif 'reportlab' in str((r.metadata or {}).get('/Producer', '')).lower(): bad.append('made with ReportLab, which cannot join or reorder Arabic: build it with build.cjs instead')
    else:
        outside = [f for f in ar_fonts if not any(flat(f).startswith(fam) for fam in families)]
        if families and outside: bad.append(f'Arabic set in {outside}, not a shipped Arabic font: the @font-face did not load (check the file URL) or the font fell back')
if a.text: print('---\n' + full)
print('FAIL: ' + '; '.join(bad) if bad else 'OK'); sys.exit(1 if bad else 0)
