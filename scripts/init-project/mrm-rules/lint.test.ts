import { access, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it, jest } from "@jest/globals"
import { withTempProject } from "../../test-utils.ts"
import {
  DEFAULT_ESLINT_CONFIG,
  ensureEslintConfig,
  findExistingEslintConfig,
} from "./lint-config.ts"

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath).then(
    () => true,
    () => false
  )
}

describe("eslint config rule", () => {
  it.each(["eslint.config.js", "eslint.config.ts", ".eslintrc", ".eslintrc.json"])(
    "detects existing %s",
    async (fileName) => {
      await withTempProject(async (projectDir) => {
        await writeFile(path.join(projectDir, fileName), "")
        expect(findExistingEslintConfig(projectDir)).toBe(fileName)
      })
    }
  )

  it("creates the default config once without overwriting existing configuration", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      const configPath = path.join(projectDir, "eslint.config.mjs")

      await ensureEslintConfig(projectDir, false)
      expect(await readFile(configPath, "utf8")).toBe(DEFAULT_ESLINT_CONFIG)

      await writeFile(configPath, 'export default ["custom"]\n')
      await ensureEslintConfig(projectDir, false)
      expect(await readFile(configPath, "utf8")).toBe('export default ["custom"]\n')
    })
  })

  it("reports dry-run intent without writing", async () => {
    await withTempProject(async (projectDir) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => undefined)
      await ensureEslintConfig(projectDir, true)

      expect(await fileExists(path.join(projectDir, "eslint.config.mjs"))).toBe(false)
      expect(log).toHaveBeenCalledWith("[dry-run] Would create eslint.config.mjs")
    })
  })
})
