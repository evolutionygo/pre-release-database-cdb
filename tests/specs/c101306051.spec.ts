import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306051;
const dinoMaterialA = 1784619;
const dinoMaterialB = 3743515;
const zeroAtkDinoMaterial = 63259351;
const nonDinoMaterial = 89631139;
const fusionMaterial = 29927283;
const fusionTarget = 1595137;
const stardustDragon = 44508094;

const {
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const selectLinkMaterial = (flow: YGOProTest, ctx: YGOProTest, code: number) =>
  flow.state(YGOProMsgSelectUnselectCard, (msg) => {
    expect(msg.selectableCards).toContainEqual(
      expect.objectContaining({ code }),
    );
    return findCard(ctx, code, LOCATION_MZONE)!.select();
  });

const activateFusionEffect = (flow: YGOProTest, ctx: YGOProTest) =>
  flow
    .state(YGOProMsgSelectIdleCmd, () => {
      const link = findCard(ctx, cardCode, LOCATION_MZONE);
      expect(link?.canActivate()).toBe(true);
      return link!.activate();
    })
    .advance(NoEffectAdvancor(), NoEffectAdvancor());

const completeFusionSummon = (flow: YGOProTest, ctx: YGOProTest) =>
  flow
    .state(YGOProMsgSelectCard, (msg) => {
      expect(msg.cards).toContainEqual(
        expect.objectContaining({ code: fusionTarget }),
      );
      return findCard(ctx, fusionTarget, LOCATION_EXTRA)!.select();
    })
    .state(YGOProMsgSelectUnselectCard, (msg) => {
      expect(msg.selectableCards).toContainEqual(
        expect.objectContaining({ code: fusionMaterial }),
      );
      return findCard(ctx, fusionMaterial, LOCATION_GRAVE)!.select();
    })
    .state(YGOProMsgSelectUnselectCard, (msg) => {
      expect(msg.selectableCards).toContainEqual(
        expect.objectContaining({ code: dinoMaterialA }),
      );
      return findCard(ctx, dinoMaterialA, LOCATION_GRAVE)!.select();
    })
    .advance(SummonPlaceAdvancor(), NoEffectAdvancor());

describe("解層竜ストラティアエ", () => {
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
    it("requires at least one Dinosaur among link materials", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: nonDinoMaterial,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local g=Group.FromCards(
            Duel.GetFieldCard(0,LOCATION_MZONE,0),
            Duel.GetFieldCard(0,LOCATION_MZONE,1)
          )
          return {
            c${cardCode}.lcheck(g),
            c${cardCode}.lcheck(Group.FromCards(Duel.GetFieldCard(0,LOCATION_MZONE,1),Duel.GetFieldCard(0,LOCATION_MZONE,1)))
          }
        `);

        expect(result).toEqual([true, false]);
      });
    });

    it("checks fusion availability from field and grave", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: fusionMaterial, location: LOCATION_GRAVE },
            { code: fusionTarget, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.fsptg(e,0,nil,0,0,0,0,0,0)
        `);

        expect(result).toBe(true);
      });
    });

    it("blocks non-Dinosaur monsters from the Extra Deck after fusion", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: stardustDragon, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local tc=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${stardustDragon}):GetFirst()
          local e=Effect.CreateEffect(c)
          return c${cardCode}.splimit(e,tc)
        `);

        expect(result).toBe(true);
      });
    });

    it("returns false when fusion cannot be performed", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard({
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          })
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.fsptg(e,0,nil,0,0,0,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });

    it("counts only Dinosaur materials that pass covcheck for valcheck", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: nonDinoMaterial,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local dino=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local other=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          return {
            c${cardCode}.covcheck(dino),
            c${cardCode}.covcheck(other),
            dino:GetTextAttack(),
            other:GetTextAttack()
          }
        `);

        expect(result[0]).toBe(true);
        expect(result[1]).toBe(true);
        expect(result[2]).toBe(1500);
        expect(result[3]).toBe(3000);
      });
    });
  });

  describe("e2e", () => {
    it("raises ATK by half the original ATK of Dinosaur link materials", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: dinoMaterialB,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const link = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(link?.canSpecialSummon()).toBe(true);
            return link!.specialSummon();
          });
        flow = selectLinkMaterial(flow, ctx, dinoMaterialA);
        flow = selectLinkMaterial(flow, ctx, dinoMaterialB);
        flow
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(SlientAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const link = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(link?.attack).toBe(Math.ceil((1500 + 2000) / 2));
          });
      });
    });

    it("does not offer effect 1 when Dinosaur link material original ATK sum is 0", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: zeroAtkDinoMaterial,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: nonDinoMaterial,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const link = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(link?.canSpecialSummon()).toBe(true);
            return link!.specialSummon();
          });
        flow = selectLinkMaterial(flow, ctx, zeroAtkDinoMaterial);
        flow = selectLinkMaterial(flow, ctx, nonDinoMaterial);
        flow
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const link = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(link?.attack).toBe(0);
          });
      });
    });

    it("only counts Dinosaur monsters among link materials for the ATK gain", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: nonDinoMaterial,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_EXTRA)!.specialSummon(),
          );
        flow = selectLinkMaterial(flow, ctx, dinoMaterialA);
        flow = selectLinkMaterial(flow, ctx, nonDinoMaterial);
        flow
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .advance(SlientAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const link = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(link?.attack).toBe(Math.ceil(1500 / 2));
          });
      });
    });

    it("fusion summons a Dinosaur monster by banishing field and grave materials", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: dinoMaterialA,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: fusionMaterial, location: LOCATION_GRAVE },
            { code: fusionTarget, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());
        flow = activateFusionEffect(flow, ctx);
        flow
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: fusionTarget }),
            );
            return findCard(ctx, fusionTarget, LOCATION_EXTRA)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: fusionMaterial }),
            );
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: dinoMaterialA }),
            );
            return findCard(ctx, fusionMaterial, LOCATION_GRAVE)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: dinoMaterialA }),
            );
            return findCard(ctx, dinoMaterialA, LOCATION_MZONE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, fusionTarget, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, fusionMaterial, LOCATION_REMOVED),
            ).toBeDefined();
            expect(
              findCard(ctx, dinoMaterialA, LOCATION_REMOVED),
            ).toBeDefined();
          });
      });
    });

    it("blocks non-Dinosaur Extra Deck special summons for the rest of the turn", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: fusionMaterial, location: LOCATION_GRAVE },
            { code: dinoMaterialA, location: LOCATION_GRAVE, sequence: 1 },
            { code: fusionTarget, location: LOCATION_EXTRA },
            { code: stardustDragon, location: LOCATION_EXTRA, sequence: 1 },
          ])
          .advance(SlientAdvancor());
        flow = activateFusionEffect(flow, ctx);
        flow = completeFusionSummon(flow, ctx);
        flow.state(YGOProMsgSelectIdleCmd, () => {
          const synchro = findCard(ctx, stardustDragon, LOCATION_EXTRA);
          expect(synchro?.canSpecialSummon()).toBe(false);
        });
      });
    });

    it("cannot activate the fusion effect twice in the same turn", async () => {
      await runCoveredTest((ctx) => {
        let flow = ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: fusionMaterial, location: LOCATION_GRAVE },
            { code: dinoMaterialA, location: LOCATION_GRAVE, sequence: 1 },
            { code: fusionTarget, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());
        flow = activateFusionEffect(flow, ctx);
        flow = completeFusionSummon(flow, ctx);
        flow.state(YGOProMsgSelectIdleCmd, () => {
          const link = findCard(ctx, cardCode, LOCATION_MZONE);
          expect(link?.canActivate()).toBe(false);
        });
      });
    });
  });
});
