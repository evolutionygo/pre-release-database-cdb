import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  addLuaCoverageSummary,
  LuaLineCoverage,
  LuaLineCoverageMap,
} from "ygopro-jstest";

interface LuaCoverageReportEntry {
  coverage: LuaLineCoverage;
  sourceLines: string[];
}

const addSourceSummaries = (
  coverages: LuaLineCoverageMap,
  scriptDir: string,
): LuaCoverageReportEntry[] => {
  return Object.values(coverages).map((coverage) => {
    const sourcePath = resolve(scriptDir, coverage.file);
    if (!existsSync(sourcePath)) {
      return { coverage, sourceLines: [] };
    }

    const source = readFileSync(sourcePath);
    const sourceLines = source.toString("utf-8").split(/\r?\n/);
    return {
      coverage:
        coverage.lineCoverage == null
          ? addLuaCoverageSummary(coverage, source)
          : coverage,
      sourceLines,
    };
  });
};

const formatLine = (line: number, sourceLines: string[]) => {
  const source = sourceLines[line - 1]?.trim();
  return source ? `L${line}: ${source}` : `L${line}`;
};

const formatLineList = (lines: number[], sourceLines: string[]) => {
  if (!lines.length) {
    return "    none";
  }

  return lines.map((line) => `    ${formatLine(line, sourceLines)}`).join("\n");
};

export const formatLuaCoverageSummary = (
  coverages: LuaLineCoverageMap,
  scriptDir: string,
): string => {
  return addSourceSummaries(coverages, scriptDir)
    .filter(({ coverage }) => /^c\d+\.lua$/.test(coverage.file))
    .sort((left, right) =>
      left.coverage.file.localeCompare(right.coverage.file),
    )
    .map(({ coverage, sourceLines }) => {
      const executableLines = coverage.executableLines ?? [];
      const executable = executableLines.length;
      const uncoveredLines = coverage.uncoveredLines ?? [];
      const coveredExecutable = executable - uncoveredLines.length;
      const executableLineSet = new Set(executableLines);
      const hookOnlyLines = coverage.coveredLines.filter(
        (line) => !executableLineSet.has(line),
      );
      const ratio =
        coverage.lineCoverage == null
          ? "n/a"
          : `${(coverage.lineCoverage * 100).toFixed(1)}%`;

      return [
        `${coverage.file}: ${coveredExecutable}/${executable} executable lines covered (${ratio}), rawHits=${coverage.coveredLines.length}, hookOnly=${hookOnlyLines.length}`,
        "  missing executable lines:",
        formatLineList(uncoveredLines, sourceLines),
        "  hook-only hit lines (Lua line hook hit, but parser does not count as executable):",
        formatLineList(hookOnlyLines, sourceLines),
      ].join("\n");
    })
    .join("\n\n");
};

export const logLuaCoverageSummary = (
  coverages: LuaLineCoverageMap,
  scriptDir: string,
): void => {
  console.log(
    `[Lua coverage]\n${formatLuaCoverageSummary(coverages, scriptDir)}`,
  );
};
