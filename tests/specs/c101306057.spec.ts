import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306057;
const { LOCATION_SZONE, LOCATION_MZONE, POS_FACEUP, POS_FACEDOWN } =
  OcgcoreScriptConstants;

describe("艮神鬼门 三千世界", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("does not trigger when only genki exists and the set card is the first facedown", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 101306009,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
        ]);

        // eg 为刚盖放的那张里侧：盖放前场上没有其他里侧，不应满足②条件
        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local setc=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(setc)
          return {
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcon2(e,0,eg,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("triggers when genki and another facedown already exist before the new set", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 101306009,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
          {
            code: 84749824,
            location: LOCATION_SZONE,
            sequence: 1,
            position: POS_FACEDOWN,
          },
        ]);

        // eg 为新盖放的卡；场上另有里侧，应满足②条件
        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local preexisting=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local newlyset=Duel.GetFieldCard(0,LOCATION_SZONE,1)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(newlyset)
          return {
            preexisting:IsFacedown(),
            newlyset:IsFacedown(),
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcon2(e,0,eg,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([true, true, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false without genki monster", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
          {
            code: 84749824,
            location: LOCATION_SZONE,
            sequence: 1,
            position: POS_FACEDOWN,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local newlyset=Duel.GetFieldCard(0,LOCATION_SZONE,1)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(newlyset)
          return c${cardCode}.thcon(e,0,eg,0,0,nil,0,0)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
