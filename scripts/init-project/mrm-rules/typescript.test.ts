import { describe, expect, it } from "@jest/globals"
import {
  isSolutionStyleTsconfig,
  mergeCompilerOptions,
  normalizeTypesValue,
  resolveTsconfigTargets,
  shouldIncludeNodeTypes,
} from "./typescript-options.ts"

describe("TypeScript compiler option policy", () => {
  it("enforces strict options without discarding unrelated settings", () => {
    expect(
      mergeCompilerOptions({ strict: false, noImplicitAny: false, module: "NodeNext" }, false)
    ).toMatchObject({
      strict: true,
      noImplicitAny: true,
      noUnusedLocals: true,
      module: "NodeNext",
    })
  })

  it.each([
    [undefined, ["node"]],
    [
      ["vite/client", "jest"],
      ["vite/client", "jest", "node"],
    ],
    [
      ["node", "vite/client"],
      ["node", "vite/client"],
    ],
    ["invalid", ["node"]],
  ])("normalizes node types from %p", (types, expected) => {
    expect(mergeCompilerOptions({ types }, true).types).toEqual(expected)
  })

  it("leaves existing types untouched when node types are not required", () => {
    expect(mergeCompilerOptions({ types: ["vite/client", "jest"] }, false).types).toEqual([
      "vite/client",
      "jest",
    ])
    expect(mergeCompilerOptions({}, false)).not.toHaveProperty("types")
  })

  it("filters invalid entries from array-shaped types", () => {
    expect(normalizeTypesValue(["node", 1, null, "vite/client"])).toEqual(["node", "vite/client"])
  })

  it.each([
    ["node", true],
    ["next", false],
    ["nuxt", false],
    ["react", false],
    ["vue", false],
    ["svelte", false],
    ["tanstack-start", false],
  ] as const)("node types for %s are %s", (framework, expected) => {
    expect(shouldIncludeNodeTypes(framework)).toBe(expected)
  })
})

describe("TypeScript config target resolution", () => {
  it("recognizes only empty-files configs with valid references as solution style", () => {
    expect(isSolutionStyleTsconfig([], [{ path: "./tsconfig.app.json" }])).toBe(true)
    expect(isSolutionStyleTsconfig(undefined, [{ path: "./tsconfig.app.json" }])).toBe(false)
    expect(isSolutionStyleTsconfig([], [{ notPath: "./tsconfig.app.json" }])).toBe(false)
    expect(isSolutionStyleTsconfig([], [])).toBe(false)
  })

  it.each([
    ["node", true],
    ["vue", false],
  ] as const)("uses the root config for regular %s projects", (framework, includeNodeTypes) => {
    expect(resolveTsconfigTargets(framework, undefined, undefined)).toEqual([
      { path: "tsconfig.json", includeNodeTypes },
    ])
  })

  it("selects and deduplicates only node/app references", () => {
    expect(
      resolveTsconfigTargets(
        "vue",
        [],
        [
          { path: ".\\tsconfig.node.json" },
          { path: "./tsconfig.app.json" },
          { path: "./tsconfig.app.json" },
          { path: "./tsconfig.vitest.json" },
        ]
      )
    ).toEqual([
      { path: ".\\tsconfig.node.json", includeNodeTypes: true },
      { path: "./tsconfig.app.json", includeNodeTypes: false },
    ])
  })

  it("returns no targets when references contain no supported config", () => {
    expect(resolveTsconfigTargets("vue", [], [{ path: "./tsconfig.vitest.json" }])).toEqual([])
  })
})
