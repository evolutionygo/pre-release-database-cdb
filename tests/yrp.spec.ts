import { existsSync, readdirSync } from "node:fs";
import { createTest } from "./utility/create-test";
import { MsgSnapshot, toYrpInfo, YrpInfo } from "./utility/yrp-info";
import yaml from "js-yaml";
import path from "node:path";
import fs from "node:fs";

describe("YRP", () => {
  const yrpDirPath = path.resolve(process.cwd(), "tests", "yrp");
  const listYrpFiles = (dirPath: string, basePath: string): string[] => {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...listYrpFiles(entryPath, basePath));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".yrp")) {
        results.push(path.relative(basePath, entryPath));
      }
    }
    return results;
  };

  const yrpFiles = listYrpFiles(yrpDirPath, yrpDirPath).sort();
  for (const yrpRelativePath of yrpFiles) {
    const testName = `YRP: ${yrpRelativePath}`;
    it(testName, async () => {
      const yrpPath = path.resolve(yrpDirPath, yrpRelativePath);
      await createTest({ yrp: yrpPath }, async (test) => {
        const yrpInfoPath = path.resolve(
          process.cwd(),
          "tests",
          "yrp-info",
          yrpRelativePath.replace(/\.yrp$/i, ".yaml"),
        );
        const currentInfo = toYrpInfo(test);
        const hasYrpInfo = existsSync(yrpInfoPath);
        console.log(
          `Testing YRP: ${yrpRelativePath}\nYRP info yaml: ${hasYrpInfo ? "available" : "none"}\n${currentInfo.snapshotText}`,
        );
        if (hasYrpInfo) {
          // do further tests
          const expectedInfo = (await yaml.load(
            await fs.promises.readFile(yrpInfoPath, "utf-8"),
          )) as YrpInfo;
          expect(currentInfo.snapshot.lp).toEqual(expectedInfo.snapshot.lp);
          expect(currentInfo.snapshot.chains).toEqual(
            expectedInfo.snapshot.chains,
          );
          expect(currentInfo.snapshot.cards).toEqual(
            expectedInfo.snapshot.cards,
          );
          const sortMesssages = (messages: MsgSnapshot[]) =>
            messages
              .filter((m) => !m.msg.includes("Hint"))
              .map((m) => {
                // go through all properties and prune every desc
                const pruneDesc = <T>(obj: T, visited = new Set<any>()): T => {
                  if (typeof obj !== "object" || obj === null) return obj;
                  if (visited.has(obj)) return obj;
                  visited.add(obj);
                  if (Array.isArray(obj)) {
                    return obj.map((item) => pruneDesc(item, visited)) as any;
                  }
                  const newObj: any = {};
                  for (const key in obj) {
                    if (key !== "desc") {
                      newObj[key] = pruneDesc(obj[key], visited);
                    }
                  }
                  return newObj;
                };
                return pruneDesc(m);
              });
          expect(sortMesssages(currentInfo.messages)).toEqual(
            sortMesssages(expectedInfo.messages),
          );
        }
      });
    });
  }
});
