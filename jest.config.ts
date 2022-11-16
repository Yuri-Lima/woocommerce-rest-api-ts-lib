/** @type {import('ts-jest').JestConfigWithTsJest} */
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
};

export default config;
