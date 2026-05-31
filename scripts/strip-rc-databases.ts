import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import initSqlJs, { Database } from "sql.js";
import YGOProDeck from "ygopro-deck-encode";

const YGOCDB_API_BASE = "https://ygocdb.com/api/v0";
const OFFICIAL_ID_LIMIT = 100000000;
const RC_SPECIALS_DIR = "rc-specials";

type CardRow = {
  id: number;
  alias: number;
};

type YgocdbCard = {
  id: number;
};

type RcSpecialDeckIds = {
  ids: Set<number>;
  fileCount: number;
  skipped: boolean;
};

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function parseJsonpObject(buffer: Buffer): Record<string, number> {
  const text = buffer.toString("utf-8").trim();
  if (text.startsWith("{")) {
    return JSON.parse(text);
  }

  const match = text.match(/^[^(]*\((.*)\);?$/s);
  if (!match) {
    throw new Error("Cannot parse idChangelog response");
  }
  return JSON.parse(match[1]);
}

async function fetchReleasedCardIds(): Promise<Set<number>> {
  const [cardsZipBuffer, cardsZipMd5Buffer, idChangelogBuffer] =
    await Promise.all([
      fetchBuffer(`${YGOCDB_API_BASE}/cards.zip`),
      fetchBuffer(`${YGOCDB_API_BASE}/cards.zip.md5`),
      fetchBuffer(`${YGOCDB_API_BASE}/idChangelog.jsonp`),
    ]);

  const zip = await JSZip.loadAsync(cardsZipBuffer);
  const cardsJsonFile = zip.file("cards.json");
  if (!cardsJsonFile) {
    throw new Error("cards.zip does not contain cards.json");
  }

  const cardsJsonBuffer = Buffer.from(await cardsJsonFile.async("uint8array"));
  const expectedMd5 = cardsZipMd5Buffer
    .toString("utf-8")
    .trim()
    .replace(/^"|"$/g, "");
  const actualMd5 = crypto
    .createHash("md5")
    .update(cardsJsonBuffer)
    .digest("hex");

  if (expectedMd5 !== actualMd5) {
    throw new Error(
      `ygocdb cards.json md5 mismatch: expected ${expectedMd5}, got ${actualMd5}`,
    );
  }

  const cards = JSON.parse(cardsJsonBuffer.toString("utf-8")) as Record<
    string,
    YgocdbCard
  >;
  const releasedIds = new Set<number>();
  for (const card of Object.values(cards)) {
    releasedIds.add(card.id);
  }

  const idChangelog = parseJsonpObject(idChangelogBuffer);
  for (const [oldId, newId] of Object.entries(idChangelog)) {
    releasedIds.add(Number(oldId));
    releasedIds.add(newId);
  }

  return releasedIds;
}

function readRcSpecialDeckIds(dirPath: string): RcSpecialDeckIds {
  if (!fs.existsSync(dirPath)) {
    return { ids: new Set<number>(), fileCount: 0, skipped: true };
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${dirPath} exists but is not a directory`);
  }

  const ids = new Set<number>();
  const filePaths = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dirPath, entry.name))
    .sort();

  for (const filePath of filePaths) {
    const ydkString = fs.readFileSync(filePath, "utf-8");
    const deck = YGOProDeck.fromYdkString(ydkString);

    for (const id of [...deck.main, ...deck.extra, ...deck.side]) {
      ids.add(id);
    }
  }

  return { ids, fileCount: filePaths.length, skipped: false };
}

function applyRcSpecials(releasedIds: Set<number>): Set<number> {
  const includeDir = path.join(process.cwd(), RC_SPECIALS_DIR, "include");
  const excludeDir = path.join(process.cwd(), RC_SPECIALS_DIR, "exclude");
  const include = readRcSpecialDeckIds(includeDir);
  const exclude = readRcSpecialDeckIds(excludeDir);
  const adjustedReleasedIds = new Set(releasedIds);

  for (const id of include.ids) {
    adjustedReleasedIds.add(id);
  }

  for (const id of exclude.ids) {
    adjustedReleasedIds.delete(id);
  }

  const sharedIds = [...include.ids].filter((id) => exclude.ids.has(id));
  if (sharedIds.length > 0) {
    console.warn(
      `rc-specials has ${sharedIds.length} id(s) in both include and exclude; exclude was applied last`,
    );
  }

  const describe = (name: string, decks: RcSpecialDeckIds) =>
    decks.skipped
      ? `${name}: skipped`
      : `${name}: ${decks.ids.size} ids from ${decks.fileCount} file(s)`;

  console.log(
    `Applied rc-specials overrides (${describe(
      "include",
      include,
    )}; ${describe("exclude", exclude)}): ${adjustedReleasedIds.size} released ids`,
  );

  return adjustedReleasedIds;
}

function queryCards(db: Database): CardRow[] {
  const result = db.exec("SELECT id, alias FROM datas");
  const values = result[0]?.values ?? [];
  return values.map(([id, alias]) => ({
    id: Number(id),
    alias: Number(alias ?? 0),
  }));
}

function queryIds(db: Database, sql: string): number[] {
  const result = db.exec(sql);
  const values = result[0]?.values ?? [];
  return values.map(([id]) => Number(id));
}

function hundredsDigit(id: number): number {
  return Math.floor(id / 100) % 10;
}

function withoutHundredsDigit(id: number): number {
  return id - hundredsDigit(id) * 100;
}

function calculateKeptIds(
  cards: CardRow[],
  releasedIds: Set<number>,
): Set<number> {
  const keptIds = new Set<number>();
  const cardsByVariantKey = new Map<number, CardRow[]>();
  const releasedVariantKeys = new Set<number>();

  for (const id of releasedIds) {
    if (hundredsDigit(id) === 0) {
      releasedVariantKeys.add(id);
    }
  }

  for (const card of cards) {
    if (card.id < OFFICIAL_ID_LIMIT || releasedIds.has(card.id)) {
      keptIds.add(card.id);
    }

    const variantKey = withoutHundredsDigit(card.id);
    const variantGroup = cardsByVariantKey.get(variantKey) ?? [];
    variantGroup.push(card);
    cardsByVariantKey.set(variantKey, variantGroup);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const keptSnapshot = [...keptIds];

    for (const card of cards) {
      const isAliasTargetKept =
        card.alias < OFFICIAL_ID_LIMIT ||
        releasedIds.has(card.alias) ||
        keptIds.has(card.alias);

      if (!keptIds.has(card.id) && card.alias !== 0 && isAliasTargetKept) {
        keptIds.add(card.id);
        changed = true;
      }
    }

    for (const card of cards) {
      if (
        !keptIds.has(card.id) &&
        releasedVariantKeys.has(withoutHundredsDigit(card.id))
      ) {
        keptIds.add(card.id);
        changed = true;
      }
    }

    for (const id of keptSnapshot) {
      if (hundredsDigit(id) !== 0) {
        continue;
      }

      for (const card of cardsByVariantKey.get(id) ?? []) {
        if (!keptIds.has(card.id)) {
          keptIds.add(card.id);
          changed = true;
        }
      }
    }
  }

  return keptIds;
}

function stripDatabase(dbPath: string, db: Database, releasedIds: Set<number>) {
  const cards = queryCards(db);
  const keptIds = calculateKeptIds(cards, releasedIds);
  const removedDataIds = cards
    .map((card) => card.id)
    .filter((id) => !keptIds.has(id));
  const removedTextIds = queryIds(db, "SELECT id FROM texts").filter(
    (id) => !keptIds.has(id),
  );

  const deleteData = db.prepare("DELETE FROM datas WHERE id = ?");
  for (const id of removedDataIds) {
    deleteData.run([id]);
  }
  deleteData.free();

  const deleteText = db.prepare("DELETE FROM texts WHERE id = ?");
  for (const id of removedTextIds) {
    deleteText.run([id]);
  }
  deleteText.free();

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`${dbPath}: kept ${keptIds.size} of ${cards.length} cards`);
}

async function main() {
  const dbPaths = process.argv.slice(2);
  if (dbPaths.length === 0) {
    console.error(
      "Usage: ts-node scripts/strip-rc-databases.ts <database.cdb> [...]",
    );
    process.exit(1);
  }

  const releasedIds = await fetchReleasedCardIds();
  console.log(`Loaded ${releasedIds.size} released card ids from ygocdb`);
  const adjustedReleasedIds = applyRcSpecials(releasedIds);

  const sqlJsDistDir = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsDistDir, file),
  });

  for (const dbPath of dbPaths) {
    const db = new SQL.Database(fs.readFileSync(dbPath));
    try {
      stripDatabase(dbPath, db, adjustedReleasedIds);
    } finally {
      db.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
