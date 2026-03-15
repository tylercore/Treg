#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ALLOWED_TARGETS = new Set([
  "patch",
  "minor",
  "major",
  "prepatch",
  "preminor",
  "premajor",
  "prerelease",
])
const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/

function run(
  command,
  args,
  { captureOutput = false, cwd = process.cwd() } = {}
) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    cwd,
  })

  if (result.status !== 0) {
    if (captureOutput && result.stderr) {
      process.stderr.write(result.stderr)
    }
    throw new Error(`Command failed: ${command} ${args.join(" ")}`)
  }

  return captureOutput ? result.stdout.trim() : ""
}

function commandStatus(command, args, cwd = process.cwd()) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd,
  }).status
}

function fail(message) {
  console.error(`[release] ${message}`)
  process.exit(1)
}

function printUsage() {
  console.log("Usage: pnpm release [patch|minor|major|pre*|x.y.z]")
  console.log("Example: pnpm release")
  console.log("Example: pnpm release minor")
}

function ensureMainBranch() {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    captureOutput: true,
  })
  if (branch !== "main") {
    fail(`Release is only allowed on main. Current branch: ${branch}`)
  }
}

function ensureCleanWorkingTree() {
  const status = run("git", ["status", "--porcelain"], {
    captureOutput: true,
  })
  if (status) {
    fail("Working tree must be clean before release.")
  }
}

function runCiValidation() {
  console.log("[release] Running CI validation steps")
  run("pnpm", ["format:check"])
  run("pnpm", ["lint:check"])
  run("pnpm", ["type:check"])
  run("pnpm", ["test"])
  run("pnpm", ["build"])

  const smokeDir = mkdtempSync(path.join(tmpdir(), "treg-release-ci-"))
  try {
    writeFileSync(
      path.join(smokeDir, "package.json"),
      '{ "name": "release-smoke", "version": "1.0.0" }\n',
      "utf8"
    )
    run("node", [
      "dist/init-project.js",
      "init",
      "--dir",
      smokeDir,
      "--framework",
      "node",
      "--dry-run",
    ])
  } finally {
    rmSync(smokeDir, { recursive: true, force: true })
  }
}

function bumpVersion(releaseTarget) {
  console.log(`[release] Bumping version with target: ${releaseTarget}`)
  run("npm", ["version", releaseTarget, "--no-git-tag-version"])
  return JSON.parse(readFileSync("package.json", "utf8")).version
}

function updateChangelog(version) {
  const changelogPath = "CHANGELOG.md"
  const heading = "# Changelog"
  const date = new Date().toISOString().slice(0, 10)
  const releaseTitle = `## v${version} - ${date}`
  const releaseBody = `- Release v${version}.`
  const section = `${releaseTitle}\n\n${releaseBody}\n`

  const current = existsSync(changelogPath)
    ? readFileSync(changelogPath, "utf8")
    : `${heading}\n\n`

  if (current.includes(`## v${version}`)) {
    fail(`CHANGELOG already contains release section for v${version}`)
  }

  const normalized = current.trim()
  const remainder = normalized.startsWith(heading)
    ? normalized.slice(heading.length).trim()
    : normalized

  const next = `${heading}\n\n${section}${remainder ? `\n${remainder}\n` : ""}`
  writeFileSync(changelogPath, next, "utf8")
  console.log(`[release] Updated ${changelogPath} with v${version}`)
}

function commitReleaseArtifacts(version) {
  run("git", ["add", "package.json", "CHANGELOG.md"])
  const staged = run("git", ["diff", "--cached", "--name-only"], {
    captureOutput: true,
  })
  if (!staged) {
    fail("No release artifacts staged for commit.")
  }
  run("git", ["commit", "-m", `chore(release): v${version}`])
}

function pushMain() {
  console.log("[release] Pushing release commit to origin/main")
  run("git", ["push", "origin", "main"])
}

function ensureTagNotExists(tagName) {
  if (
    commandStatus("git", [
      "rev-parse",
      "-q",
      "--verify",
      `refs/tags/${tagName}`,
    ]) === 0
  ) {
    fail(`Tag already exists locally: ${tagName}`)
  }

  const remoteTagStatus = commandStatus("git", [
    "ls-remote",
    "--exit-code",
    "--tags",
    "origin",
    `refs/tags/${tagName}`,
  ])
  if (remoteTagStatus === 0) {
    fail(`Tag already exists on origin: ${tagName}`)
  }
}

function checkoutReleaseBranch() {
  run("git", ["fetch", "origin"])
  const hasRemoteRelease =
    commandStatus("git", [
      "ls-remote",
      "--exit-code",
      "--heads",
      "origin",
      "release",
    ]) === 0
  const hasLocalRelease =
    commandStatus("git", [
      "show-ref",
      "--verify",
      "--quiet",
      "refs/heads/release",
    ]) === 0

  if (hasRemoteRelease) {
    if (hasLocalRelease) {
      run("git", ["checkout", "release"])
      run("git", ["pull", "--ff-only", "origin", "release"])
      return
    }
    run("git", ["checkout", "-b", "release", "origin/release"])
    return
  }

  if (hasLocalRelease) {
    run("git", ["checkout", "release"])
    return
  }

  run("git", ["checkout", "-b", "release"])
}

function mergeMainToReleaseAndTag(version) {
  const tagName = `v${version}`
  ensureTagNotExists(tagName)

  checkoutReleaseBranch()
  run("git", ["merge", "--no-ff", "--no-edit", "main"])

  console.log(`[release] Creating release tag ${tagName} on release branch`)
  run("git", ["tag", tagName])

  console.log("[release] Pushing release branch and tag")
  run("git", ["push", "origin", "release"])
  run("git", ["push", "origin", tagName])
}

const input = process.argv[2]
if (input === "--help" || input === "-h") {
  printUsage()
  process.exit(0)
}

const releaseTarget = input ?? "patch"
if (!ALLOWED_TARGETS.has(releaseTarget) && !EXACT_SEMVER.test(releaseTarget)) {
  printUsage()
  fail(`Invalid release target: ${releaseTarget}`)
}

ensureMainBranch()
ensureCleanWorkingTree()
runCiValidation()
ensureCleanWorkingTree()

const version = bumpVersion(releaseTarget)
updateChangelog(version)
commitReleaseArtifacts(version)
ensureCleanWorkingTree()
pushMain()
mergeMainToReleaseAndTag(version)
run("git", ["checkout", "main"])

console.log(
  `[release] Done: release commit created on main, merged to release, and tagged v${version}.`
)
