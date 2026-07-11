import { resolve } from "node:path";
import { OcgcoreScriptConstants } from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306029;
const sea = 22702055;
const { LOCATION_MZONE, LOCATION_SZONE, POS_FACEUP } = OcgcoreScriptConstants;

describe("耀烂龙 珊瑚海游龙", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("recognizes own sea field for protection condition", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: sea,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.econ(e)
        `);

        expect(result).toBe(true);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("ignores opponent sea for protection condition", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: sea,
            controller: 1,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.econ(e)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
