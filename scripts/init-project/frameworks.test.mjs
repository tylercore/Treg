import { describe, expect, it } from "@jest/globals"
import { detectFramework, resolveFramework } from "./frameworks/index.mjs"

describe("frameworks", () => {
  it("detects react from dependencies", () => {
    expect(detectFramework({ dependencies: { react: "19.0.0" } }).id).toBe(
      "react"
    )
  })

  it("falls back to node", () => {
    expect(detectFramework({ dependencies: {} }).id).toBe("node")
  })

  it("resolves explicit framework", () => {
    expect(
      resolveFramework("node", { dependencies: { react: "19.0.0" } }).id
    ).toBe("node")
  })
})
