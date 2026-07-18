import { describe, expect, it } from "@jest/globals"
import { parseArgs, resolveFeatureNames, resolveFeatures, resolveTestRunner } from "./cli.ts"
import type { FrameworkId } from "./types.ts"

describe("parseArgs", () => {
  it("parses the complete add command contract", () => {
    expect(
      parseArgs([
        "add",
        "test",
        "--dir=demo-app",
        "--framework",
        "react",
        "--formatter=oxfmt",
        "--test-runner",
        "vitest",
        "--force",
        "--dry-run",
        "--skip-husky-install",
      ])
    ).toEqual({
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

  it.each(["init", "setup", "list"] as const)("accepts %s with only global options", (command) => {
    const parsed = parseArgs([command, "--dry-run", "--help"])
    expect(parsed).toMatchObject({ command, dryRun: true, help: true })
  })

  it("defaults to init when the command is omitted", () => {
    expect(parseArgs([])).toMatchObject({
      command: "init",
      framework: null,
      formatter: "prettier",
      testRunner: null,
    })
  })

  it("allows add help without a target", () => {
    expect(parseArgs(["add", "--help"])).toMatchObject({
      command: "add",
      addTarget: null,
      help: true,
    })
  })

  it.each([
    [["add"], "Missing add target"],
    [["add", "lint", "extra"], "Unknown argument: extra"],
    [["add", "lint", "--framework", "angular"], "Unsupported framework: angular"],
    [["add", "format", "--formatter=biome"], "Unsupported formatter: biome"],
    [["add", "test", "--test-runner", "mocha"], "Unsupported test runner: mocha"],
    [["add", "lint", "--dir"], "Missing value for --dir"],
    [["add", "lint", "--framework="], "Missing value for --framework"],
    [["init", "--framework", "react"], "Unsupported option for init: --framework"],
    [["setup", "--force"], "Unsupported option for setup: --force"],
    [["add", "lint", "--pm", "npm"], "Unknown argument: --pm"],
    [["add", "format", "--no-format"], "Unknown argument: --no-format"],
  ] as const)("rejects invalid argv %#", (argv, message) => {
    expect(() => parseArgs([...argv])).toThrow(message)
  })
})

describe("feature resolution", () => {
  const allEnabled = {
    lint: true,
    format: true,
    typescript: true,
    test: true,
    husky: true,
  }

  it("enables all features when no explicit selection exists", () => {
    expect(resolveFeatures({ features: [] })).toEqual(allEnabled)
  })

  it("maps an explicit selection and deduplicates repeated values", () => {
    expect(resolveFeatureNames(["lint", "format", "lint"])).toEqual({
      lint: true,
      format: true,
      typescript: false,
      test: false,
      husky: false,
    })
  })
})

describe("resolveTestRunner", () => {
  it.each([
    ["vue", "vitest"],
    ["nuxt", "vitest"],
    ["node", "jest"],
    ["react", "jest"],
    ["next", "jest"],
    ["tanstack-start", "jest"],
    ["svelte", "jest"],
  ] as const)("defaults %s to %s", (framework, expected) => {
    expect(resolveTestRunner(framework, null)).toBe(expected)
  })

  it.each(["node", "react", "next", "tanstack-start", "vue", "svelte", "nuxt"] as const)(
    "honors an explicit override for %s",
    (framework: FrameworkId) => {
      expect(resolveTestRunner(framework, "vitest")).toBe("vitest")
      expect(resolveTestRunner(framework, "jest")).toBe("jest")
    }
  )
})
