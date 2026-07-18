import { hasPackage } from "../../utils.ts"
import type { DetectableFramework, PackageJson } from "../../types.ts"

export const tanstackStartFramework: DetectableFramework = {
  id: "tanstack-start",
  testEnvironment: "jsdom",
  tsRequiredExcludes: [".output", ".tanstack", "dist", "coverage", "public"],
  matches(packageJson: PackageJson) {
    return hasPackage(packageJson, "@tanstack/react-start")
  },
}
