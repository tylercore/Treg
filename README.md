# @tyyyho/treg

`treg` is a CLI for quickly setting up project tooling conventions in an existing repository.
It applies infra setup such as lint, format, TypeScript, test, husky, and AI skill guidance.

## Quick Start

```bash
pnpm dlx @tyyyho/treg init <project-dir> --framework react
# or
npx @tyyyho/treg init <project-dir> --framework react
```

`init` requires `--framework`.

## Commands

```bash
npx @tyyyho/treg <command> [projectDir] [options]
```

- `init`: Initialize infra rules (requires `--framework`)
- `add`: Add selected infra features to an existing project
- `list`: List supported frameworks, features, and test runners

## Options

- `--framework <node|react|next|vue|svelte|nuxt>`: Target framework
- `--framework-version <major>`: Optional major version hint (react only)
- `--features <lint,format,typescript,test,husky>`: Features to install (defaults to all)
- `--test-runner <jest|vitest>`: Test runner when test feature is enabled
- `--pm <pnpm|npm|yarn|auto>`: Package manager (auto-detected by default)
- `--force`: Overwrite existing config files
- `--dry-run`: Print full plan without writing files
- `--skip-husky-install`: Skip husky install command
- `--skills`: Update existing `AGENTS.md`/`CLAUDE.md` with skill guidance
- `--help`: Show help

## Features

Default feature set:

- `husky`
- `typescript`
- `lint`
- `format`
- `test`

## Examples

Initialize a React project:

```bash
npx @tyyyho/treg init . --framework react
```

Add only lint + format:

```bash
npx @tyyyho/treg add . --features lint,format
```

Use Vitest for test feature:

```bash
npx @tyyyho/treg init . --framework node --features test --test-runner vitest
```

Use react major version variant:

```bash
npx @tyyyho/treg init . --framework react --framework-version 18
```

Preview changes only:

```bash
npx @tyyyho/treg init . --framework react --dry-run
```

Update AI skill guidance:

```bash
npx @tyyyho/treg add . --features lint,format,husky --skills
```

## Notes

- `init` requires `--framework`.
- `add` lets you install only the features you specify.
- `--dry-run` prints the full plan and does not write files.
