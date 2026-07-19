/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  clearMocks: true,
  restoreMocks: true,
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "es2022",
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
}

module.exports = config
