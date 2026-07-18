import { describe, expect, it } from "@jest/globals"
import {
  getDefaultPackagePresetIds,
  getPackagePresets,
  getSelectedPackagePresets,
  resolvePackagePresetId,
} from "./packages.ts"

describe("framework package presets", () => {
  it("includes common packages for every framework", () => {
    const frameworks = ["node", "react", "next", "tanstack-start", "vue", "nuxt", "svelte"] as const
    for (const framework of frameworks) {
      const ids = getPackagePresets(framework).map((preset) => preset.id)
      expect(ids).toContain("zod")
      expect(ids).toContain("date-fns")
    }
  })

  it("uses backend-focused packages for node projects", () => {
    const ids = getPackagePresets("node").map((preset) => preset.id)
    expect(ids).toEqual(expect.arrayContaining(["express", "fastify", "dotenv", "pino", "prisma"]))
  })

  it("includes common React routing and state options", () => {
    const ids = getPackagePresets("react").map((preset) => preset.id)
    expect(ids).toEqual(
      expect.arrayContaining(["redux", "zustand", "react-router", "tanstack-router"])
    )
  })

  it("includes the TanStack suite for TanStack Start", () => {
    const ids = getPackagePresets("tanstack-start").map((preset) => preset.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "tanstack-query",
        "tanstack-router",
        "tanstack-form",
        "tanstack-store",
        "tanstack-table",
      ])
    )
  })

  it("installs clsx with Tailwind presets", () => {
    const frameworks = ["react", "next", "tanstack-start", "vue", "nuxt", "svelte"] as const
    for (const framework of frameworks) {
      expect(getSelectedPackagePresets(framework, ["tailwind"])[0]?.dependencies).toContain("clsx")
    }
  })

  it("uses framework-specific i18n packages", () => {
    expect(getSelectedPackagePresets("react", ["i18n"])[0]?.dependencies).toEqual([
      "i18next",
      "react-i18next",
    ])
    expect(getSelectedPackagePresets("next", ["i18n"])[0]?.dependencies).toEqual(["next-intl"])
    expect(getSelectedPackagePresets("vue", ["i18n"])[0]?.dependencies).toEqual(["vue-i18n"])
    expect(getSelectedPackagePresets("nuxt", ["i18n"])[0]?.dependencies).toEqual(["@nuxtjs/i18n"])
    expect(getSelectedPackagePresets("svelte", ["i18n"])[0]?.dependencies).toEqual(["svelte-i18n"])
  })

  it("resolves add targets by preset id and package name", () => {
    expect(resolvePackagePresetId("react", "zustand")).toBe("zustand")
    expect(resolvePackagePresetId("react", "zuzstand")).toBe("zustand")
    expect(resolvePackagePresetId("react", "@tanstack/react-query")).toBe("tanstack-query")
    expect(resolvePackagePresetId("tanstack-start", "@tanstack/react-form")).toBe("tanstack-form")
    expect(resolvePackagePresetId("vue", "pinia")).toBe("pinia")
    expect(resolvePackagePresetId("node", "zustand")).toBeNull()
  })

  it("defines framework default package sets", () => {
    expect(getDefaultPackagePresetIds("react")).toEqual(
      expect.arrayContaining(["zod", "date-fns", "zustand", "tanstack-router"])
    )
    expect(getDefaultPackagePresetIds("node")).toEqual(expect.arrayContaining(["zod", "dotenv"]))
    expect(getDefaultPackagePresetIds("tanstack-start")).toEqual([
      "zod",
      "date-fns",
      "tanstack-query",
      "tanstack-router",
      "tanstack-form",
      "tanstack-store",
    ])
  })
})
