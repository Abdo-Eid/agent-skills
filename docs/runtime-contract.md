# Runtime Contract

This repository is not just a content store for skill source files. It is the deployment contract for sandbox execution.

## Sandbox Layout

Clone the repository into:

```text
/workspace/skills
```

The runtime should then expect this layout:

```text
/workspace/skills/
  README.md
  registry/skills.json
  skills/
    pdf/
    pptx-generator/
    xlsx/
    docx/
```

This preserves the existing nested path shape used by the sandbox flow: skill directories still live under `/workspace/skills/skills/...`.

## Resolution Rules

1. Clone the repo to `/workspace/skills`.
2. Load `/workspace/skills/registry/skills.json`.
3. Resolve the requested skill by `id`.
4. Use the skill's `path` and `entry` from the manifest.
5. Read `SKILL.md` from that entry path and follow it as the workflow source of truth.

## Runtime Compatibility

The platform should treat these fields as stable contract inputs:

- `registry/skills.json`
- each skill directory under `skills/`
- each skill's `SKILL.md`
- any build or CLI commands declared in the manifest

Avoid hardcoding old skill paths or project names in downstream services. Resolve them from the manifest instead.

## Document Sandbox Template

When baking the document sandbox image, clone this repository instead of any external upstream source.

Recommended clone step:

```bash
mkdir -p /workspace && cd /workspace && git clone <your-private-repo-url> skills
```

That produces the expected runtime root at `/workspace/skills`.

## Prebuild Step For `docx`

The `docx` skill contains a .NET CLI that should be restored and built during template creation to avoid runtime compile latency.

Working directory:

```text
/workspace/skills/skills/docx/scripts/dotnet
```

Commands:

```bash
dotnet restore DocxSkill.slnx
dotnet build DocxSkill.slnx --no-restore
```

Runtime CLI entry:

```bash
dotnet run --project scripts/dotnet/DocxSkill.Cli --
```

## Runtime Clone Fallback

If the sandbox was not created from the pre-baked template, the runtime fallback should clone the same repository into the same target path:

```bash
mkdir -p /workspace && cd /workspace && git clone <your-private-repo-url> skills
```

After cloning:

1. load the manifest
2. resolve the requested skill path
3. read `SKILL.md`
4. install any missing dependencies only if the template did not already provide them
5. for `docx`, restore/build the .NET solution if the prebuilt artifacts are not present

## Recommended Downstream Changes

Downstream code should stop depending on hardcoded skill folder names and hardcoded CLI project paths.

Instead:

1. resolve skill path from `registry/skills.json`
2. resolve workflow entry from `entry`
3. resolve `docx` build and CLI commands from the manifest
4. keep `/workspace/skills` as the clone target so sandbox path expectations remain stable
