import { existsSync } from "node:fs"
import path from "node:path"
import { stdin as input, stdout as output } from "node:process"
import type {
  AiTool,
  EnabledFeatures,
  FeatureName,
  Formatter,
  FrameworkId,
  PackageManager,
  PackagePresetId,
  TestRunner,
} from "./types.ts"
import { getDefaultPackagePresetIds, getPackagePresets } from "./frameworks/packages.ts"

const DEFAULT_AI_TOOLS: readonly AiTool[] = ["claude", "codex", "gemini"]
const AI_TOOL_DOCS: Record<AiTool, string> = {
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
  gemini: "GEMINI.md",
}

type InitPromptFeature = FeatureName | "aiRules"
type AiToolChoice = AiTool | "skip"
type PackageInstallChoice = "yes" | "no"
type ClackPrompts = typeof import("@clack/prompts")

interface Choice<T extends string> {
  value: T
  label: string
}

interface InitFeatureSelection {
  enabledFeatures: EnabledFeatures
  aiRules: boolean
}

export interface InitPromptResult {
  pm: PackageManager
  formatter: Formatter
  testRunner: TestRunner
  enabledFeatures: EnabledFeatures
  aiRules: boolean
  aiTools: AiTool[]
  selectedPackageIds: PackagePresetId[]
}

interface InitPromptDefaults {
  frameworkId: FrameworkId
  pm: PackageManager
  formatter: Formatter
  testRunner: TestRunner
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

const AI_TOOL_CHOICES: readonly Choice<AiToolChoice>[] = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "gemini", label: "Gemini" },
  { value: "skip", label: "skip (disable AI rules guidance)" },
]

const PACKAGE_INSTALL_CHOICES: readonly Choice<PackageInstallChoice>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

const FEATURE_CHOICES: readonly Choice<InitPromptFeature>[] = [
  { value: "lint", label: "lint" },
  { value: "format", label: "format" },
  { value: "typescript", label: "TypeScript" },
  { value: "test", label: "test" },
  { value: "husky", label: "husky" },
  { value: "aiRules", label: "AI rules guidance" },
]

let promptsModulePromise: Promise<ClackPrompts> | null = null

function toFeatureSelection(selected: readonly InitPromptFeature[]): InitFeatureSelection {
  return {
    enabledFeatures: {
      lint: selected.includes("lint"),
      format: selected.includes("format"),
      typescript: selected.includes("typescript"),
      test: selected.includes("test"),
      husky: selected.includes("husky"),
    },
    aiRules: selected.includes("aiRules"),
  }
}

function mapChoiceOptions<T extends string>(choices: readonly Choice<T>[]) {
  return choices.map((choice) => ({ value: choice, label: choice.label }))
}

function unwrapPromptResult<T>(
  value: T | symbol,
  prompts: Pick<ClackPrompts, "cancel" | "isCancel">
): T {
  if (prompts.isCancel(value)) {
    prompts.cancel("Prompt cancelled by user")
    throw new Error("Prompt cancelled by user")
  }

  return value as T
}

async function getPrompts(): Promise<ClackPrompts> {
  if (!promptsModulePromise) {
    promptsModulePromise = import("@clack/prompts")
  }

  return promptsModulePromise
}

async function promptSingleChoice<T extends string>(
  message: string,
  choices: readonly Choice<T>[],
  defaultValue: T
): Promise<T> {
  const prompts = await getPrompts()
  const defaultChoice = choices.find((choice) => choice.value === defaultValue)
  const options = {
    message,
    options: mapChoiceOptions(choices),
  }

  const result = await prompts.select<Choice<T>>(
    defaultChoice ? { ...options, initialValue: defaultChoice } : options
  )

  return unwrapPromptResult(result, prompts).value
}

function resolveAiToolSelection(selected: readonly AiToolChoice[]): {
  aiRules: boolean
  aiTools: AiTool[]
} {
  if (selected.includes("skip")) {
    return {
      aiRules: false,
      aiTools: [],
    }
  }

  return {
    aiRules: selected.length > 0,
    aiTools: selected as AiTool[],
  }
}

function resolveExistingAiTools(
  projectDir: string,
  aiTools: readonly AiTool[] = DEFAULT_AI_TOOLS
): AiTool[] {
  return aiTools.filter((tool) => existsSync(path.join(projectDir, AI_TOOL_DOCS[tool])))
}

async function promptMultiChoice<T extends string>(
  message: string,
  choices: readonly Choice<T>[],
  defaultValues: readonly T[],
  required = false
): Promise<T[]> {
  const prompts = await getPrompts()

  const result = await prompts.multiselect<Choice<T>>({
    message,
    options: mapChoiceOptions(choices),
    initialValues: choices.filter((choice) => defaultValues.includes(choice.value)),
    required,
  })

  return unwrapPromptResult(result, prompts).map((choice) => choice.value)
}

function getDefaultEnabledFeatures(): EnabledFeatures {
  return {
    lint: true,
    format: true,
    typescript: true,
    test: true,
    husky: true,
  }
}

export async function collectInitPrompts(
  defaults: InitPromptDefaults,
  interactive = Boolean(input.isTTY && output.isTTY)
): Promise<InitPromptResult> {
  const defaultPackageIds = getDefaultPackagePresetIds(defaults.frameworkId)
  let selectedPackageIds: PackagePresetId[] = []

  if (!interactive) {
    console.log("Non-interactive shell detected. Use init defaults.")
    selectedPackageIds = defaultPackageIds
  } else {
    console.log("\nInit setup")
    const shouldInstallPackages = await promptSingleChoice(
      "1) Install default packages",
      PACKAGE_INSTALL_CHOICES,
      "yes"
    )
    selectedPackageIds = shouldInstallPackages === "yes" ? defaultPackageIds : []
  }

  return {
    pm: defaults.pm,
    formatter: defaults.formatter,
    testRunner: defaults.testRunner,
    enabledFeatures: getDefaultEnabledFeatures(),
    aiRules: true,
    aiTools: [...DEFAULT_AI_TOOLS],
    selectedPackageIds,
  }
}

export async function collectSetupPrompts(
  defaults: InitPromptDefaults,
  interactive = Boolean(input.isTTY && output.isTTY)
): Promise<InitPromptResult> {
  if (!interactive) {
    console.log("Non-interactive shell detected. Use setup defaults.")
    return {
      pm: defaults.pm,
      formatter: defaults.formatter,
      testRunner: defaults.testRunner,
      enabledFeatures: getDefaultEnabledFeatures(),
      aiRules: true,
      aiTools: [...DEFAULT_AI_TOOLS],
      selectedPackageIds: [],
    }
  }

  console.log("\nSetup")

  const pm = await promptSingleChoice("1) Package manager", PACKAGE_MANAGER_CHOICES, defaults.pm)

  const featureAnswers = await promptMultiChoice(
    "2) Features",
    FEATURE_CHOICES,
    FEATURE_CHOICES.map((choice) => choice.value)
  )
  const featureSelection = toFeatureSelection(featureAnswers)

  let testRunner = defaults.testRunner
  const enabledFeatures = { ...featureSelection.enabledFeatures }

  if (featureSelection.enabledFeatures.test) {
    const selectedTestRunner = await promptSingleChoice(
      "3) Test runner",
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
    console.log("3) Test runner skipped (test feature not selected)")
  }

  let formatter = defaults.formatter
  if (featureSelection.enabledFeatures.format) {
    formatter = await promptSingleChoice("4) Formatter", FORMATTER_CHOICES, defaults.formatter)
  } else {
    console.log("4) Formatter skipped (format feature not selected)")
  }

  let aiTools: AiTool[] = []
  let aiRules = featureSelection.aiRules

  if (aiRules) {
    const aiToolAnswers = await promptMultiChoice(
      "5) AI tools (Space to select, A to toggle all)",
      AI_TOOL_CHOICES,
      [],
      true
    )
    const aiToolSelection = resolveAiToolSelection(aiToolAnswers)
    aiRules = aiToolSelection.aiRules
    aiTools = aiToolSelection.aiTools
    if (!aiRules) {
      console.log("AI rules guidance disabled by selection: skip")
    }
  } else {
    console.log("5) AI tools skipped (AI rules guidance not selected)")
  }

  let selectedPackageIds: PackagePresetId[] = []
  const shouldInstallPackages = await promptSingleChoice(
    "6) Install packages",
    PACKAGE_INSTALL_CHOICES,
    "yes"
  )
  if (shouldInstallPackages === "yes") {
    const packageChoices = getPackagePresets(defaults.frameworkId).map((preset) => ({
      value: preset.id,
      label: `${preset.label} - ${preset.description}`,
    }))
    selectedPackageIds = await promptMultiChoice("7) Packages", packageChoices, [])
  } else {
    console.log("7) Packages skipped")
  }

  return {
    pm,
    formatter,
    testRunner,
    enabledFeatures,
    aiRules,
    aiTools,
    selectedPackageIds,
  }
}

export const __testables__ = {
  resolveExistingAiTools,
  toFeatureSelection,
  resolveAiToolSelection,
}
