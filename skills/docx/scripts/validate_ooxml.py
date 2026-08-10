#!/usr/bin/env python3
# Copyright (c) 2026 Abdulhamed Samy Eid. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Proprietary
"""Validate the minimum OOXML package contract for DOCX and PPTX artifacts."""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import PurePosixPath

from defusedxml import ElementTree


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
                    ElementTree.fromstring(package.read(part))
    except (OSError, zipfile.BadZipFile, ElementTree.ParseError) as error:
        return fail(str(error))

    print(json.dumps({"valid": True, "format": format_name, "parts": len(parts)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
