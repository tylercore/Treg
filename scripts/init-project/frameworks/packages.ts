import type { FrameworkId, PackagePreset, PackagePresetId } from "../types.ts"

import { commonPackagePresets } from "./common/packages.ts"
import { nextPackagePresets } from "./next/packages.ts"
import { nodePackagePresets } from "./node/packages.ts"
import { nuxtPackagePresets } from "./nuxt/packages.ts"
import { reactPackagePresets } from "./react/packages.ts"
import { sveltePackagePresets } from "./svelte/packages.ts"
import { tanstackStartPackagePresets } from "./tanstack-start/packages.ts"
import { vuePackagePresets } from "./vue/packages.ts"

const FRAMEWORK_PACKAGE_PRESETS: Record<FrameworkId, readonly PackagePreset[]> = {
  next: nextPackagePresets,
  node: nodePackagePresets,
  nuxt: nuxtPackagePresets,
  react: reactPackagePresets,
  svelte: sveltePackagePresets,
  "tanstack-start": tanstackStartPackagePresets,
  vue: vuePackagePresets,
}

export function getPackagePresets(frameworkId: FrameworkId): PackagePreset[] {
  return [...commonPackagePresets, ...FRAMEWORK_PACKAGE_PRESETS[frameworkId]]
}

const DEFAULT_PACKAGE_PRESET_IDS: Record<FrameworkId, readonly PackagePresetId[]> = {
  next: ["zod", "date-fns", "zustand", "tanstack-query"],
  node: ["zod", "dotenv", "pino"],
  nuxt: ["zod", "date-fns", "pinia", "tanstack-query", "vueuse"],
  react: ["zod", "date-fns", "zustand", "tanstack-query", "tanstack-router"],
  svelte: ["zod", "date-fns", "tanstack-query", "forms"],
  "tanstack-start": [
    "zod",
    "date-fns",
    "tanstack-query",
    "tanstack-router",
    "tanstack-form",
    "tanstack-store",
    "tanstack-table",
  ],
  vue: ["zod", "date-fns", "pinia", "tanstack-query", "vueuse"],
}

function normalizePackageTarget(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === "zuzstand") {
    return "zustand"
  }
  return normalized
}

export function getDefaultPackagePresetIds(frameworkId: FrameworkId): PackagePresetId[] {
  return [...DEFAULT_PACKAGE_PRESET_IDS[frameworkId]]
}

export function resolvePackagePresetId(
  frameworkId: FrameworkId,
  target: string
): PackagePresetId | null {
  const normalized = normalizePackageTarget(target)

  return (
    getPackagePresets(frameworkId).find((preset) => {
      const names = [
        preset.id,
        preset.label,
        ...(preset.dependencies ?? []),
        ...(preset.devDependencies ?? []),
      ]
      return names.some((name) => normalizePackageTarget(name) === normalized)
    })?.id ?? null
  )
}

export function getSelectedPackagePresets(
  frameworkId: FrameworkId,
  selectedIds: readonly PackagePresetId[]
): PackagePreset[] {
  const selected = new Set(selectedIds)
  return getPackagePresets(frameworkId).filter((preset) => selected.has(preset.id))
}
