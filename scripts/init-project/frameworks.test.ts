import { describe, expect, it } from "@jest/globals"
import { detectFramework, resolveFramework } from "./frameworks/index.ts"
import type { FrameworkId, PackageJson } from "./types.ts"

describe("framework resolution", () => {
  it.each([
    ["nuxt", { dependencies: { nuxt: "4" } }],
    ["next", { dependencies: { next: "15" } }],
    ["tanstack-start", { devDependencies: { "@tanstack/react-start": "1" } }],
    ["react", { dependencies: { react: "19" } }],
    ["vue", { dependencies: { vue: "3" } }],
    ["svelte", { dependencies: { svelte: "5" } }],
    ["node", { dependencies: {} }],
  ] as const)("detects %s", (expected, packageJson) => {
    expect(detectFramework(packageJson).id).toBe(expected)
  })

  it("uses the documented priority when multiple frameworks are declared", () => {
    const dependencies = {
      nuxt: "4",
      next: "15",
      "@tanstack/react-start": "1",
      react: "19",
      vue: "3",
      svelte: "5",
    }

    const expectedOrder: FrameworkId[] = [
      "nuxt",
      "next",
      "tanstack-start",
      "react",
      "vue",
      "svelte",
      "node",
    ]
    for (const expected of expectedOrder) {
      expect(detectFramework({ dependencies }).id).toBe(expected)
      const packageName = expected === "tanstack-start" ? "@tanstack/react-start" : expected
      delete dependencies[packageName as keyof typeof dependencies]
    }
  })

  it.each(["node", "react", "next", "tanstack-start", "vue", "svelte", "nuxt"] as const)(
    "honors an explicit %s override",
    (framework: FrameworkId) => {
      const packageJson: PackageJson = { dependencies: { nuxt: "4" } }
      expect(resolveFramework(framework, packageJson).id).toBe(framework)
    }
  )

  it("delegates to detection when no override is supplied", () => {
    expect(resolveFramework(null, { dependencies: { react: "19" } }).id).toBe("react")
  })
})
