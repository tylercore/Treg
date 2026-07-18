import { describe, expect, it } from "@jest/globals"
import {
  getDefaultPackagePresetIds,
  getPackagePresets,
  getSelectedPackagePresets,
  resolvePackagePresetId,
} from "./packages.ts"
import type { FrameworkId } from "../types.ts"

const frameworks: readonly FrameworkId[] = [
  "node",
  "react",
  "next",
  "tanstack-start",
  "vue",
  "nuxt",
  "svelte",
]

describe("framework package preset registry", () => {
  it.each(frameworks)("defines unique, resolvable defaults for %s", (framework) => {
    const presets = getPackagePresets(framework)
    const ids = presets.map(({ id }) => id)
    const defaults = getDefaultPackagePresetIds(framework)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(["zod", "date-fns"]))
    expect(defaults.length).toBeGreaterThan(0)
    expect(defaults.every((id) => ids.includes(id))).toBe(true)
  })

  it.each([
    ["node", ["express", "fastify", "dotenv", "pino", "prisma"]],
    ["react", ["redux", "zustand", "react-router", "tanstack-router"]],
    [
      "tanstack-start",
      ["tanstack-query", "tanstack-router", "tanstack-form", "tanstack-store", "tanstack-table"],
    ],
  ] as const)("provides expected ecosystem choices for %s", (framework, expected) => {
    const ids = getPackagePresets(framework).map(({ id }) => id)
    expect(ids).toEqual(expect.arrayContaining([...expected]))
  })

  it("keeps TanStack Table optional in the TanStack Start default", () => {
    expect(getDefaultPackagePresetIds("tanstack-start")).toEqual([
      "zod",
      "date-fns",
      "tanstack-query",
      "tanstack-router",
      "tanstack-form",
      "tanstack-store",
    ])
    expect(getDefaultPackagePresetIds("tanstack-start")).not.toContain("tanstack-table")
  })

  it.each(["react", "next", "tanstack-start", "vue", "nuxt", "svelte"] as const)(
    "adds clsx to the %s Tailwind preset",
    (framework) => {
      expect(getSelectedPackagePresets(framework, ["tailwind"])[0]?.dependencies).toContain("clsx")
    }
  )

  it.each([
    ["react", ["i18next", "react-i18next"]],
    ["next", ["next-intl"]],
    ["vue", ["vue-i18n"]],
    ["nuxt", ["@nuxtjs/i18n"]],
    ["svelte", ["svelte-i18n"]],
  ] as const)("uses framework-specific i18n dependencies for %s", (framework, expected) => {
    expect(getSelectedPackagePresets(framework, ["i18n"])[0]?.dependencies).toEqual(expected)
  })

  it.each([
    ["react", "zustand", "zustand"],
    ["react", "zuzstand", "zustand"],
    ["react", "@tanstack/react-query", "tanstack-query"],
    ["tanstack-start", "@tanstack/react-form", "tanstack-form"],
    ["vue", "Pinia", "pinia"],
    ["node", "zustand", null],
  ] as const)("resolves %s target %s to %s", (framework, target, expected) => {
    expect(resolvePackagePresetId(framework, target)).toBe(expected)
  })
})
