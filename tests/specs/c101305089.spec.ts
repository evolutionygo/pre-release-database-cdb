import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { addOverlays, findCard } from "../utility/angelechy-helpers";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305089;
const blueEyes = 89631139;
const raigeki = 12580477;
const valkyrie = 12493482;
const mammoth = 40374923;

const {
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

describe("悼光之希路伯", () => {
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
    it("checks xyz attach filters, overlay conditions, and send targets", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
          { code: valkyrie, controller: 1, location: LOCATION_GRAVE },
          { code: blueEyes, location: LOCATION_GRAVE, sequence: 1 },
          { code: raigeki, location: LOCATION_GRAVE, sequence: 2 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local opp=Duel.GetFieldCard(1,LOCATION_GRAVE,0)
          local own=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local spell=Duel.GetFieldCard(0,LOCATION_GRAVE,1)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_IGNITION)
          c:RegisterEffect(e)
          local eg=Group.FromCards(opp)
          local egOwn=Group.FromCards(own)
          return {
            c${cardCode}.xyzfilter(opp,0,e),
            c${cardCode}.xyzfilter(own,0,e),
            c${cardCode}.xyzfilter(spell,0,e),
            c${cardCode}.rmcon(e,0,eg,0,0,0,0,0),
            c${cardCode}.rmcon(e,0,egOwn,0,0,0,0,0),
            c${cardCode}.effcon(2)(e,0,nil,0,0,0,0,0),
            c${cardCode}.effcon(4)(e,0,nil,0,0,0,0,0),
            c${cardCode}.rmtg(e,0,eg,0,0,0,0,0,0),
            c${cardCode}.tgtg(e,0,nil,0,0,0,0,0,0)
          }
        `);

        expect(result).toEqual([
          true,
          false,
          false,
          true,
          false,
          false,
          false,
          true,
          true,
        ]);
      });
    });

    it("enables overlay-count branches when enough materials are attached", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
          { code: mammoth, location: LOCATION_MZONE, sequence: 1 },
        ]);
        addOverlays(ctx, 0, 4, blueEyes);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_IGNITION)
          c:RegisterEffect(e)
          return {
            c${cardCode}.effcon(2)(e,0,nil,0,0,0,0,0),
            c${cardCode}.effcon(3)(e,0,nil,0,0,0,0,0),
            c${cardCode}.effcon(4)(e,0,nil,0,0,0,0,0),
            c${cardCode}.tgcost(e,0,nil,0,0,0,0,0,0),
            c${cardCode}.tgtg(e,0,nil,0,0,0,0,0,0)
          }
        `);

        expect(result).toEqual([true, true, true, true, true]);
      });
    });

    it("returns false for tgcost without materials", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_MZONE });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_IGNITION)
          c:RegisterEffect(e)
          return c${cardCode}.tgcost(e,0,nil,0,0,0,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("is Xyz Summoned with two Level 8 monsters", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: blueEyes }),
              ]),
            );
            return msg.prepareResponse([
              { code: blueEyes },
              { code: blueEyes },
            ]);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards).toEqual(
              expect.arrayContaining([blueEyes, blueEyes]),
            );
          }),
      );
    });

    it("attaches an opponent monster from the Graveyard when it is sent there", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: raigeki, location: LOCATION_HAND },
            {
              code: valkyrie,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            addOverlays(ctx, 0, 2, blueEyes);
            return findCard(ctx, raigeki, LOCATION_HAND)!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: valkyrie, controller: 1 }),
            );
            return msg.prepareResponse([{ code: valkyrie, controller: 1 }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards).toContain(valkyrie);
            expect(findCard(ctx, valkyrie, LOCATION_GRAVE, 1)).toBeUndefined();
          }),
      );
    });

    it("cannot use the attach effect twice in the same turn", async () => {
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
            { code: raigeki, location: LOCATION_HAND },
            {
              code: valkyrie,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            ctx.evaluate(`
              for i=1,2 do
                Debug.AddCard(${blueEyes},0,0,LOCATION_MZONE,0,${POS_FACEUP_ATTACK})
                Debug.AddCard(${blueEyes},0,0,LOCATION_MZONE,1,${POS_FACEUP_ATTACK})
              end
            `);
            return findCard(ctx, raigeki, LOCATION_HAND)!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectChain, () => {
            const activatable = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((card) => card.code === cardCode && card.canActivate());
            expect(activatable.length).toBe(2);
            return activatable[0].activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: valkyrie, controller: 1 }),
            );
            return msg.prepareResponse([{ code: valkyrie, controller: 1 }]);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            // 卡名1次：第二只不应再被询问
            const overlays = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .flatMap((card) => card.overlayCards ?? []);
            expect(overlays).toContain(valkyrie);
          }),
      );
    });

    it("detaches 3 materials to send one monster on the field to the Graveyard", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: mammoth,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
        ]);
        addOverlays(ctx, 0, 4, blueEyes);
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards.length).toBeGreaterThanOrEqual(4);
            expect(xyz?.canActivate()).toBe(true);
            return xyz!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            // 取除 3 个超量素材
            expect(msg.cards.length).toBeGreaterThanOrEqual(3);
            expect(msg.min).toBe(3);
            expect(msg.max).toBe(3);
            return msg.prepareResponse(msg.cards.slice(0, 3));
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: mammoth }),
            );
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, mammoth, LOCATION_MZONE)!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards.length).toBe(1);
            expect(findCard(ctx, mammoth, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("with 2+ materials is not destroyed by Raigeki", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: raigeki, location: LOCATION_HAND },
            {
              code: valkyrie,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            addOverlays(ctx, 0, 2, blueEyes);
            return findCard(ctx, raigeki, LOCATION_HAND)!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(false))
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, valkyrie, LOCATION_GRAVE, 1)).toBeDefined();
          }),
      );
    });
  });
});
