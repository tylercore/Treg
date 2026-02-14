import { hasPackage } from "../../utils.mjs"

export const reactFramework = {
  id: "react",
  testEnvironment: "jsdom",
  tsRequiredExcludes: ["dist", "coverage", "jest.config.js", "public"],
  matches(packageJson) {
    return (
      hasPackage(packageJson, "react") || hasPackage(packageJson, "react-dom")
    )
  },
}
