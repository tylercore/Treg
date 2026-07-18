import { writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "@jest/globals"
import { withTempProject, writeJson } from "../../test-utils.ts"
import { filterUninstalledPackages } from "./shared.ts"

describe("filterUninstalledPackages", () => {
  it("returns the input unchanged when package metadata is unavailable", async () => {
    await withTempProject(async (projectDir) => {
      expect(filterUninstalledPackages(projectDir, [])).toEqual([])
      expect(filterUninstalledPackages(projectDir, ["eslint", "jest"])).toEqual(["eslint", "jest"])

      await writeFile(path.join(projectDir, "package.json"), "not json")
      expect(filterUninstalledPackages(projectDir, ["eslint"])).toEqual(["eslint"])
    })
  })

  it("filters declarations from every dependency group", async () => {
    await withTempProject(async (projectDir) => {
      await writeJson(projectDir, {
        dependencies: { react: "^19.0.0" },
        devDependencies: { eslint: "^9.0.0" },
        peerDependencies: { typescript: "^5.0.0" },
        optionalDependencies: { prettier: "^3.0.0" },
      })

      expect(
        filterUninstalledPackages(projectDir, [
          "react",
          "eslint",
          "typescript",
          "prettier",
          "vitest",
        ])
      ).toEqual(["vitest"])
    })
  })

  it.each([
    ["@testing-library/jest-dom", "@testing-library/jest-dom@^6.6.3"],
    ["eslint-plugin-react", "eslint-plugin-react@^7.37.5"],
  ])("recognizes installed %s from a versioned spec", async (installed, requested) => {
    await withTempProject(async (projectDir) => {
      await writeJson(projectDir, { devDependencies: { [installed]: "latest" } })
      expect(filterUninstalledPackages(projectDir, [requested, "vitest@^3.2.4"])).toEqual([
        "vitest@^3.2.4",
      ])
    })
  })
})
