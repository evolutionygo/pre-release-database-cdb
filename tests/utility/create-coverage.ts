import { LuaCoverageRegistry } from "ygopro-jstest";
import { logLuaCoverageSummary } from "./lua-coverage-summary";

export interface CreateCoverageOptions {
  scriptDir: string;
}

export const createCoverage = (
  options: CreateCoverageOptions,
): LuaCoverageRegistry => {
  const registry = new LuaCoverageRegistry();

  afterAll(() => {
    logLuaCoverageSummary(registry.getAllCoverages(), options.scriptDir);
  });

  return registry;
};
