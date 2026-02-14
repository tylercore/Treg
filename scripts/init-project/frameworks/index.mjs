import { nodeFramework } from "./node/index.mjs"
import { reactFramework } from "./react/index.mjs"

const FRAMEWORK_REGISTRY = {
  node: nodeFramework,
  react: reactFramework,
}

const FRAMEWORK_DETECT_ORDER = [reactFramework, nodeFramework]

export function resolveFramework(frameworkArg, packageJson) {
  if (frameworkArg) {
    return FRAMEWORK_REGISTRY[frameworkArg]
  }
  return detectFramework(packageJson)
}

export function detectFramework(packageJson) {
  const matched = FRAMEWORK_DETECT_ORDER.find(framework =>
    framework.matches(packageJson)
  )
  return matched ?? nodeFramework
}
