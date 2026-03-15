import { stdin as input, stdout as output } from "node:process"
import {
  clearScreenDown,
  cursorTo,
  emitKeypressEvents,
  moveCursor as moveTerminalCursor,
} from "node:readline"
import type { Key } from "node:readline"
import type {
  AiTool,
  EnabledFeatures,
  FeatureName,
  Formatter,
  PackageManager,
  TestRunner,
} from "./types.ts"

const DEFAULT_AI_TOOLS: readonly AiTool[] = ["claude", "codex", "gemini"]

type InitPromptFeature = FeatureName | "skills"

interface Choice<T extends string> {
  value: T
  label: string
}

interface InitFeatureSelection {
  enabledFeatures: EnabledFeatures
  skills: boolean
}

export interface InitPromptResult {
  pm: PackageManager
  formatter: Formatter
  testRunner: TestRunner
  enabledFeatures: EnabledFeatures
  skills: boolean
  aiTools: AiTool[]
}

interface InitPromptDefaults {
  pm: PackageManager
  formatter: Formatter
  testRunner: TestRunner
}

interface MultiSelectOptions<T extends string> {
  defaultValues: readonly T[]
  allowSelectAll?: boolean
}

const PACKAGE_MANAGER_CHOICES: readonly Choice<PackageManager>[] = [
  { value: "pnpm", label: "pnpm" },
  { value: "npm", label: "npm" },
  { value: "yarn", label: "yarn" },
  { value: "bun", label: "bun" },
]

type TestRunnerChoice = TestRunner | "skip"

const TEST_RUNNER_CHOICES: readonly Choice<TestRunnerChoice>[] = [
  { value: "jest", label: "jest" },
  { value: "vitest", label: "vitest" },
  { value: "skip", label: "skip (disable test feature)" },
]

const FORMATTER_CHOICES: readonly Choice<Formatter>[] = [
  { value: "prettier", label: "prettier" },
  { value: "oxfmt", label: "oxfmt" },
]

const AI_TOOL_CHOICES: readonly Choice<AiTool>[] = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "gemini", label: "Gemini" },
]

const FEATURE_CHOICES: readonly Choice<InitPromptFeature>[] = [
  { value: "lint", label: "lint" },
  { value: "format", label: "format" },
  { value: "typescript", label: "TypeScript" },
  { value: "test", label: "test" },
  { value: "husky", label: "husky" },
  { value: "skills", label: "AI skill guidance" },
]

function moveCursorIndex(
  currentIndex: number,
  delta: number,
  size: number
): number {
  if (size <= 0) {
    return 0
  }

  return (currentIndex + delta + size) % size
}

function toggleSelectedValue<T extends string>(
  selectedValues: ReadonlySet<T>,
  value: T
): Set<T> {
  const next = new Set(selectedValues)
  if (next.has(value)) {
    next.delete(value)
    return next
  }
  next.add(value)
  return next
}

function selectAllValues<T extends string>(
  choices: readonly Choice<T>[]
): Set<T> {
  return new Set(choices.map(choice => choice.value))
}

function getSelectedValuesInOrder<T extends string>(
  choices: readonly Choice<T>[],
  selectedValues: ReadonlySet<T>
): T[] {
  return choices
    .filter(choice => selectedValues.has(choice.value))
    .map(choice => choice.value)
}

function toFeatureSelection(
  selected: readonly InitPromptFeature[]
): InitFeatureSelection {
  return {
    enabledFeatures: {
      lint: selected.includes("lint"),
      format: selected.includes("format"),
      typescript: selected.includes("typescript"),
      test: selected.includes("test"),
      husky: selected.includes("husky"),
    },
    skills: selected.includes("skills"),
  }
}

function renderFrame(
  lines: readonly string[],
  previousLineCount: number
): number {
  if (previousLineCount > 0) {
    moveTerminalCursor(output, 0, -previousLineCount)
    cursorTo(output, 0)
    clearScreenDown(output)
  }

  output.write(lines.join("\n"))
  output.write("\n")
  return lines.length
}

function isConfirmKey(key: Key): boolean {
  return key.name === "return" || key.name === "enter"
}

function isSelectAllKey(key: Key): boolean {
  return key.name === "a" && !key.ctrl && !key.meta
}

function ensureRawMode(): () => void {
  emitKeypressEvents(input)
  input.setRawMode(true)
  input.resume()
  output.write("\x1b[?25l")

  return () => {
    input.setRawMode(false)
    output.write("\x1b[?25h")
  }
}

function buildSingleSelectLines<T extends string>(
  title: string,
  choices: readonly Choice<T>[],
  highlightedIndex: number
): string[] {
  return [
    title,
    ...choices.map((choice, index) => {
      const cursor = index === highlightedIndex ? ">" : " "
      return `${cursor} ${choice.label}`
    }),
    "Use up/down arrows to move, Enter to confirm.",
  ]
}

function buildMultiSelectLines<T extends string>(
  title: string,
  choices: readonly Choice<T>[],
  selectedValues: ReadonlySet<T>,
  highlightedIndex: number,
  allowSelectAll: boolean
): string[] {
  const controls = allowSelectAll
    ? "Use up/down arrows to move, Space to toggle, A to select all, Enter to confirm."
    : "Use up/down arrows to move, Space to toggle, Enter to confirm."

  return [
    title,
    ...choices.map((choice, index) => {
      const cursor = index === highlightedIndex ? ">" : " "
      const mark = selectedValues.has(choice.value) ? "x" : " "
      return `${cursor} [${mark}] ${choice.label}`
    }),
    controls,
  ]
}

async function promptSingleChoice<T extends string>(
  title: string,
  choices: readonly Choice<T>[],
  defaultValue: T
): Promise<T> {
  const defaultIndex = choices.findIndex(
    choice => choice.value === defaultValue
  )
  let highlightedIndex = defaultIndex >= 0 ? defaultIndex : 0
  let renderedLineCount = 0

  const restore = ensureRawMode()

  try {
    renderedLineCount = renderFrame(
      buildSingleSelectLines(title, choices, highlightedIndex),
      renderedLineCount
    )

    return await new Promise<T>((resolve, reject) => {
      let settled = false

      const onKeypress = (_: string, key: Key): void => {
        if (key.ctrl && key.name === "c") {
          if (settled) {
            return
          }
          settled = true
          cleanup()
          reject(new Error("Prompt cancelled by user"))
          return
        }

        if (key.name === "up") {
          highlightedIndex = moveCursorIndex(
            highlightedIndex,
            -1,
            choices.length
          )
          renderedLineCount = renderFrame(
            buildSingleSelectLines(title, choices, highlightedIndex),
            renderedLineCount
          )
          return
        }

        if (key.name === "down") {
          highlightedIndex = moveCursorIndex(
            highlightedIndex,
            1,
            choices.length
          )
          renderedLineCount = renderFrame(
            buildSingleSelectLines(title, choices, highlightedIndex),
            renderedLineCount
          )
          return
        }

        if (isConfirmKey(key)) {
          const selected = choices[highlightedIndex]
          if (selected) {
            if (settled) {
              return
            }
            settled = true
            cleanup()
            resolve(selected.value)
          }
        }
      }

      const cleanup = (): void => {
        input.off("keypress", onKeypress)
      }

      input.on("keypress", onKeypress)
    })
  } finally {
    restore()
    output.write("\n")
  }
}

async function promptMultiChoice<T extends string>(
  title: string,
  choices: readonly Choice<T>[],
  options: MultiSelectOptions<T>
): Promise<T[]> {
  let highlightedIndex = 0
  let selectedValues = new Set(options.defaultValues)
  let renderedLineCount = 0
  const allowSelectAll = options.allowSelectAll ?? false

  const restore = ensureRawMode()

  try {
    renderedLineCount = renderFrame(
      buildMultiSelectLines(
        title,
        choices,
        selectedValues,
        highlightedIndex,
        allowSelectAll
      ),
      renderedLineCount
    )

    return await new Promise<T[]>((resolve, reject) => {
      let settled = false

      const onKeypress = (_: string, key: Key): void => {
        if (key.ctrl && key.name === "c") {
          if (settled) {
            return
          }
          settled = true
          cleanup()
          reject(new Error("Prompt cancelled by user"))
          return
        }

        if (key.name === "up") {
          highlightedIndex = moveCursorIndex(
            highlightedIndex,
            -1,
            choices.length
          )
          renderedLineCount = renderFrame(
            buildMultiSelectLines(
              title,
              choices,
              selectedValues,
              highlightedIndex,
              allowSelectAll
            ),
            renderedLineCount
          )
          return
        }

        if (key.name === "down") {
          highlightedIndex = moveCursorIndex(
            highlightedIndex,
            1,
            choices.length
          )
          renderedLineCount = renderFrame(
            buildMultiSelectLines(
              title,
              choices,
              selectedValues,
              highlightedIndex,
              allowSelectAll
            ),
            renderedLineCount
          )
          return
        }

        if (key.name === "space") {
          const highlighted = choices[highlightedIndex]
          if (!highlighted) {
            return
          }

          selectedValues = toggleSelectedValue(
            selectedValues,
            highlighted.value
          )
          renderedLineCount = renderFrame(
            buildMultiSelectLines(
              title,
              choices,
              selectedValues,
              highlightedIndex,
              allowSelectAll
            ),
            renderedLineCount
          )
          return
        }

        if (allowSelectAll && isSelectAllKey(key)) {
          selectedValues = selectAllValues(choices)
          renderedLineCount = renderFrame(
            buildMultiSelectLines(
              title,
              choices,
              selectedValues,
              highlightedIndex,
              allowSelectAll
            ),
            renderedLineCount
          )
          return
        }

        if (isConfirmKey(key)) {
          if (settled) {
            return
          }
          settled = true
          cleanup()
          resolve(getSelectedValuesInOrder(choices, selectedValues))
        }
      }

      const cleanup = (): void => {
        input.off("keypress", onKeypress)
      }

      input.on("keypress", onKeypress)
    })
  } finally {
    restore()
    output.write("\n")
  }
}

export async function collectInitPrompts(
  defaults: InitPromptDefaults
): Promise<InitPromptResult> {
  if (!input.isTTY || !output.isTTY) {
    console.log("Non-interactive shell detected. Use init defaults.")
    return {
      pm: defaults.pm,
      formatter: defaults.formatter,
      testRunner: defaults.testRunner,
      enabledFeatures: {
        lint: true,
        format: true,
        typescript: true,
        test: true,
        husky: true,
      },
      skills: true,
      aiTools: [...DEFAULT_AI_TOOLS],
    }
  }

  console.log("\nInit setup")

  console.log("\n1) Package manager")
  const pm = await promptSingleChoice(
    "Select package manager:",
    PACKAGE_MANAGER_CHOICES,
    defaults.pm
  )

  console.log("\n2) Features")
  const featureAnswers = await promptMultiChoice(
    "Select features:",
    FEATURE_CHOICES,
    {
      defaultValues: FEATURE_CHOICES.map(choice => choice.value),
      allowSelectAll: true,
    }
  )
  const featureSelection = toFeatureSelection(featureAnswers)

  let testRunner = defaults.testRunner
  const enabledFeatures = { ...featureSelection.enabledFeatures }

  if (featureSelection.enabledFeatures.test) {
    console.log("\n3) Test runner")
    const selectedTestRunner = await promptSingleChoice(
      "Select test runner:",
      TEST_RUNNER_CHOICES,
      defaults.testRunner
    )

    if (selectedTestRunner === "skip") {
      enabledFeatures.test = false
      console.log("Test feature disabled by selection: skip")
    } else {
      testRunner = selectedTestRunner
    }
  } else {
    console.log("\n3) Test runner skipped (test feature not selected)")
  }

  let formatter = defaults.formatter
  if (featureSelection.enabledFeatures.format) {
    console.log("\n4) Formatter")
    formatter = await promptSingleChoice(
      "Select formatter:",
      FORMATTER_CHOICES,
      defaults.formatter
    )
  } else {
    console.log("\n4) Formatter skipped (format feature not selected)")
  }

  let aiTools: AiTool[] = []
  let skills = featureSelection.skills

  if (skills) {
    console.log("\n5) AI tools")
    aiTools = await promptMultiChoice("Select AI tools:", AI_TOOL_CHOICES, {
      defaultValues: DEFAULT_AI_TOOLS,
      allowSelectAll: true,
    })
    if (aiTools.length === 0) {
      skills = false
    }
  } else {
    console.log("\n5) AI tools skipped (AI skill guidance not selected)")
  }

  return {
    pm,
    formatter,
    testRunner,
    enabledFeatures,
    skills,
    aiTools,
  }
}

export const __testables__ = {
  moveCursorIndex,
  toggleSelectedValue,
  selectAllValues,
  getSelectedValuesInOrder,
  toFeatureSelection,
}
