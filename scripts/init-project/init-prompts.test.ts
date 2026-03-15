import { describe, expect, it } from "@jest/globals"
import { __testables__ } from "./init-prompts.ts"

describe("init prompts helpers", () => {
  it("moves highlighted index with wrap-around", () => {
    expect(__testables__.moveCursorIndex(0, -1, 4)).toBe(3)
    expect(__testables__.moveCursorIndex(3, 1, 4)).toBe(0)
    expect(__testables__.moveCursorIndex(1, 1, 4)).toBe(2)
  })

  it("toggles selected values", () => {
    const initial = new Set(["lint", "test"])
    const removed = __testables__.toggleSelectedValue(initial, "lint")
    const added = __testables__.toggleSelectedValue(removed, "format")

    expect([...removed]).toEqual(["test"])
    expect([...added]).toEqual(["test", "format"])
  })

  it("selects all values from choices", () => {
    const choices = [
      { value: "claude", label: "Claude" },
      { value: "codex", label: "Codex" },
      { value: "gemini", label: "Gemini" },
    ] as const

    expect([...__testables__.selectAllValues(choices)]).toEqual([
      "claude",
      "codex",
      "gemini",
    ])
  })

  it("returns selected values in display order", () => {
    const choices = [
      { value: "claude", label: "Claude" },
      { value: "codex", label: "Codex" },
      { value: "gemini", label: "Gemini" },
    ] as const

    const selected = new Set(["gemini", "claude"])
    expect(__testables__.getSelectedValuesInOrder(choices, selected)).toEqual([
      "claude",
      "gemini",
    ])
  })

  it("maps selected features and skills", () => {
    expect(
      __testables__.toFeatureSelection(["lint", "test", "skills"])
    ).toEqual({
      enabledFeatures: {
        lint: true,
        format: false,
        typescript: false,
        test: true,
        husky: false,
      },
      skills: true,
    })
  })
})
