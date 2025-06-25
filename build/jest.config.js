"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const config = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    maxWorkers: (os_1.default.cpus().length - 1) / 2,
    detectOpenHandles: false,
    testMatch: ["**/test/test.ts", "**/test/wc.test.ts"],
    testPathIgnorePatterns: ["node_modules", "dist"],
    coveragePathIgnorePatterns: ["node_modules", "dist"],
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["json", "lcov", "text", "clover"],
    coverageDirectory: "coverage",
    setupFiles: [
        "<rootDir>/setEnvVars.js",
    ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
};
exports.default = config;
