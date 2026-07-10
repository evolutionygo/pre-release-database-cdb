import { resolve } from "node:path";
import {
  IdleCmdType,
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgLpUpdate,
  YGOProMsgSelectBattleCmd,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSet,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessage,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306026;
const mysticalSpaceTyphoon = 5318639;
const heavyStorm = 19613556;
const lightAndDarknessRitual = 33599853;
const twoHearts = 24749710;
const chaosBox = 75983808;
const blueEyes = 89631139;
const solemnWarning = 84749824;

const {
  HINT_SELECTMSG,
  HINTMSG_DISCARD,
  HINTMSG_SET,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEUP_DEFENSE,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("团结之恶魔龙 暗黑魔龙", () => {
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
    it("checks discard cost filter true/false cases", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: mysticalSpaceTyphoon, location: LOCATION_HAND, sequence: 1 },
          {
            code: lightAndDarknessRitual,
            location: LOCATION_HAND,
            sequence: 2,
          },
          { code: heavyStorm, location: LOCATION_HAND, sequence: 3 },
          { code: blueEyes, location: LOCATION_HAND, sequence: 4 },
        ]);

        const result = ctx.evaluate(`
          local qp=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${mysticalSpaceTyphoon}):GetFirst()
          local ritual=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${lightAndDarknessRitual}):GetFirst()
          local normal=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${heavyStorm}):GetFirst()
          local monster=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${blueEyes}):GetFirst()
          return {
            c${cardCode}.cfilter(qp),
            c${cardCode}.cfilter(ritual),
            c${cardCode}.cfilter(normal),
            c${cardCode}.cfilter(monster)
          }
        `);

        expect(result).toEqual([true, true, false, false]);
      });
    });

    it("checks set filter and chk==0 availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: mysticalSpaceTyphoon, location: LOCATION_HAND, sequence: 1 },
          { code: twoHearts, location: LOCATION_DECK },
          { code: chaosBox, location: LOCATION_GRAVE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local setdeck=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${twoHearts}):GetFirst()
          local setgrave=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${chaosBox}):GetFirst()
          local e=Effect.CreateEffect(c)
          local can_sp=Duel.GetLocationCount(0,LOCATION_MZONE)>0 and c:IsCanBeSpecialSummoned(e,0,0,true,false,POS_FACEUP_DEFENSE)
          return {
            c:GetCode(),
            c${cardCode}.setfilter(setdeck),
            c${cardCode}.setfilter(setgrave),
            c${cardCode}.setfilter(c),
            c${cardCode}.spcost(e,0,nil,0,0,nil,0,0,0),
            can_sp and true or false,
            c${cardCode}.settg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.atktg(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([
          cardCode,
          true,
          true,
          false,
          true,
          true,
          true,
          true,
        ]);
      });
    });

    it("returns false for cost and targets when requirements are missing", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: heavyStorm, location: LOCATION_HAND, sequence: 1 },
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
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 3,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 4,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.spcost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.settg(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([false, false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("special summons in Defense by discarding a Quick-Play Spell, sets a listed card, and is Warning-chainable", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_HAND,
              sequence: 1,
            },
            { code: twoHearts, location: LOCATION_DECK },
            { code: chaosBox, location: LOCATION_GRAVE },
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
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_DISCARD,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: mysticalSpaceTyphoon }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: solemnWarning }),
              ]),
            );
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expectCurrentMessage(ctx, YGOProMsgSpSummoning, (summoning) => {
              expect(summoning.code).toBe(cardCode);
              expect(summoning.position).toBe(POS_FACEUP_DEFENSE);
            });
            expect(msg.code).toBe(cardCode);
            const summoned = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(summoned?.position).toBe(POS_FACEUP_DEFENSE);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SET,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  code: twoHearts,
                  location: LOCATION_DECK,
                }),
                expect.objectContaining({
                  code: chaosBox,
                  location: LOCATION_GRAVE,
                }),
              ]),
            );
            return findCard(ctx, twoHearts, LOCATION_DECK)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgSet, (setMsg) => {
              expect(setMsg.code).toBe(twoHearts);
              expect(setMsg.controller).toBe(0);
              expect(setMsg.location).toBe(LOCATION_SZONE);
            });
            expect(findCard(ctx, twoHearts, LOCATION_SZONE)).toBeTruthy();
            expect(
              findCard(ctx, mysticalSpaceTyphoon, LOCATION_GRAVE),
            ).toBeTruthy();
          });
      });
    });

    it("can discard a Ritual Spell as cost and set a listed card from the GY", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: lightAndDarknessRitual,
              location: LOCATION_HAND,
              sequence: 1,
            },
            { code: twoHearts, location: LOCATION_GRAVE },
            { code: heavyStorm, location: LOCATION_DECK },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: lightAndDarknessRitual }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: heavyStorm }),
            );
            return findCard(
              ctx,
              lightAndDarknessRitual,
              LOCATION_HAND,
            )!.select();
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
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: twoHearts,
                location: LOCATION_GRAVE,
              }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: heavyStorm }),
            );
            return findCard(ctx, twoHearts, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgSet, (setMsg) => {
              expect(setMsg.code).toBe(twoHearts);
            });
            expect(findCard(ctx, twoHearts, LOCATION_SZONE)).toBeTruthy();
          });
      });
    });

    it("enforces the once-per-turn limit of effect 1 across same-name copies", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_HAND,
              sequence: 2,
            },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_HAND,
              sequence: 3,
            },
            { code: twoHearts, location: LOCATION_DECK },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(false))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = ctx
              .getFieldCard(0, LOCATION_HAND)
              .find((card) => card.code === cardCode);
            expect(remaining?.canActivate()).toBe(false);
          });
      });
    });

    it("makes the opponent lose 800 LP and raises this card ATK by 800 at Battle Phase start", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_HAND,
              sequence: 1,
            },
            { code: twoHearts, location: LOCATION_DECK },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(false))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(0);
            return msg.prepareResponse(IdleCmdType.TO_BP);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectBattleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgLpUpdate, (lpMsg) => {
              expect(lpMsg.player).toBe(1);
              expect(lpMsg.lp).toBe(7200);
            });
            expect(ctx.getLP(1)).toBe(7200);
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.attack).toBe(4000);
          });
      });
    });
  });
});
