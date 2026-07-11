import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306049;
const tokenCode = 101306149;
const { LOCATION_MZONE, LOCATION_GRAVE, POS_FACEUP_ATTACK } =
  OcgcoreScriptConstants;

describe("魔救之辉迹", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("allows level monsters as token reference and uses 奇石衍生物 code", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: 40374923,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: 70781052,
            location: LOCATION_GRAVE,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local field=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local grave=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.tktg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return {
            ok,
            c${cardCode}.tfilter(field,0),
            c${cardCode}.tfilter(grave,0),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCode},0,TYPES_TOKEN_MONSTER,0,0,field:GetLevel(),RACE_ROCK,ATTRIBUTE_LIGHT),
            Duel.IsPlayerCanSpecialSummonMonster(0,${cardCode}+100,0,TYPES_TOKEN_MONSTER,0,0,4,RACE_ROCK,ATTRIBUTE_LIGHT)
          }
        `);

        expect(result).toEqual([true, true, true, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("rejects when no level monster exists for token reference", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.tktg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return ok
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
