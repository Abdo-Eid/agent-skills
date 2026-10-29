# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""Render a PDF, PPTX, DOCX or XLSX to one PNG per page so you can look at it.

Usage: preview.py <file> [--out DIR] [--dpi 90] [--max-pages 30]
PDF pages are rendered with pdftoppm (poppler); office files are first converted to PDF by LibreOffice,
each call with its own profile so parallel runs never collide. Writes page-NN.png and, if Pillow is
available, sheet.png with all pages side by side. Prints one JSON line with the file list.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def soffice() -> str:
    """LibreOffice binary. On Windows soffice.com/soffice open a console window, so prefer soffice.exe."""
    env = os.environ.get("SOFFICE")
    if env:
        return env
    if sys.platform == "win32":
        for base in (os.environ.get("ProgramFiles", r"C:\Program Files"), os.environ.get("ProgramFiles(x86)", "")):
            exe = Path(base) / "LibreOffice" / "program" / "soffice.exe"
            if base and exe.exists():
                return str(exe)
    found = shutil.which("soffice") or shutil.which("libreoffice")
    if not found:
        sys.exit("FAIL LibreOffice (soffice) not found; set SOFFICE to its path")
    return found


def to_pdf(source: Path, out: Path) -> Path:
    if source.suffix.lower() == ".pdf":
        return source
    profile = Path(tempfile.mkdtemp(prefix="lo-profile-"))
    try:
        subprocess.run([soffice(), f"-env:UserInstallation={profile.as_uri()}", "--headless", "--norestore",
                        "--convert-to", "pdf", "--outdir", str(out), str(source)],
                       check=True, capture_output=True, timeout=240)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    pdf = out / f"{source.stem}.pdf"
    if not pdf.exists():
        sys.exit(f"FAIL LibreOffice produced no PDF for {source.name}")
    return pdf


def sheet(pages: list, target: Path, width: int = 420, cols: int = 4) -> bool:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return False
    thumbs = []
    for page in pages:
        im = Image.open(page).convert("RGB")
        thumbs.append(im.resize((width, round(im.height * width / im.width))))
    rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
    pad, label = 14, 18
    heights = [max(t.height for t in r) + label for r in rows]
    canvas = Image.new("RGB", (min(cols, len(thumbs)) * (width + pad) + pad, sum(heights) + pad * (len(rows) + 1)), (225, 225, 228))
    draw, y, n = ImageDraw.Draw(canvas), pad, 0
    for row, h in zip(rows, heights):
        for c, t in enumerate(row):
            n += 1
            x = pad + c * (width + pad)
            draw.text((x, y), f"page {n}", fill=(60, 60, 64))
            canvas.paste(t, (x, y + label))
        y += h + pad
    canvas.save(target)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--dpi", type=int, default=90)
    ap.add_argument("--max-pages", type=int, default=30)
    a = ap.parse_args()
    source = a.file.resolve()
    if not source.exists():
        sys.exit(f"FAIL no such file: {source}")
    out = (a.out or source.parent.parent / "preview").resolve()
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    pdf = to_pdf(source, out)
    exe = shutil.which("pdftoppm")
    if not exe:
        sys.exit("FAIL pdftoppm (poppler-utils) not found")
    subprocess.run([exe, "-r", str(a.dpi), "-l", str(a.max_pages), "-png", str(pdf), str(out / "page")],
                   check=True, capture_output=True, timeout=240)
    pages = sorted(out.glob("page-*.png"))
    for p in pages:  # pdftoppm pads page numbers by page count; normalise to page-NN.png
        n = int(p.stem.split("-")[-1])
        if p.name != f"page-{n:02d}.png":
            p.rename(out / f"page-{n:02d}.png")
    pages = sorted(out.glob("page-*.png"))
    if not pages:
        sys.exit("FAIL no pages rendered")
    has_sheet = sheet(pages, out / "sheet.png")
    print(json.dumps({"pages": len(pages), "pageFiles": [str(p) for p in pages],
                      "sheet": str(out / "sheet.png") if has_sheet else None}))
    note = direction(source.parent.parent / "src")
    if note:
        print(f"\nYOUR DIRECTION: {note}\n"
              "Before you finish, check every page against it: for each page, name what on it comes from that direction. "
              "A page that could sit unchanged in any document of this kind is the template, not your direction: rebuild it and preview again.")
    else:
        print("\nNo 'Direction:' comment found in the generator under src/. Write one (see artifact-taste), then check every page against it.")
    return 0


def direction(src: Path) -> str:
    """The 'Direction:' comment of the generator, joined across its comment lines."""
    if not src.is_dir():
        return ""
    for f in sorted(src.rglob("*")):
        if f.suffix not in (".cjs", ".js", ".mjs", ".py") or not f.is_file():
            continue
        lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
        for i, line in enumerate(lines):
            if "Direction:" in line:
                parts = [line.split("Direction:", 1)[1].strip()]
                for nxt in lines[i + 1:i + 6]:
                    s = nxt.strip()
                    if not s.startswith(("//", "#", "*")) or "Direction:" in s:
                        break
                    parts.append(s.lstrip("/#* ").strip())
                return " ".join(p for p in parts if p)
    return ""


if __name__ == "__main__":
    sys.exit(main())
