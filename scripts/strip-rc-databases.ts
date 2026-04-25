import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import JSZip from "jszip";
import initSqlJs, { Database } from "sql.js";

const YGOCDB_API_BASE = "https://ygocdb.com/api/v0";
const OFFICIAL_ID_LIMIT = 100000000;

type CardRow = {
  id: number;
  alias: number;
};

type YgocdbCard = {
  id: number;
};

async function fetchBuffer(url: string, redirectsLeft = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          redirectsLeft > 0
        ) {
          response.resume();
          const nextUrl = new URL(location, url).toString();
          fetchBuffer(nextUrl, redirectsLeft - 1).then(resolve, reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Request failed: ${url} (${statusCode})`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
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

  const sqlJsDistDir = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsDistDir, file),
  });

  for (const dbPath of dbPaths) {
    const db = new SQL.Database(fs.readFileSync(dbPath));
    try {
      stripDatabase(dbPath, db, releasedIds);
    } finally {
      db.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
