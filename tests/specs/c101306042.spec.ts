import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306042;
const futureZexal = 41522092;
const nashKnight = 34876719;
const gaiaDragoon = 91949988;
const deckFiller = 89631139;

const {
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  POS_FACEUP_ATTACK,
  REASON_FUSION,
  REASON_SYNCHRO,
  REASON_XYZ,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const opponentDeck = Array.from({ length: 20 }, (_, sequence) => ({
  code: deckFiller,
  controller: 1,
  location: LOCATION_DECK,
  sequence,
}));

const attachOverlay = (ctx: YGOProTest, sequence: number, code: number) => {
  ctx.evaluate(`
    Debug.AddCard(${code},0,0,LOCATION_MZONE,${sequence},${POS_FACEUP_ATTACK})
  `);
};

describe("No.104 假面魔蹈士 闪光·枉然", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  const runCoveredTest = (cb: Parameters<typeof createTest>[1]) =>
    createTest({}, async (ctx) => {
      try {
        await cb(ctx);
      } finally {
        coverageRegistry.addFrom(ctx);
      }
    });

  describe("unit", () => {
    it("efcon is true only for REASON_XYZ", async () => {
      await runCoveredTest((ctx) => {
        const result = ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
        ]).evaluate(`
            local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
            local e=Effect.CreateEffect(c)
            return {
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_XYZ},0),
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_SYNCHRO},0),
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_FUSION},0)
            }
          `);
        expect(result).toEqual([true, false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("grants the remove effect only once when two copies are used as Xyz materials", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: futureZexal, location: LOCATION_EXTRA },
            ...opponentDeck,
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, futureZexal, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toHaveLength(2);
            expect(
              msg.selectableCards.every((card) => card.code === cardCode),
            ).toBe(true);
            const materials = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((card) => card.code === cardCode);
            expect(materials).toHaveLength(2);
            return materials[0].select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            const materials = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((card) => card.code === cardCode);
            const remaining = materials.find((card) => card.canSelect());
            expect(remaining).toBeDefined();
            return remaining!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            // 对方卡组无魔法，不会走 SelectYesNo；除外顶 10 张。
            // 若两张素材各赋予一次，会除外 20 张。
            expect(
              ctx.allMessages.filter((m) => m instanceof YGOProMsgSelectYesNo),
            ).toHaveLength(0);
            expect(findCard(ctx, futureZexal, LOCATION_MZONE)).toBeDefined();
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(10);
            expect(ctx.getFieldCard(1, LOCATION_DECK)).toHaveLength(10);
          }),
      );
    });

    it("does not trigger when an Xyz with this card as overlay is used as material", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: nashKnight,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          },
          { code: gaiaDragoon, location: LOCATION_EXTRA },
          ...opponentDeck,
        ]);
        attachOverlay(ctx, 0, cardCode);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const host = findCard(ctx, nashKnight, LOCATION_MZONE);
            expect(host?.overlayCards).toEqual(
              expect.arrayContaining([cardCode]),
            );
            const xyz = findCard(ctx, gaiaDragoon, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: nashKnight }),
            );
            const host = findCard(ctx, nashKnight, LOCATION_MZONE);
            return host!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(
              ctx.allMessages.filter((m) => m instanceof YGOProMsgSelectYesNo),
            ).toHaveLength(0);
            expect(findCard(ctx, gaiaDragoon, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, gaiaDragoon, LOCATION_MZONE)?.overlayCards,
            ).toEqual(expect.arrayContaining([nashKnight, cardCode]));
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(0);
          });
      });
    });
  });
});
