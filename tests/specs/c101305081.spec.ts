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
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305081;
const tokenCode = 101305181;
const stardust = 44508094;
const blackRose = 73580471;
const ancientFairy = 25862681;
const solemnWarning = 84749824;
const utopia = 84013237;
const monsterReborn = 83764718;
const blueEyes = 89631139;

const {
  HINT_SELECTMSG,
  HINTMSG_TOFIELD,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("远古者的见证人", () => {
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
    it("checks synchro condition and hand special summon target", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: stardust, location: LOCATION_GRAVE },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local syn=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${stardust}):GetFirst()
          local non=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ret={
            c${cardCode}.cfilter(syn),
            c${cardCode}.cfilter(non),
            c${cardCode}.spcon(e,0,nil,0,0,nil,0,0),
            c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([true, false, true, true]);
      });
    });

    it("returns false for spcon/sptg without synchro or without zone", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_HAND });

        const noSyn = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ret={
            c${cardCode}.spcon(e,0,nil,0,0,nil,0,0),
            c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);
        expect(noSyn).toEqual([false, true]);
      });

      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: stardust, location: LOCATION_GRAVE },
          ...[0, 1, 2, 3, 4].map((sequence) => ({
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence,
            position: POS_FACEUP_ATTACK,
          })),
        ]);

        const noZone = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ret=c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0)
          Effect.GetHandler=oldHandler
          return ret
        `);
        expect(noZone).toBe(false);
      });
    });

    it("checks place filter, settg and extra deck splimit", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: stardust, location: LOCATION_EXTRA },
          { code: blackRose, location: LOCATION_GRAVE },
          { code: utopia, location: LOCATION_EXTRA, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local syn=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${stardust}):GetFirst()
          local xyz=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${utopia}):GetFirst()
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.placefilter(syn,0),
            c${cardCode}.placefilter(xyz,0),
            c${cardCode}.settg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.splimit(e,xyz),
            c${cardCode}.splimit(e,syn)
          }
        `);

        expect(result).toEqual([true, false, true, true, false]);
      });
    });

    it("returns false for settg without placeable synchro or zones", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({
          code: cardCode,
          location: LOCATION_MZONE,
          position: POS_FACEUP_ATTACK,
        });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.settg(e,0,nil,0,0,nil,0,0,0)
        `);
        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("special summons from hand, places synchros as continuous spells and summons a token", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: stardust, location: LOCATION_EXTRA },
            { code: blackRose, location: LOCATION_GRAVE },
            { code: ancientFairy, location: LOCATION_EXTRA, sequence: 1 },
            {
              code: solemnWarning,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: solemnWarning }),
            );
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgSelectChain, (msg) => {
            // ② 声明衍生物特召，神之警告可再连锁
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: solemnWarning }),
            );
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_TOFIELD,
            });
            expect(msg.selectableCards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: stardust }),
                expect.objectContaining({ code: blackRose }),
                expect.objectContaining({ code: ancientFairy }),
              ]),
            );
            return findCard(ctx, stardust, LOCATION_EXTRA)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, blackRose, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.finishable).toBeTruthy();
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, stardust, LOCATION_SZONE)).toBeDefined();
            expect(findCard(ctx, blackRose, LOCATION_SZONE)).toBeDefined();
            expect(findCard(ctx, tokenCode, LOCATION_MZONE)).toBeDefined();
            const token = findCard(ctx, tokenCode, LOCATION_MZONE);
            expect(token?.level).toBe(2);
          });
      });
    });

    it("blocks non-Synchro Extra Deck special summons until End Phase after placing", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: stardust, location: LOCATION_GRAVE },
            { code: blackRose, location: LOCATION_EXTRA },
            { code: utopia, location: LOCATION_EXTRA, sequence: 1 },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
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
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, blackRose, LOCATION_EXTRA)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.finishable).toBeTruthy();
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, utopia, LOCATION_EXTRA)?.canSpecialSummon(),
            ).toBe(false);
          });
      });
    });

    it("only allows effect 1 once per turn across copies", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            { code: stardust, location: LOCATION_GRAVE },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(false))
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = findCard(ctx, cardCode, LOCATION_HAND);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
          });
      });
    });

    it("only allows effect 2 once per turn across copies", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_GRAVE },
            { code: stardust, location: LOCATION_GRAVE, sequence: 1 },
            { code: blackRose, location: LOCATION_EXTRA },
            { code: monsterReborn, location: LOCATION_HAND, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, blackRose, LOCATION_EXTRA)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.finishable).toBeTruthy();
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, monsterReborn, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: cardCode,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(ctx, cardCode, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const copies = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((c) => c.code === cardCode);
            expect(copies.length).toBeGreaterThanOrEqual(2);
          });
      });
    });
  });
});
