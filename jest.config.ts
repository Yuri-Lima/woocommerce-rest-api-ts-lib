/** @type {import('ts-jest').JestConfigWithTsJest} */
import type { Config } from "jest";
import os from "os";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  // nock interceptors are process-global; parallel workers race and drop mocks in CI.
  maxWorkers: 1,
  detectOpenHandles: false, // Detects when a test leaves something behind that it shouldn't
  testMatch: ["**/test/test.ts", "**/test/wc.test.ts", "**/test/*.test.ts"],
  testPathIgnorePatterns: ["node_modules", "dist"],
  coveragePathIgnorePatterns: ["node_modules", "dist"],
  collectCoverage: true,
  coverageProvider: "v8", // bypasses fragile test-exclude/istanbul that crashes on our module graph after refactor (ERR_INVALID_ARG_TYPE promisify on Object)
  collectCoverageFrom: [
    "src/index.ts",
    "src/utils/**/*.ts",
    "src/http/**/*.ts",
    "!src/types/**",
    "!src/test/**",
    "!**/*.d.ts",
    "!src/typesANDinterfaces.ts",
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
  coverageDirectory: "coverage",
  setupFiles: [
    "<rootDir>/setEnvVars.js", // Sets the environment variables
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
    }],
  },
  // Support ESM-style relative .js imports (required by our "module": "NodeNext" tsconfig) inside Jest/ts-jest
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
