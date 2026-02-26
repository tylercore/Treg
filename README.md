# @tyyyho/treg

Treg is a CLI tool for initializing development conventions in existing projects.

It installs and configures tools and records clear usage guidelines as skills.

Treg helps both human developers and AI agents work within the same set of expectations, reducing configuration drift and long-term maintenance overhead.

## Usage

```bash
pnpm dlx @tyyyho/treg init <project-dir> --framework react
# or
npx @tyyyho/treg init <project-dir> --framework react
```

By default, all features are applied:

- `husky`
- `typescript`
- `lint`
- `format`
- `test`

## Options

```bash
npx @tyyyho/treg <command> [projectDir] [options]

init                                 Initialize infra rules (requires --framework)
add                                  Add selected infra features
list                                 List supported targets

--framework <node|react|next|vue|svelte|nuxt>
                                      Target framework
--framework-version <major>          Optional major version hint (currently react only)
--pm <pnpm|npm|yarn|auto>            Package manager (auto-detected by default)
--features <lint,format,typescript,test,husky>
                                      Features to install (all selected by default)
--test-runner <jest|vitest>          Test runner when test feature is enabled
--force                               Overwrite existing config files
--dry-run                             Show planned changes without writing files
--skip-husky-install                  Do not run husky install
--skills                              Update AGENTS.md/CLAUDE.md with feature skill guidance
--help                                Show help
```

## Examples

Initialize a React project:

```bash
npx @tyyyho/treg init . --framework react
```

Add only lint and format:

```bash
npx @tyyyho/treg add . --features lint,format
```

Use Vitest:

```bash
npx @tyyyho/treg init . --framework node --features test --test-runner vitest
```

Set framework major version explicitly (for variant rules):

```bash
npx @tyyyho/treg init . --framework react --framework-version 18
```

Preview changes only:

```bash
npx @tyyyho/treg init . --framework react --dry-run
```

Enable AI skill guidance update:

```bash
npx @tyyyho/treg add . --features lint,format,husky --skills
```

## Publish

```bash
pnpm install
pnpm run prepublishOnly
npm publish --access public
```
