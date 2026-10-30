# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""Deal three far-apart looks for one document; the agent picks one, so the look does not come from the model's habits.

Usage: dials.py <format> "<one line: the subject and what the document is for>" [--seed TEXT] [--rtl]
The deal is deterministic: the same subject line (and seed) gives the same three looks, different documents get
different ones. Prints every dial with a concrete setting for the format and a Dials line to copy for each look.
Pick by the subject and build the pick; change at most one dial, for a reason that comes from the subject.
A requirement in the brief or a client's brand overrides any dial and does not count as a change.
--rtl (automatic when the subject line is in Arabic or Hebrew): never deals set-apart figures, which clash with joined script.
"""
import argparse
import colorsys
import hashlib
import re
import sys

# name: (one end, middle, other end); ends are dealt more often than the middle
DIALS = {
    "shape": ("sharp corners, square fields", "slightly softened corners", "round: generous radius, pills, circles"),
    "line": ("no rules, or hairlines only", "medium rules", "heavy rules and frames"),
    "contrast": ("tonal and quiet: close values, a muted accent", "clear but calm", "black and white with one loud colour"),
    "ground": ("white, or the faintest tint of your accent, throughout", "light pages with some full colour fields", "dark or colour-field on most pages, not just a dark cover; on a single page, the page itself is dark"),
    "type": ("one family, weight and size carry everything", "one family, with figures set apart: tabular, condensed or Courier New", "a deliberate pairing: display serif or slab with a grotesk"),
    "scale": ("gentle steps between sizes", "a clear display size", "extreme: one huge display moment per page against small text"),
    "density": ("airy: few elements, a lot of space", "balanced", "packed and analytical"),
    "rhythm": ("uniform: every page or slide has the same weight", "a loud opening, then even", "alternating loud and quiet pages"),
    "alignment": ("strict column grid", "a grid with one offset element per page", "asymmetric: wide margins, offset blocks, things off-centre"),
    "colour": ("colour only marks data", "colour marks data and section starts", "colour builds the structure: bands, fields, coloured panels"),
    "temperature": ("warm hues", "neutral greys with one hue", "cool hues"),
}
# the accent's hue is dealt too: named hues get copied, and "warm" came out rust every time
# yellow-greens are left out: at this lightness they go muddy (olive, mustard)
HUES = ([(330, 360), (0, 28)], [(195, 235)], [(165, 270)])
SHORT = {
    "shape": ("sharp", "soft", "round"), "line": ("hairline", "medium", "heavy"), "contrast": ("tonal", "calm", "high"),
    "ground": ("light", "light with colour fields", "dark"), "type": ("one family", "family plus set-apart figures", "pairing"),
    "scale": ("gentle", "clear", "extreme"), "density": ("airy", "balanced", "packed"), "rhythm": ("uniform", "loud opening", "alternating"),
    "alignment": ("strict grid", "grid with offsets", "asymmetric"), "colour": ("data only", "data and sections", "structural"),
    "temperature": ("warm", "neutral", "cool"),
}
APPLIES = {
    "pptx": list(DIALS), "pdf": list(DIALS),
    "docx": ["line", "contrast", "type", "density", "temperature"],
    "xlsx": ["density", "temperature"],
}
VALUES = {
    "pptx": {"shape": ("borderRadius 0", "borderRadius 4pt", "borderRadius 14-24pt; pills"), "line": ("0 or 0.5pt", "1.5pt", "3-6pt and frames"),
             "scale": ("display 32-40pt over 16pt body", "display 54pt", "display 96-140pt over 14-16pt body"),
             "density": ("one idea per slide", "two blocks per slide", "a full analytical slide, still nothing under 12pt")},
    "pdf": {"shape": ("border-radius 0", "border-radius 1.5mm", "border-radius 4-8mm; pills"), "line": ("0 or 0.5pt", "1pt", "3pt bars and frames"),
            "scale": ("display 22-28pt over 10pt body", "display 36pt", "display 60-90pt over 9.5pt body"),
            "density": ("wide margins, short columns", "normal", "tight leading, small gaps, more per page")},
    "xlsx": {"density": ("rh=24", "rh=20", "rh=16")},
}


def deal(fmt: str, subject: str, seed: str, rtl: bool = False) -> dict:
    key = f"{fmt}|{' '.join(subject.lower().split())}|{seed}".encode("utf-8")
    out = {}
    for i, name in enumerate(APPLIES[fmt]):
        h = hashlib.sha256(key + f"|{i}|{name}".encode()).digest()
        r = h[0] / 256
        out[name] = 0 if r < 0.42 else 2 if r >= 0.58 else 1  # ends 84%, middle 16%
    if rtl and out.get("type") == 1:
        out["type"] = 0
    return out


def accent(fmt: str, subject: str, seed: str, temperature: int) -> str:
    """A start colour inside the dealt temperature."""
    key = f"{fmt}|{' '.join(subject.lower().split())}|{seed}|accent".encode("utf-8")
    spans, n = HUES[temperature], int.from_bytes(hashlib.sha256(key).digest()[:4], "big")
    n %= sum(b - a for a, b in spans)
    for a, b in spans:
        if n < b - a:
            hue = a + n
            break
        n -= b - a
    r, g, b = colorsys.hls_to_rgb(hue / 360, 0.38, 0.3 if temperature == 1 else 0.62)
    return f"#{round(r * 255):02x}{round(g * 255):02x}{round(b * 255):02x}"


def hand(fmt: str, subject: str, seed: str, rtl: bool = False, size: int = 3) -> list:
    """Complete looks that differ from each other on at least half the dials."""
    names, need, hands, i = APPLIES[fmt], (len(APPLIES[fmt]) + 1) // 2, [], 0
    while len(hands) < size:
        c = deal(fmt, subject, f"{seed}|{i}", rtl)
        i += 1
        if all(sum(c[k] != h[k] for k in names) >= need for h in hands):
            hands.append(c)
    return hands


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("format", choices=sorted(APPLIES))
    ap.add_argument("subject")
    ap.add_argument("--seed", default="")
    ap.add_argument("--rtl", action="store_true", help="the document is right to left")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if len(a.subject.split()) < 4:
        sys.exit("FAIL give one real line about the subject and the document's purpose (at least four words)")
    hands = hand(a.format, a.subject, a.seed, a.rtl or bool(re.search(r"[֐-ࣿ]", a.subject)))
    print(f"Three looks for this {a.format} ({a.subject}):")
    lines = []
    for letter, dealt in zip("ABC", hands):
        print(f"\n{letter}")
        short = []
        start = accent(a.format, a.subject, f"{a.seed}|{letter}", dealt["temperature"])
        for name, pos in dealt.items():
            extra = VALUES.get(a.format, {}).get(name)
            if name == "temperature":
                print(f"  {name:12} {DIALS[name][pos]}  [accent starts from {start}]")
                short.append(f"{name} {SHORT[name][pos]} (accent {start})")
                continue
            print(f"  {name:12} {DIALS[name][pos]}" + (f"  [{extra[pos]}]" if extra else ""))
            short.append(f"{name} {SHORT[name][pos]}")
        lines.append(f"Dials: {letter} · " + " · ".join(short) + " · why: <what in this subject makes it the strongest>")
    print("\nPick the one this subject makes strongest, not the most familiar. No redraw.")
    print("A requirement in the brief or a client's brand overrides any dial and does not count as a change.")
    print("Beyond that you may change at most one dial, for a reason from the subject; write any change into the line.")
    print("Copy your pick's line under your Direction: line and fill in why:\n")
    for line in lines:
        print(f"<!-- {line} -->" if a.format == "pdf" else f"// {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
