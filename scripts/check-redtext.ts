import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";
import { OcgcoreScriptConstants, SlientAdvancor } from "ygopro-jstest";
import { YGOProCdb } from "ygopro-cdb-encode";
import { createTest } from "../tests/utility/create-test";

interface CheckTarget {
  cdbPath: string;
  ids?: number[];
}

interface LoadedTarget extends CheckTarget {
  cards: number[];
}

const usage = [
  "Usage:",
  "  npm run check:redtext -- <cdb>[:id,id...] [...]",
  "",
  "Examples:",
  "  npm run check:redtext -- BETB.cdb",
  "  npm run check:redtext -- BETB.cdb:101306045,101306046",
].join("\n");

const parseIds = (raw: string) => {
  if (!/^\d+(,\d+)*$/.test(raw)) {
    throw new Error(`Invalid card id list: ${raw}`);
  }

  return raw.split(",").map((item) => Number(item));
};

const parseTarget = (raw: string): CheckTarget => {
  const separatorIndex = raw.lastIndexOf(":");
  if (separatorIndex < 0) {
    return {
      cdbPath: path.resolve(process.cwd(), raw),
    };
  }

  const cdbPath = raw.slice(0, separatorIndex);
  const ids = parseIds(raw.slice(separatorIndex + 1));

  return {
    cdbPath: path.resolve(process.cwd(), cdbPath),
    ids,
  };
};

const assertReadableFile = (filePath: string) => {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`${filePath} is not a file.`);
  }
};

const loadTarget = async (
  SQL: Awaited<ReturnType<typeof initSqlJs>>,
  target: CheckTarget,
): Promise<LoadedTarget> => {
  assertReadableFile(target.cdbPath);

  const db = new SQL.Database(await fs.promises.readFile(target.cdbPath));
  const cdb = new YGOProCdb(db as Database);

  try {
    if (target.ids) {
      const missing = target.ids.filter((id) => !cdb.findById(id));
      if (missing.length > 0) {
        throw new Error(
          `${target.cdbPath} does not contain card(s): ${missing.join(", ")}`,
        );
      }

      return {
        ...target,
        cards: target.ids,
      };
    }

    return {
      ...target,
      cards: cdb.find().map((card) => card.code),
    };
  } finally {
    db.close();
  }
};

const checkCard = async (target: LoadedTarget, code: number) => {
  const scriptPath = path.resolve(process.cwd(), "script");

  await createTest(
    {
      cdb: target.cdbPath,
      scriptPath,
    },
    (ygo) =>
      ygo
        .addCard({
          code,
          location: OcgcoreScriptConstants.LOCATION_DECK,
        })
        .advance(SlientAdvancor()),
  );
};

const checkTarget = async (target: LoadedTarget) => {
  console.log(
    `Checking ${target.cards.length} card(s) from ${path.relative(
      process.cwd(),
      target.cdbPath,
    )}`,
  );

  for (const [index, code] of target.cards.entries()) {
    console.log(`[${index + 1}/${target.cards.length}] ${code}`);

    try {
      await checkCard(target, code);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${target.cdbPath}:${code}\n${detail}`);
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error(usage);
  }

  const SQL = await initSqlJs();
  const targets = await Promise.all(
    args.map((item) => loadTarget(SQL, parseTarget(item))),
  );

  for (const target of targets) {
    await checkTarget(target);
  }

  console.log("Redtext check passed.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
