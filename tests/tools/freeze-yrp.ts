import path from "node:path";
import fs from "node:fs";
import { createTest } from "../utility/create-test";
import { toYrpInfo } from "../utility/yrp-info";
import yaml from "js-yaml";
import { normalizeYrpSingle } from "../utility/normalize-yrp-single";

async function main() {
  const yrpFilenames = process.argv.slice(2);
  if (yrpFilenames.length === 0) {
    console.error("Usage: npm run yrpfreeze <replay1> <replay2> ...");
    process.exit(1);
  }
  for (const yrpFilename of yrpFilenames) {
    const yrpParts = yrpFilename.split("/").filter((part) => part.length > 0);
    const fullPath = path.resolve(
      process.cwd(),
      "tests",
      "yrp",
      path.join(...yrpParts) + ".yrp",
    );
    const destPath = path.resolve(
      process.cwd(),
      "tests",
      "yrp-info",
      path.join(...yrpParts) + ".yaml",
    );
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    console.log(`Will save YRP info from ${fullPath} to ${destPath}`);
    const yrp = await normalizeYrpSingle(fullPath);
    await createTest({ yrp }, async (test) => {
      const info = toYrpInfo(test);
      console.log(info.snapshotText);
      const yamlStr = yaml.dump(info);
      await fs.promises.writeFile(destPath, yamlStr, "utf-8");
      console.log(`Saved YRP info from ${fullPath} to ${destPath}`);
    });
  }
}

main().then();
