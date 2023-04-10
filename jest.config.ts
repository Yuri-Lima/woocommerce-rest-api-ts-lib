/** @type {import('ts-jest').JestConfigWithTsJest} */
import type { Config } from "jest";
import os from 'os';

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    maxWorkers: (os.cpus().length - 1)/2, // 50% of the available cores
    detectOpenHandles: false, // Detects when a test leaves something behind that it shouldn't
    testMatch: ["**/test/test.ts", "**/test/wc.test.ts"],
    testPathIgnorePatterns: ["node_modules", "dist"],
    coveragePathIgnorePatterns: ["node_modules", "dist"],
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["json", "lcov", "text", "clover"],
    coverageDirectory: "coverage",
    setupFiles: [
        "<rootDir>/setEnvVars.js"// Sets the environment variables
    ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    
};

export default config;
