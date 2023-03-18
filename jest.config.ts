/** @type {import('ts-jest').JestConfigWithTsJest} */
import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    testMatch: ["**/test/test.ts"],
    testPathIgnorePatterns: ["node_modules", "dist"],
    coveragePathIgnorePatterns: ["node_modules", "dist"],
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["json", "lcov", "text", "clover"],
    coverageDirectory: "coverage",
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
};

export default config;
