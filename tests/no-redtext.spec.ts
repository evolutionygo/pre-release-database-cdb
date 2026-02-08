import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { createTest } from "./utility/create-test";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { SlientAdvancor } from "ygopro-jstest";
import { YGOProCdb } from "ygopro-cdb-encode";

describe("No Red Text", () => {
  it("should not get redtext Lua errors", async () => {
    const SQL = await initSqlJs();
    // load everything and make sure no redtext errors occur
    const files = await fs.promises.readdir(process.cwd());
    for (const file of files) {
      if (!file.endsWith(".cdb")) continue;
      const buf = await fs.promises.readFile(path.resolve(process.cwd(), file));
      const db = new SQL.Database(buf);
      const cdb = new YGOProCdb(db);
      for (const data of cdb.find(
        `datas.type != ${OcgcoreScriptConstants.TYPE_MONSTER | OcgcoreScriptConstants.TYPE_NORMAL} and datas.type & ${OcgcoreScriptConstants.TYPE_TOKEN} = 0 and not (datas.alias > 0 and datas.alias - datas.id < 20)`,
      )) {
        const id = data.code;
        expect(id).toBeGreaterThan(0); // dummy assertion to use id variable
        console.log(`Testing redtext of card ID: ${id} from database: ${file}`);
        await createTest({}, (ygo) =>
          ygo
            .addCard({
              code: id,
              location: OcgcoreScriptConstants.LOCATION_DECK,
            })
            .advance(SlientAdvancor()),
        );
      }
      db.close();
    }
  });
});
jest.setTimeout(300000);
