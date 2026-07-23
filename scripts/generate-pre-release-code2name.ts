import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";
import { YGOProCdb } from "ygopro-cdb-encode";

const MIN_PRE_RELEASE_CODE = 100_000_000;
const OUTPUT_FILENAME = "pre-release-code2name.json";

const isSourceCdb = (fileName: string) =>
  fileName.endsWith(".cdb") &&
  fileName !== "test-release.cdb" &&
  !/^test-update.*\.cdb$/.test(fileName) &&
  !/^script-fix.*\.cdb$/.test(fileName);

const main = async () => {
  const rootDir = process.cwd();
  const sourceCdbFiles = (
    await fs.promises.readdir(rootDir, {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isFile() && isSourceCdb(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (sourceCdbFiles.length === 0) {
    throw new Error("No source CDB files found.");
  }

  const SQL = await initSqlJs();
  const code2name = new Map<number, string>();

  for (const fileName of sourceCdbFiles) {
    const cdbPath = path.resolve(rootDir, fileName);
    const db = new SQL.Database(await fs.promises.readFile(cdbPath));
    const cdb = new YGOProCdb(db as Database);

    try {
      const cards = cdb.find("datas.id >= :id ORDER BY datas.id", {
        id: MIN_PRE_RELEASE_CODE,
      });

      for (const card of cards) {
        if (code2name.has(card.code)) {
          continue;
        }

        code2name.set(card.code, card.name);
      }
    } finally {
      db.close();
    }
  }

  const output = Object.fromEntries(
    [...code2name.entries()].sort(([left], [right]) => left - right),
  ) as Record<number, string>;
  const outputPath = path.resolve(rootDir, OUTPUT_FILENAME);

  await fs.promises.writeFile(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
  );
  console.log(
    `Wrote ${code2name.size} card name(s) from ${sourceCdbFiles.length} CDB file(s) to ${OUTPUT_FILENAME}.`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
