import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306069;
const endymion = 3611830;
const mastery = 75014062;
const { LOCATION_HAND, LOCATION_DECK, LOCATION_GRAVE } = OcgcoreScriptConstants;

describe("魔力到达", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("searches cards whose text mentions magic counters", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: endymion, location: LOCATION_DECK },
          { code: mastery, location: LOCATION_GRAVE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local deck=Duel.GetFieldCard(0,LOCATION_DECK,0)
          local grave=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thfilter(deck),
            c${cardCode}.thfilter(grave),
            c${cardCode}.thfilter(c)
          }
        `);

        expect(result).toEqual([true, true, true, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when no mention-counter card exists", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: 40374923, location: LOCATION_DECK },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
