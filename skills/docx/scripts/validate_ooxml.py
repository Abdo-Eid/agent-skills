#!/usr/bin/env python3
# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""Validate the minimum OOXML package contract for DOCX and PPTX artifacts."""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import PurePosixPath

from xml.etree import ElementTree
from xml.parsers import expat

# OOXML parts never carry a DTD, so any DOCTYPE is rejected before parsing; expat 2.4.1 and later
# also limits entity expansion. This replaces the defusedxml dependency.
if expat.version_info < (2, 4, 1):
    raise SystemExit(f"expat {expat.version_info} is too old: 2.4.1 or newer is required")
_DOCTYPE = tuple("<!DOCTYPE".encode(codec) for codec in ("utf-8", "utf-16-le", "utf-16-be"))


def parse_xml(data: bytes) -> ElementTree.Element:
    if any(marker in data for marker in _DOCTYPE):
        raise ElementTree.ParseError("DOCTYPE is not allowed in an OOXML part")
    return ElementTree.fromstring(data)


REQUIRED_PARTS = {
    "docx": {
        "[Content_Types].xml",
        "_rels/.rels",
        "docProps/core.xml",
        "word/document.xml",
    },
    "pptx": {
        "[Content_Types].xml",
        "_rels/.rels",
        "docProps/core.xml",
        "ppt/presentation.xml",
    },
}


def fail(message: str) -> int:
    print(json.dumps({"valid": False, "error": message}))
    return 1


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in REQUIRED_PARTS:
        return fail("usage: validate_ooxml.py <docx|pptx> <artifact>")

    format_name, artifact = sys.argv[1:]
    try:
        with zipfile.ZipFile(artifact) as package:
            corrupt_part = package.testzip()
            if corrupt_part:
                return fail(f"ZIP integrity check failed for {corrupt_part}")

            parts = {entry.filename for entry in package.infolist() if not entry.is_dir()}
            missing = sorted(REQUIRED_PARTS[format_name] - parts)
            if missing:
                return fail(f"missing required OOXML parts: {', '.join(missing)}")

            for part in parts:
                path = PurePosixPath(part)
                if path.is_absolute() or ".." in path.parts:
                    return fail(f"unsafe package path: {part}")
                if part.endswith((".xml", ".rels")):
                    parse_xml(package.read(part))
    except (OSError, zipfile.BadZipFile, ElementTree.ParseError) as error:
        return fail(str(error))

    print(json.dumps({"valid": True, "format": format_name, "parts": len(parts)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
