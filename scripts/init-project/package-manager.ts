import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import type { PackageManager } from "./types.ts"

export function detectPackageManager(projectDir: string): PackageManager {
  if (existsSync(path.join(projectDir, "pnpm-lock.yaml"))) {
    return "pnpm"
  }
  if (
    existsSync(path.join(projectDir, "bun.lockb")) ||
    existsSync(path.join(projectDir, "bun.lock"))
  ) {
    return "bun"
  }
  if (existsSync(path.join(projectDir, "yarn.lock"))) {
    return "yarn"
  }
  if (existsSync(path.join(projectDir, "package-lock.json"))) {
    return "npm"
  }
  return "npm"
}

export function getRunCommand(pm: PackageManager): string {
  if (pm === "pnpm") return "pnpm"
  if (pm === "bun") return "bun run"
  if (pm === "yarn") return "yarn"
  return "npm run"
}

export function runCommand(command: string, cwd: string, dryRun = false): void {
  if (dryRun) {
    console.log(`[dry-run] Would run: ${command}`)
    return
  }
  execSync(command, { cwd, stdio: "inherit" })
}

export function runScript(
  pm: PackageManager,
  scriptName: string,
  cwd: string,
  dryRun = false
): void {
  if (pm === "pnpm") {
    runCommand(`pnpm ${scriptName}`, cwd, dryRun)
    return
  }
  if (pm === "bun") {
    runCommand(`bun run ${scriptName}`, cwd, dryRun)
    return
  }
  if (pm === "yarn") {
    runCommand(`yarn ${scriptName}`, cwd, dryRun)
    return
  }
  runCommand(`npm run ${scriptName}`, cwd, dryRun)
}

export function installPackages(
  pm: PackageManager,
  projectDir: string,
  packages: string[],
  isDev: boolean,
  dryRun = false
): void {
  if (packages.length === 0) return

  const list = packages.join(" ")
  let command = ""

  if (pm === "pnpm") {
    command = `pnpm add ${isDev ? "-D " : ""}${list}`
  } else if (pm === "bun") {
    command = `bun add ${isDev ? "-d " : ""}${list}`
  } else if (pm === "yarn") {
    command = `yarn add ${isDev ? "-D " : ""}${list}`
  } else {
    command = `npm install ${isDev ? "-D " : ""}${list}`
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Installing ${isDev ? "dev " : ""}dependencies: ${packages.join(", ")}`
  )
  runCommand(command, projectDir, dryRun)
}
