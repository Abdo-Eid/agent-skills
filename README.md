# Agent Skills Registry

Private repository for sandbox-executed skills used by the platform's multi-agent system.

## Purpose

This repository is the internal source of truth for sandbox-executed runtime skills used by the platform.

Sandbox flows should resolve skills from this registry instead of cloning an external upstream at runtime.

## Initial Structure

- `skills/pdf/` - PDF generation and form-filling skill
- `skills/pptx-generator/` - PowerPoint generation skill
- `skills/xlsx/` - Spreadsheet creation and editing skill
- `skills/docx/` - Word document creation and formatting skill
- `registry/skills.json` - Initial manifest for active runtime skills
- `docs/runtime-contract.md` - Sandbox integration and deployment contract

## Notes

- This repository is private and proprietary.
- The first migration target is the set of document/runtime skills currently used in sandbox execution.
- `registry/skills.json` is the initial machine-readable manifest for active runtime skills.
- `docs/runtime-contract.md` documents the expected clone layout, manifest resolution flow, and `docx` prebuild contract.
