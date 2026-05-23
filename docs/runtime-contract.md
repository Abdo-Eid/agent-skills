# Runtime Contract

This repository is not just a content store for skill source files. It is the deployment contract for sandbox execution.

## Sandbox Layout

Clone the repository into `/workspace` (the repo root becomes the workspace root):

```text
/workspace
```

The runtime should then expect this layout:

```text
/workspace/
  README.md
  registry/
    skills.json
  skills/
    pdf/
    pptx-generator/
    xlsx/
    docx/
    bi-dashboard/
```

## Resolution Rules

1. Clone the repo to `/workspace`.
2. Load `/workspace/registry/skills.json`.
3. Resolve the requested skill by `id`.
4. Use the skill's `path` and `entry` from the manifest.
5. Read `SKILL.md` from that entry path and follow it as the workflow source of truth.

## Runtime Compatibility

The platform should treat these fields as stable contract inputs:

- `registry/skills.json`
- each skill directory under `skills/`
- each skill's `SKILL.md`
- any build or CLI commands declared in the manifest

Avoid hardcoding skill paths or project names in downstream services. Resolve them from the manifest instead.

## Document Sandbox Template

When baking the document sandbox image, clone this repository into `/workspace`:

```bash
mkdir -p /workspace && git clone <your-private-repo-url> /workspace
```

That produces the expected runtime root at `/workspace`.

## Runtime Dependencies

`registry/skills.json` is the single source of truth for all skill runtime dependencies.
Do not maintain dependency lists anywhere else — consult the registry entry for each skill.

Each skill entry has a `runtime.dependencies` object with typed keys:
- `python` — pip packages required
- `node` — npm packages required (installed globally)
- `browser` — browser binaries required (e.g. `chromium` via Playwright)
- `system` — apt system packages required

The sandbox image must provide every listed dependency before the agent starts.
The agent must not run `npm install`, `pip install`, or any initialization after spawn.

## Runtime Clone Fallback

If the sandbox was not created from the pre-baked template, the runtime fallback should clone the same repository:

```bash
mkdir -p /workspace && git clone <your-private-repo-url> /workspace
```

After cloning:

1. load the manifest from `/workspace/registry/skills.json`
2. resolve the requested skill path
3. read `SKILL.md`
4. all dependencies must already be present — the agent must not install anything at runtime

## Downstream Resolution

Downstream code should resolve skill paths and dependencies from `registry/skills.json` only:

1. resolve skill path from `registry/skills.json`
2. resolve workflow entry from `entry`
3. resolve all dependencies from `runtime.dependencies` in the manifest
4. keep `/workspace` as the clone target so sandbox path expectations remain stable
