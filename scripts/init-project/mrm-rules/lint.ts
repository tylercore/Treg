import { packageJson } from "../mrm-core.ts"
import { installPackages, withProjectCwd } from "./shared.ts"
import { ensureEslintConfig } from "./lint-config.ts"
import type { RuleContext } from "../types.ts"

export async function runLintRule(context: RuleContext): Promise<void> {
  const { projectDir, pm, dryRun } = context
  installPackages(projectDir, pm, ["eslint"], true, dryRun)
  await ensureEslintConfig(projectDir, dryRun)

  withProjectCwd(projectDir, () => {
    if (dryRun) {
      console.log("[dry-run] Would set package scripts: lint, lint:check")
      return
    }
    packageJson()
      .setScript("lint", "eslint .")
      .setScript("lint:check", "eslint . --max-warnings 0")
      .save()
  })
}
