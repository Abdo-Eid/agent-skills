# Agent Skills

Agent Skills is a collection of specialized skills for creating professional documents, spreadsheets, and presentations.

## Included Skills

| Skill | Description |
|---|---|
| [Artifact taste](skills/artifact-taste) | Read before any document skill: how to arrive at a design from the subject instead of the default template, with a reference per format, a dealer that sets each document's look, and a page preview tool. |
| [PDF](skills/pdf) | Creates polished, print-ready reports, proposals, guides, and papers. |
| [PPTX](skills/pptx) | Creates editable PowerPoint presentations with structured narratives and professional layouts. |
| [XLSX](skills/xlsx) | Creates polished formula-driven workbooks, analyzes spreadsheet data, and continues generated workbooks through durable source. |
| [DOCX](skills/docx) | Creates professional, editable Word documents with reusable styles and structured content. |

## Repository Structure

Each directory under `skills/` contains a `SKILL.md` entry point with instructions for that capability. Skills may also include focused references, helper scripts, templates, or scaffolds.

The complete skill catalog and output formats are listed in [`registry/skills.json`](registry/skills.json).

## Host Paths

Repository paths are relative and do not assume a particular container or installation directory. A consuming host supplies:

- `<skills-root>`: the directory containing all installed skill directories, such as `<skills-root>/xlsx` and `<skills-root>/pdf`.
- `<project-root>`: the writable directory owned by the active task or project.

Hosts may expose the shared skills root as `AGENT_SKILLS_ROOT`. A skill must not infer the writable project from the process working directory.

## Dependencies

Dependencies are provided by the consuming host. See [`DEPENDENCIES.md`](DEPENDENCIES.md) for per-skill setup and [`registry/dependencies.json`](registry/dependencies.json) for the machine-readable manifest.

## License

The first-party portions are proprietary and owned by Abdulhamed Samy Eid. Zynda.ai has permission from the owner to use them; this permission does not transfer ownership or grant public reuse rights. See `LICENSE` for the proprietary terms and `THIRD_PARTY_NOTICES.md` for exceptions.

The public repository permits viewing and forking through GitHub's functionality, but it does not grant a general reuse license for proprietary files. External contributions are not accepted without a separate written agreement.
