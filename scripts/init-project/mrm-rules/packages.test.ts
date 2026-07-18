import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it, jest } from "@jest/globals"
import { withTempProject, writeJson } from "../../test-utils.ts"
import { __testables__, buildPackageInstallPlan } from "./packages.ts"

const preset = (
  id: "tailwind" | "zustand",
  dependencies: string[] = [],
  devDependencies: string[] = []
) => ({
  id,
  label: id,
  description: id,
  dependencies,
  devDependencies,
  aiRule: { prompt: id, when: id, checklist: [id] },
})

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath).then(
    () => true,
    () => false
  )
}

describe("packages rule", () => {
  it("builds a stable, deduplicated install plan by dependency type", () => {
    expect(
      buildPackageInstallPlan([
        preset("tailwind", ["clsx"], ["tailwindcss"]),
        preset("zustand", ["zustand", "clsx"], ["tailwindcss"]),
      ])
    ).toEqual({
      dependencies: ["clsx", "zustand"],
      devDependencies: ["tailwindcss"],
    })
  })

  it.each([
    ["tsconfig", true],
    ["dependency", true],
    ["devDependency", true],
    ["javascript", false],
  ] as const)("detects a %s project", async (fixture, expected) => {
    await withTempProject(async (projectDir) => {
      if (fixture === "tsconfig") await writeFile(path.join(projectDir, "tsconfig.json"), "{}")
      if (fixture === "dependency") {
        await writeJson(projectDir, { dependencies: { typescript: "^5" } })
      }
      if (fixture === "devDependency") {
        await writeJson(projectDir, { devDependencies: { typescript: "^5" } })
      }
      expect(__testables__.hasTypeScript(projectDir)).toBe(expected)
    })
  })

  it("chooses the existing lib convention and creates a matching cn helper", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      await mkdir(path.join(projectDir, "app", "lib"), { recursive: true })
      await writeFile(path.join(projectDir, "tsconfig.json"), "{}")

      expect(__testables__.resolveLibDir(projectDir)).toBe("app/lib")
      await __testables__.ensureCnHelper(projectDir, false, false)
      const target = path.join(projectDir, "app", "lib", "cn.ts")
      expect(await readFile(target, "utf8")).toContain("type ClassValue")

      await mkdir(path.join(projectDir, "lib"))
      expect(__testables__.resolveLibDir(projectDir)).toBe("lib")
    })
  })

  it("does not overwrite an existing helper and never writes during dry-run", async () => {
    await withTempProject(async (projectDir) => {
      jest.spyOn(console, "log").mockImplementation(() => undefined)
      const target = path.join(projectDir, "lib", "cn.js")
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, "custom\n")

      await __testables__.ensureCnHelper(projectDir, false, false)
      expect(await readFile(target, "utf8")).toBe("custom\n")

      await withTempProject(async (dryRunDir) => {
        await __testables__.ensureCnHelper(dryRunDir, false, true)
        expect(await fileExists(path.join(dryRunDir, "lib", "cn.js"))).toBe(false)
      })
    })
  })
})
