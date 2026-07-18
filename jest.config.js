/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  clearMocks: true,
  restoreMocks: true,
  transform: {
    "^.+\\.ts$": "<rootDir>/jest.transform.cjs",
  },
  testMatch: ["**/*.test.ts"],
}

module.exports = config
