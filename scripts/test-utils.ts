import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

export async function withTempProject<T>(run: (projectDir: string) => T | Promise<T>): Promise<T> {
  const projectDir = await mkdtemp(path.join(tmpdir(), "treg-test-"))

  try {
    return await run(projectDir)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}

export async function writeJson(projectDir: string, value: unknown): Promise<void> {
  await writeFile(path.join(projectDir, "package.json"), `${JSON.stringify(value, null, 2)}\n`)
}
