import { access, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it, jest } from "@jest/globals"
import { withTempProject } from "../../test-utils.ts"
import type { RuleContext } from "../types.ts"
import { __testables__, runAiRulesRule } from "./ai-rules.ts"

const disabledFeatures = {
  lint: false,
  format: false,
  typescript: false,
  test: false,
  husky: false,
}

function createContext(projectDir: string, overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    command: "add",
    projectDir,
    framework: { id: "node", testEnvironment: "node", tsRequiredExcludes: [] },
    formatter: "prettier",
    addTarget: null,
    features: [],
    testRunner: "jest",
    pm: "pnpm",
    force: false,
    dryRun: false,
    skipHuskyInstall: false,
    aiRules: true,
    aiTools: ["claude", "codex", "gemini"],
    help: false,
    selectedPackageIds: [],
    enabledFeatures: disabledFeatures,
    ...overrides,
  }
}

async function seedDocs(projectDir: string, docs: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(docs).map(([fileName, content]) =>
      writeFile(path.join(projectDir, fileName), content)
    )
  )
}

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath).then(
    () => true,
    () => false
  )
}

describe("AI rule section serialization", () => {
  it("serializes enabled feature and git policies without legacy skill references", () => {
    const content = __testables__.buildRuleSection({
      enabledFeatures: { ...disabledFeatures, lint: true, format: true, test: true },
      testRunner: "vitest",
    })

    expect(content).toContain("### Git rules")
    expect(content).toContain("Never use --no-verify")
    expect(content).toContain("Branch names must use `<type>/<summary-kebab-case>`")
    expect(content).toContain("### Validation Rules and Checklist")
    expect(content).toContain("1. Formatting")
    expect(content).toContain("2. Lint Validation")
    expect(content).toContain("3. Test Configuration")
    expect(content).toContain("Current test runner: `vitest`")
    expect(content).not.toMatch(/skills\/|SKILL\.md/)
  })

  it("round-trips selected package guidance", () => {
    const framework = { id: "react", testEnvironment: "jsdom", tsRequiredExcludes: [] } as const
    const content = __testables__.buildRuleSection({
      framework,
      selectedPackageIds: ["tailwind", "zustand", "tanstack-query"],
      enabledFeatures: disabledFeatures,
      testRunner: "jest",
    })

    expect(content).toContain("### Package Rules and Checklist")
    expect(content).toContain("1. Tailwind CSS")
    expect(content).toContain("2. Zustand")
    expect(content).toContain("3. TanStack Query")
    expect(__testables__.readPackageIdsFromRuleSection(content, framework)).toEqual([
      "tailwind",
      "tanstack-query",
      "zustand",
    ])
  })

  it("appends a managed section without deleting user or legacy content", () => {
    const original = "# Header\n\n## Treg AI Skills\n\nlegacy\n\n## Other\n\nkeep"
    const result = __testables__.upsertRuleSection(original, "### Git rules\n\nnew")

    expect(result).toContain("# Header")
    expect(result).toContain("legacy")
    expect(result).toContain("## Other\n\nkeep")
    expect(result).toContain("### Git rules\n\nnew")
  })
})

describe("AI rule document resolution", () => {
  it.each([
    [
      { "AGENTS.md": "# Agents\n", "CLAUDE.md": "# Claude\n", "GEMINI.md": "# Gemini\n" },
      [
        ["AGENTS.md", "rules"],
        ["CLAUDE.md", "rules"],
        ["GEMINI.md", "rules"],
      ],
    ],
    [{ "GEMINI.md": "# Gemini\n" }, [["GEMINI.md", "rules"]]],
    [{ "GEMINI.md": "@AGENTS.md\n" }, [["AGENTS.md", "rules"]]],
    [
      { "AGENTS.md": "# Agents\n", "CLAUDE.md": "# Claude\n", "GEMINI.md": "@AGENTS.md\n" },
      [
        ["AGENTS.md", "rules"],
        ["CLAUDE.md", "rules"],
      ],
    ],
    [
      {},
      [
        ["AGENTS.md", "rules"],
        ["CLAUDE.md", "agentsReference"],
        ["GEMINI.md", "agentsReference"],
      ],
    ],
  ] as const)("resolves document topology %#", async (docs, expected) => {
    await withTempProject(async (projectDir) => {
      await seedDocs(projectDir, docs)
      const resolved = await __testables__.resolveAiRulesDocs(projectDir)
      expect(resolved.map(({ filePath, mode }) => [path.basename(filePath), mode])).toEqual(
        expected
      )
    })
  })
})

describe("AI rules filesystem behavior", () => {
  it("updates existing independent documents with direct guidance", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await seedDocs(projectDir, {
        "AGENTS.md": "# Agents\n",
        "CLAUDE.md": "# Claude\n",
        "GEMINI.md": "# Gemini\n",
      })

      await runAiRulesRule(
        createContext(projectDir, {
          enabledFeatures: { ...disabledFeatures, lint: true },
        })
      )

      for (const fileName of ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]) {
        const content = await readFile(path.join(projectDir, fileName), "utf8")
        expect(content).toContain("### Git rules")
        expect(content).toContain("Prompt: Run and validate lint rule.")
      }
      expect(await fileExists(path.join(projectDir, "skills"))).toBe(false)
    })
  })

  it("updates AGENTS and independent docs but preserves delegating docs", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await seedDocs(projectDir, {
        "AGENTS.md": "# Agents\n",
        "CLAUDE.md": "# Claude\n",
        "GEMINI.md": "@AGENTS.md\n",
      })

      await runAiRulesRule(
        createContext(projectDir, { enabledFeatures: { ...disabledFeatures, lint: true } })
      )

      expect(await readFile(path.join(projectDir, "AGENTS.md"), "utf8")).toContain("### Git rules")
      expect(await readFile(path.join(projectDir, "CLAUDE.md"), "utf8")).toContain("### Git rules")
      expect(await readFile(path.join(projectDir, "GEMINI.md"), "utf8")).toBe("@AGENTS.md\n")
    })
  })

  it("creates the canonical three-document topology when none exist", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await runAiRulesRule(
        createContext(projectDir, { enabledFeatures: { ...disabledFeatures, lint: true } })
      )

      expect(await readFile(path.join(projectDir, "AGENTS.md"), "utf8")).toContain("### Git rules")
      expect(await readFile(path.join(projectDir, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n")
      expect(await readFile(path.join(projectDir, "GEMINI.md"), "utf8")).toBe("@AGENTS.md\n")
    })
  })

  it("updates only existing docs and remains idempotent", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await seedDocs(projectDir, { "GEMINI.md": "# Gemini\n" })
      const context = createContext(projectDir, {
        command: "init",
        enabledFeatures: { ...disabledFeatures, lint: true },
      })

      await runAiRulesRule(context)
      const firstRun = await readFile(path.join(projectDir, "GEMINI.md"), "utf8")
      await runAiRulesRule(context)

      expect(await readFile(path.join(projectDir, "GEMINI.md"), "utf8")).toBe(firstRun)
      expect(await fileExists(path.join(projectDir, "AGENTS.md"))).toBe(false)
      expect(await fileExists(path.join(projectDir, "CLAUDE.md"))).toBe(false)
    })
  })

  it("merges sequential add guidance instead of erasing earlier features", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await seedDocs(projectDir, { "AGENTS.md": "# Agents\n" })

      await runAiRulesRule(
        createContext(projectDir, {
          features: ["test"],
          enabledFeatures: { ...disabledFeatures, test: true },
        })
      )
      await runAiRulesRule(
        createContext(projectDir, {
          features: ["format"],
          testRunner: "vitest",
          enabledFeatures: { ...disabledFeatures, format: true },
        })
      )

      const content = await readFile(path.join(projectDir, "AGENTS.md"), "utf8")
      expect(content).toContain("1. Formatting")
      expect(content).toContain("2. Test Configuration")
      expect(content).toContain("Current test runner: `jest`")
    })
  })
})
