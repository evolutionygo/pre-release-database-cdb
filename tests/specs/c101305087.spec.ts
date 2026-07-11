import { resolve } from "node:path";
import {
  BattleCmdType,
  IdleCmdType,
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectBattleCmd,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
  YGOProMsgSummoned,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305087;
const nimbleMomonga = 22567609;
const keyMouse = 135598;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const ashBlossom = 14558127;
const solemnWarning = 84749824;
const ghostBelle = 73642296;
const flameCerberus = 23297235;

const {
  HINT_SELECTMSG,
  HINTMSG_REMOVE,
  HINTMSG_SPSUMMON,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
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

const goToOpponentBattlePhase = (ctx: YGOProTest) =>
  ctx
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_BP),
    )
    .advance(NoEffectAdvancor());

describe("森之圣兽 龙面花牝鹿", () => {
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
    it("checks rmfilter/spfilter and cost availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: nimbleMomonga, location: LOCATION_HAND },
          { code: keyMouse, location: LOCATION_DECK },
          { code: flameCerberus, location: LOCATION_HAND, sequence: 1 },
          { code: blueEyes, location: LOCATION_DECK, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local beast=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${nimbleMomonga}):GetFirst()
          local fireBeast=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${flameCerberus}):GetFirst()
          local earth=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${keyMouse}):GetFirst()
          local dragon=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${blueEyes}):GetFirst()
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.rmfilter(beast,e,0),
            c${cardCode}.rmfilter(fireBeast,e,0),
            c${cardCode}.rmfilter(dragon,e,0),
            c${cardCode}.spfilter(earth,e,0,2),
            c${cardCode}.spfilter(dragon,e,0,2),
            c${cardCode}.spfilter(earth,e,0,0),
            c${cardCode}.cost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.macon(e),
            c${cardCode}.atklimit(e,c)
          }
        `);

        expect(result).toEqual([
          true,
          true,
          false,
          true,
          false,
          false,
          true,
          true,
          true,
        ]);
      });
    });

    it("returns false for cost when no Beast can be banished", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: blueEyes, location: LOCATION_HAND },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.cost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.macon(e)
          }
        `);

        expect(result).toEqual([false, true]);
      });
    });

    it("macon is false without a face-up monster", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_HAND });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.macon(e)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("on Normal Summon banishes a Beast and special summons an EARTH Beast", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: nimbleMomonga, location: LOCATION_HAND, sequence: 1 },
            { code: keyMouse, location: LOCATION_DECK },
            { code: summonedSkull, controller: 1, location: LOCATION_HAND },
            {
              code: ashBlossom,
              controller: 1,
              location: LOCATION_HAND,
              sequence: 1,
            },
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
            expect(monster?.canSummon()).toBe(true);
            return monster!.summon();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expectCurrentMessages(ctx, YGOProMsgSummoned);
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: nimbleMomonga }),
                expect.objectContaining({ code: cardCode }),
              ]),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: summonedSkull }),
            );
            return findCard(ctx, nimbleMomonga, LOCATION_HAND)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: ashBlossom }),
                expect.objectContaining({ code: solemnWarning }),
              ]),
            );
            expect(
              findCard(ctx, ashBlossom, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: keyMouse,
                location: LOCATION_DECK,
              }),
            );
            return findCard(ctx, keyMouse, LOCATION_DECK)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, keyMouse, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, nimbleMomonga, LOCATION_REMOVED),
            ).toBeDefined();
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.player).toBe(1);
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: summonedSkull }),
            );
            return findCard(ctx, summonedSkull, LOCATION_HAND, 1)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, summonedSkull, LOCATION_MZONE, 1),
            ).toBeDefined();
          });
      });
    });

    it("can special summon from the GY and lets Ghost Belle chain", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: nimbleMomonga, location: LOCATION_HAND, sequence: 1 },
            { code: keyMouse, location: LOCATION_GRAVE },
            {
              code: ghostBelle,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.summon(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, nimbleMomonga, LOCATION_HAND)!.select(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: ghostBelle }),
              ]),
            );
            expect(
              findCard(ctx, ghostBelle, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: keyMouse,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(ctx, keyMouse, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(false))
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, keyMouse, LOCATION_MZONE)).toBeDefined();
          });
      });
    });

    it("forces opponent monsters to attack the highest-ATK monster", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
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
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());

        goToOpponentBattlePhase(ctx).state(YGOProMsgSelectBattleCmd, (msg) => {
          expect(msg.player).toBe(1);
          const attack = msg.attackableCards.find(
            (card) => card.code === summonedSkull,
          );
          expect(attack).toBeDefined();
          expect(attack?.directAttack).not.toBe(1);
          return findCard(
            ctx,
            summonedSkull,
            LOCATION_MZONE,
            1,
          )!.performAttack();
        });

        ctx
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectBattleCmd, (msg) =>
            msg.prepareResponse(BattleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE)).toBeDefined();
          });
      });
    });

    it("only allows the summon effect once per turn", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_GRAVE },
            { code: nimbleMomonga, location: LOCATION_HAND, sequence: 1 },
            { code: keyMouse, location: LOCATION_DECK },
            { code: 83764718, location: LOCATION_HAND, sequence: 2 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.summon(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectChain, (msg) => msg.prepareResponse(null))
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, nimbleMomonga, LOCATION_HAND)!.select(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, keyMouse, LOCATION_DECK)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const reborn = findCard(ctx, 83764718, LOCATION_HAND);
            expect(reborn?.canActivate()).toBe(true);
            return reborn!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, cardCode, LOCATION_GRAVE)!.select(),
          )
          .advance(
            SummonPlaceAdvancor(),
            NoEffectAdvancor(),
            NoEffectAdvancor(),
          )
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              ctx
                .getFieldCard(0, LOCATION_MZONE)
                .filter((c) => c.code === cardCode).length,
            ).toBe(2);
          });
      });
    });
  });
});
