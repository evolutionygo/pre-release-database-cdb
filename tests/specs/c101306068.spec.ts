import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  IndexResponse,
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectIdleCmd,
} from "ygopro-msg-encode";
import { expectCurrentHint } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306068;
const blackHole = 53129443;
const valkyrie = 12493482;
const mammoth = 40374923;
const summonedSkull = 70781052;

const {
  HINT_SELECTMSG,
  HINTMSG_RTOHAND,
  HINTMSG_TODECK,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("宇宙性飓风", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("checks target availability and operated hand ownership", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blackHole, location: LOCATION_HAND, sequence: 1 },
          { code: summonedSkull, controller: 1, location: LOCATION_HAND },
          {
            code: valkyrie,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local ownhand=Duel.GetFieldCard(0,LOCATION_HAND,1)
          local opphand=Duel.GetFieldCard(1,LOCATION_HAND,0)
          local field=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.cfilter(ownhand,0),
            c${cardCode}.cfilter(opphand,0),
            c${cardCode}.cfilter(field,0)
          }
        `);

        expect(result).toEqual([true, true, false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when no field card can be returned", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_HAND });

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

  describe("e2e", () => {
    it("returns two field cards and puts the same count from each hand on the bottom of the Deck", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: blackHole, location: LOCATION_HAND, sequence: 1 },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mammoth,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: summonedSkull, controller: 1, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, cardCode, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_RTOHAND,
            });
            expect(msg.player).toBe(0);
            expect(msg.min).toBe(1);
            expect(msg.max).toBe(2);
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: valkyrie, controller: 0 }),
                expect.objectContaining({ code: mammoth, controller: 1 }),
              ]),
            );
            return msg.prepareResponse([
              { code: valkyrie },
              { code: mammoth, controller: 1 },
            ]);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_TODECK,
            });
            expect(msg.player).toBe(0);
            expect(msg.min).toBe(1);
            expect(msg.max).toBe(1);
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: blackHole }),
                expect.objectContaining({ code: valkyrie }),
              ]),
            );
            return msg.prepareResponse([{ code: valkyrie }]);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 1,
              desc: HINTMSG_TODECK,
            });
            expect(msg.player).toBe(1);
            expect(msg.min).toBe(1);
            expect(msg.max).toBe(1);
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: summonedSkull }),
                expect.objectContaining({ code: mammoth, controller: 1 }),
              ]),
            );
            return msg.prepareResponse([{ code: mammoth, controller: 1 }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blackHole, LOCATION_HAND)).toBeDefined();
            expect(findCard(ctx, valkyrie, LOCATION_DECK)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_HAND, 1),
            ).toBeDefined();
            expect(findCard(ctx, mammoth, LOCATION_DECK, 1)).toBeDefined();
            expect(
              ctx.getFieldCard(0, LOCATION_MZONE, LOCATION_MZONE),
            ).toHaveLength(0);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("only allows one copy to be activated per turn", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mammoth,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, cardCode, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) =>
            msg.prepareResponse([IndexResponse(0)]),
          )
          .state(YGOProMsgSelectCard, (msg) =>
            msg.prepareResponse([{ code: valkyrie }]),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, mammoth, LOCATION_MZONE, 1)).toBeDefined();
            const remaining = findCard(ctx, cardCode, LOCATION_HAND);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
          });

        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
