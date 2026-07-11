import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306054;
const tokenCodes = [101306154, 101306254, 101306354, 101306454];
const { LOCATION_HAND, LOCATION_MZONE } = OcgcoreScriptConstants;

describe("睡羊 替罪羊", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("can special summon 替罪羊衍生物 codes id+100..id+400", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([{ code: cardCode, location: LOCATION_HAND }]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCodes[0]},0,TYPES_TOKEN_MONSTER,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH,POS_FACEUP_DEFENSE),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCodes[1]},0,TYPES_TOKEN_MONSTER,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH,POS_FACEUP_DEFENSE),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCodes[2]},0,TYPES_TOKEN_MONSTER,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH,POS_FACEUP_DEFENSE),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCodes[3]},0,TYPES_TOKEN_MONSTER,0,0,1,RACE_BEAST,ATTRIBUTE_EARTH,POS_FACEUP_DEFENSE)
          }
        `);

        expect(result).toEqual([true, true, true, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when no monster zone is available", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          ...[0, 1, 2, 3, 4].map((sequence) => ({
            code: 40374923,
            location: LOCATION_MZONE,
            sequence,
            position: OcgcoreScriptConstants.POS_FACEUP_ATTACK,
          })),
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
