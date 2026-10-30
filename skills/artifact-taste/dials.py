# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""Deal design dials for one document, so the look does not come from the model's habits.

Usage: dials.py <format> "<one line: the subject and what the document is for>" [--seed TEXT]
The deal is deterministic: the same subject line (and seed) gives the same dials, different documents get
different ones. Prints every dial with a concrete setting for the format and a Dials line to copy.
Build what is dealt; change at most three dials, each for a reason that comes from the subject.
"""
import argparse
import hashlib
import sys

# name: (one end, middle, other end); ends are dealt more often than the middle
DIALS = {
    "shape": ("sharp corners, square fields", "slightly softened corners", "round: generous radius, pills, circles"),
    "line": ("no rules, or hairlines only", "medium rules", "heavy rules and frames"),
    "contrast": ("tonal and quiet: close values, a muted accent", "clear but calm", "black and white with one loud colour"),
    "ground": ("white or light paper throughout", "light pages with some full colour fields", "dark or colour-field on most pages, not just a dark cover"),
    "type": ("one family, weight and size carry everything", "one family, with figures in Courier New or a condensed face", "a deliberate pairing: display serif or slab with a grotesk"),
    "scale": ("gentle steps between sizes", "a clear display size", "extreme: one huge display moment per page against small text"),
    "density": ("airy: few elements, a lot of space", "balanced", "packed and analytical"),
    "rhythm": ("uniform: every page or slide has the same weight", "a loud opening, then even", "alternating loud and quiet pages"),
    "alignment": ("strict column grid", "a grid with one offset element per page", "asymmetric: wide margins, offset blocks, things off-centre"),
    "colour": ("colour only marks data", "colour marks data and section starts", "colour builds the structure: bands, fields, coloured panels"),
    "temperature": ("warm hues (rust, ochre, clay, wine)", "neutral greys with one hue", "cool hues (ink blue, teal, slate, green)"),
}
SHORT = {
    "shape": ("sharp", "soft", "round"), "line": ("hairline", "medium", "heavy"), "contrast": ("tonal", "calm", "high"),
    "ground": ("light", "light with colour fields", "dark"), "type": ("one family", "family plus mono figures", "pairing"),
    "scale": ("gentle", "clear", "extreme"), "density": ("airy", "balanced", "packed"), "rhythm": ("uniform", "loud opening", "alternating"),
    "alignment": ("strict grid", "grid with offsets", "asymmetric"), "colour": ("data only", "data and sections", "structural"),
    "temperature": ("warm", "neutral", "cool"),
}
APPLIES = {
    "pptx": list(DIALS), "pdf": list(DIALS),
    "docx": ["line", "contrast", "type", "density", "temperature"],
    "xlsx": ["density", "line", "temperature"],
}
VALUES = {
    "pptx": {"shape": ("borderRadius 0", "borderRadius 4pt", "borderRadius 14-24pt; pills"), "line": ("0 or 0.5pt", "1.5pt", "3-6pt and frames"),
             "scale": ("display 32-40pt over 16pt body", "display 54pt", "display 96-140pt over 14-16pt body"),
             "density": ("one idea per slide", "two blocks per slide", "a full analytical slide, still nothing under 12pt")},
    "pdf": {"shape": ("borderRadius 0", "borderRadius 1.5mm", "borderRadius 4-8mm; pills"), "line": ("0 or 0.5pt", "1pt", "3pt bars and frames"),
            "scale": ("display 22-28pt over 10pt body", "display 36pt", "display 60-90pt over 9.5pt body"),
            "density": ("wide margins, short columns", "normal", "tight leading, small gaps, more per page")},
}


def deal(fmt: str, subject: str, seed: str) -> dict:
    key = f"{fmt}|{' '.join(subject.lower().split())}|{seed}".encode("utf-8")
    out = {}
    for i, name in enumerate(APPLIES[fmt]):
        h = hashlib.sha256(key + f"|{i}|{name}".encode()).digest()
        r = h[0] / 256
        out[name] = 0 if r < 0.42 else 2 if r >= 0.58 else 1  # ends 84%, middle 16%
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("format", choices=sorted(APPLIES))
    ap.add_argument("subject")
    ap.add_argument("--seed", default="")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if len(a.subject.split()) < 4:
        sys.exit("FAIL give one real line about the subject and the document's purpose (at least four words)")
    dealt = deal(a.format, a.subject, a.seed)
    print(f"Dials for this {a.format} ({a.subject}):")
    short = []
    for name, pos in dealt.items():
        text = DIALS[name][pos]
        extra = VALUES.get(a.format, {}).get(name)
        print(f"  {name:12} {text}" + (f"  [{extra[pos]}]" if extra else ""))
        short.append(f"{name} {SHORT[name][pos]}")
    print("\nBuild these. You may change at most three dials, each for a reason from the subject; write the change into the line.")
    print("Copy this line under your Direction: line:\n")
    print("// Dials: " + " · ".join(short))
    return 0


if __name__ == "__main__":
    sys.exit(main())
