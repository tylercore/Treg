import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "@jest/globals"
import { withTempProject, writeJson } from "../test-utils.ts"
import { __testables__, detectPackageManager } from "./package-manager.ts"

describe("detectPackageManager", () => {
  it.each([
    ["pnpm-lock.yaml", "pnpm"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ] as const)("detects %s", async (lockfile, expected) => {
    await withTempProject(async (projectDir) => {
      await writeFile(path.join(projectDir, lockfile), "")
      expect(detectPackageManager(projectDir)).toBe(expected)
    })
  })

  it("defaults to npm and honors the documented lockfile priority", async () => {
    await withTempProject(async (projectDir) => {
      expect(detectPackageManager(projectDir)).toBe("npm")

      for (const lockfile of ["package-lock.json", "yarn.lock", "bun.lock", "pnpm-lock.yaml"]) {
        await writeFile(path.join(projectDir, lockfile), "")
      }
      expect(detectPackageManager(projectDir)).toBe("pnpm")
    })
  })
})

describe("npm legacy peer dependency compatibility", () => {
  it.each([
    ["^5.9.3", true],
    ["~4.9.5", false],
    ["workspace:*", false],
  ] as const)("returns %s => %s for react-scripts projects", async (typescript, expected) => {
    await withTempProject(async (projectDir) => {
      await writeJson(projectDir, {
        devDependencies: { "react-scripts": "^5.0.1", typescript },
      })
      expect(__testables__.shouldUseNpmLegacyPeerDeps(projectDir)).toBe(expected)
    })
  })

  it("stays disabled without valid react-scripts package metadata", async () => {
    await withTempProject(async (projectDir) => {
      expect(__testables__.shouldUseNpmLegacyPeerDeps(projectDir)).toBe(false)
      await writeJson(projectDir, { devDependencies: { typescript: "^5.9.3" } })
      expect(__testables__.shouldUseNpmLegacyPeerDeps(projectDir)).toBe(false)
      await writeFile(path.join(projectDir, "package.json"), "invalid")
      expect(__testables__.shouldUseNpmLegacyPeerDeps(projectDir)).toBe(false)
    })
  })
})

describe("pnpm store mismatch guidance", () => {
  async function writeLinkedStore(projectDir: string, storeDir: string): Promise<void> {
    await mkdir(path.join(projectDir, "node_modules"), { recursive: true })
    await writeFile(
      path.join(projectDir, "node_modules", ".modules.yaml"),
      `layoutVersion: 5\nstoreDir: "${storeDir}"\n`
    )
  }

  it("reads quoted store metadata and reports only mismatches", async () => {
    await withTempProject(async (projectDir) => {
      const linkedStoreDir = "/Users/test/Library/pnpm/store/v10"
      await writeLinkedStore(projectDir, linkedStoreDir)

      expect(__testables__.readPnpmLinkedStoreDir(projectDir)).toBe(linkedStoreDir)
      expect(__testables__.getPnpmStoreMismatch(projectDir, linkedStoreDir)).toBeNull()
      expect(__testables__.getPnpmStoreMismatch(projectDir, "/store/v11")).toEqual({
        currentStoreDir: "/store/v11",
        linkedStoreDir,
      })
    })
  })

  it("treats missing or unreadable metadata as compatible", async () => {
    await withTempProject(async (projectDir) => {
      expect(__testables__.readPnpmLinkedStoreDir(projectDir)).toBeNull()
      expect(__testables__.getPnpmStoreMismatch(projectDir, "/store/v11")).toBeNull()
    })
  })

  it("provides a manual, non-destructive recovery command", () => {
    const message = __testables__.formatPnpmStoreMismatchMessage({
      currentStoreDir: "/store/v11",
      linkedStoreDir: "/store/v10",
    })
    expect(message).toContain("Treg will not remove node_modules automatically")
    expect(message).toContain("rm -rf node_modules")
    expect(message).toContain("pnpm install")
  })
})
