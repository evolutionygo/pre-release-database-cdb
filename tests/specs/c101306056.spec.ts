import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306056;
const { LOCATION_HAND, LOCATION_MZONE, LOCATION_GRAVE, POS_FACEUP } =
  OcgcoreScriptConstants;

describe("异晶人的冀望", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("can use grave shadow as level reference", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          {
            code: 101306005,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: 101306006,
            location: LOCATION_GRAVE,
          },
        ]);

        const result = ctx.evaluate(`
          local field=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local grave=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(field)
          e:SetType(EFFECT_TYPE_SINGLE)
          e:SetCode(EFFECT_CHANGE_LEVEL)
          e:SetValue(6)
          e:SetReset(RESET_EVENT+RESETS_STANDARD)
          field:RegisterEffect(e)
          return {
            c${cardCode}.cfilter2(grave,0),
            c${cardCode}.cfilter1(field,grave:GetLevel())
          }
        `);

        expect(result).toEqual([true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when no shadow exists for level change", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          {
            code: 40374923,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
        ]);

        const result = ctx.evaluate(`
          return Duel.IsExistingMatchingCard(c${cardCode}.cfilter2,0,LOCATION_MZONE+LOCATION_GRAVE,0,1,nil,0)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
