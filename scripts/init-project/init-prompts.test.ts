import { writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it, jest } from "@jest/globals"
import { withTempProject } from "../test-utils.ts"
import { __testables__, collectInitPrompts, collectSetupPrompts } from "./init-prompts.ts"

const defaults = {
  frameworkId: "react" as const,
  pm: "pnpm" as const,
  formatter: "oxfmt" as const,
  testRunner: "jest" as const,
}

describe("init prompt selection helpers", () => {
  it("maps feature selection to the complete result shape", () => {
    expect(__testables__.toFeatureSelection(["lint", "test", "aiRules"])).toEqual({
      enabledFeatures: {
        lint: true,
        format: false,
        typescript: false,
        test: true,
        husky: false,
      },
      aiRules: true,
    })
    expect(__testables__.toFeatureSelection([])).toEqual({
      enabledFeatures: {
        lint: false,
        format: false,
        typescript: false,
        test: false,
        husky: false,
      },
      aiRules: false,
    })
  })

  it("uses skip as an exclusive AI tools opt-out", () => {
    expect(__testables__.resolveAiToolSelection(["claude", "codex", "gemini"])).toEqual({
      aiRules: true,
      aiTools: ["claude", "codex", "gemini"],
    })
    expect(__testables__.resolveAiToolSelection([])).toEqual({ aiRules: false, aiTools: [] })
    expect(__testables__.resolveAiToolSelection(["claude", "skip", "gemini"])).toEqual({
      aiRules: false,
      aiTools: [],
    })
  })

  it("selects only AI tools whose target documents already exist", async () => {
    await withTempProject(async (projectDir) => {
      await writeFile(path.join(projectDir, "AGENTS.md"), "")
      await writeFile(path.join(projectDir, "GEMINI.md"), "")
      expect(__testables__.resolveExistingAiTools(projectDir)).toEqual(["codex", "gemini"])
      expect(__testables__.resolveExistingAiTools(projectDir, ["claude"])).toEqual([])
    })
  })
})

describe("non-interactive prompt behavior", () => {
  it("uses init defaults including the framework package preset", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined)
    const result = await collectInitPrompts(defaults, false)

    expect(result).toMatchObject({
      pm: "pnpm",
      formatter: "oxfmt",
      testRunner: "jest",
      aiRules: true,
      aiTools: ["claude", "codex", "gemini"],
      enabledFeatures: {
        lint: true,
        format: true,
        typescript: true,
        test: true,
        husky: true,
      },
    })
    expect(result.selectedPackageIds).toEqual(
      expect.arrayContaining(["zod", "date-fns", "zustand", "tanstack-router"])
    )
  })

  it("uses setup defaults without selecting optional packages", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined)
    await expect(collectSetupPrompts(defaults, false)).resolves.toMatchObject({
      pm: "pnpm",
      formatter: "oxfmt",
      testRunner: "jest",
      selectedPackageIds: [],
    })
  })
})
