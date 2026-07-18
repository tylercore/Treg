import { describe, expect, it } from "@jest/globals"
import { parseArgs, resolveFeatures, resolveTestRunner } from "./cli.ts"

describe("parseArgs", () => {
  it("parses add command options", () => {
    const parsed = parseArgs([
      "add",
      "test",
      "--dir",
      "demo-app",
      "--framework",
      "react",
      "--formatter",
      "oxfmt",
      "--test-runner",
      "vitest",
      "--force",
      "--dry-run",
      "--skip-husky-install",
    ])

    expect(parsed).toEqual({
      command: "add",
      projectDir: "demo-app",
      framework: "react",
      addTarget: "test",
      formatter: "oxfmt",
      features: [],
      testRunner: "vitest",
      force: true,
      dryRun: true,
      skipHuskyInstall: true,
      aiRules: true,
      aiTools: ["claude", "codex", "gemini"],
      help: false,
    })
  })

  it("parses init with only dry-run", () => {
    const parsed = parseArgs(["init", "--dry-run"])
    expect(parsed.command).toBe("init")
    expect(parsed.dryRun).toBe(true)
    expect(parsed.features).toEqual([])
  })

  it("parses list command", () => {
    const parsed = parseArgs(["list"])
    expect(parsed.command).toBe("list")
    expect(parsed.formatter).toBe("prettier")
    expect(parsed.aiTools).toEqual(["claude", "codex", "gemini"])
  })

  it("allows init without options", () => {
    const parsed = parseArgs(["init"])
    expect(parsed.framework).toBeNull()
    expect(parsed.formatter).toBe("prettier")
    expect(parsed.testRunner).toBeNull()
  })

  it("allows setup without options", () => {
    const parsed = parseArgs(["setup"])
    expect(parsed.command).toBe("setup")
    expect(parsed.framework).toBeNull()
    expect(parsed.addTarget).toBeNull()
  })

  it("accepts oxfmt formatter override for add", () => {
    const parsed = parseArgs(["add", "format", "--formatter", "oxfmt"])
    expect(parsed.formatter).toBe("oxfmt")
  })

  it("throws for unsupported framework", () => {
    expect(() => parseArgs(["add", "lint", "--framework", "angular"])).toThrow(
      "Unsupported framework: angular"
    )
  })

  it("accepts TanStack Start as an explicit framework", () => {
    expect(parseArgs(["add", "tanstack-form", "--framework", "tanstack-start"]).framework).toBe(
      "tanstack-start"
    )
  })

  it("throws for unsupported formatter", () => {
    expect(() => parseArgs(["add", "format", "--formatter", "biome"])).toThrow(
      "Unsupported formatter: biome"
    )
  })

  it("parses positional add target", () => {
    expect(parseArgs(["add", "zustand"]).addTarget).toBe("zustand")
  })

  it("throws when add target is missing", () => {
    expect(() => parseArgs(["add"])).toThrow("Missing add target")
  })

  it("allows add help without a target", () => {
    const parsed = parseArgs(["add", "--help"])
    expect(parsed.command).toBe("add")
    expect(parsed.help).toBe(true)
    expect(parsed.addTarget).toBeNull()
  })

  it("throws when init receives removed flags", () => {
    expect(() => parseArgs(["init", "--framework", "react"])).toThrow(
      "Unsupported option for init: --framework"
    )
  })

  it("throws when add receives removed pm flag", () => {
    expect(() => parseArgs(["add", "lint", "--pm", "npm"])).toThrow("Unknown argument: --pm")
  })

  it("throws for removed no flags", () => {
    expect(() => parseArgs(["add", "format", "--no-format"])).toThrow(
      "Unknown argument: --no-format"
    )
    expect(() => parseArgs(["add", "test", "--no-test-runner"])).toThrow(
      "Unknown argument: --no-test-runner"
    )
  })
})

describe("resolveFeatures", () => {
  it("enables all features by default", () => {
    expect(resolveFeatures(parseArgs(["init"]))).toEqual({
      lint: true,
      format: true,
      typescript: true,
      test: true,
      husky: true,
    })
  })

  it("uses selected features", () => {
    expect(resolveFeatures({ features: ["lint", "format", "husky"] })).toEqual({
      lint: true,
      format: true,
      typescript: false,
      test: false,
      husky: true,
    })
  })
})

describe("resolveTestRunner", () => {
  it("defaults vue and nuxt to vitest", () => {
    expect(resolveTestRunner("vue", null)).toBe("vitest")
    expect(resolveTestRunner("nuxt", null)).toBe("vitest")
  })

  it("defaults other frameworks to jest", () => {
    expect(resolveTestRunner("node", null)).toBe("jest")
    expect(resolveTestRunner("react", null)).toBe("jest")
    expect(resolveTestRunner("next", null)).toBe("jest")
    expect(resolveTestRunner("tanstack-start", null)).toBe("jest")
    expect(resolveTestRunner("svelte", null)).toBe("jest")
  })

  it("allows each framework to override with --test-runner", () => {
    const frameworks = ["node", "react", "next", "tanstack-start", "vue", "svelte", "nuxt"] as const
    for (const framework of frameworks) {
      expect(resolveTestRunner(framework, "jest")).toBe("jest")
      expect(resolveTestRunner(framework, "vitest")).toBe("vitest")
    }
  })
})
