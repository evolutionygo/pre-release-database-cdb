import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgDamage,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectSum,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  angelechyProblem,
  armPlaceTrigger,
  endTurn,
  findCard,
  registerContinuousSpellType,
  tuner,
} from "../utility/angelechy-helpers";
import {
  expectCurrentHint,
  expectCurrentMessage,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305092;
const summonedSkull = 70781052;
const valkyrie = 12493482;
const blueEyes = 89631139;
const blackHole = 53129443;
const ashBlossom = 14558127;

const {
  HINT_SELECTMSG,
  HINTMSG_ATOHAND,
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

describe("战马之具象天使", () => {
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
    it("checks other-column remove targets and spell search filters", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: valkyrie,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: angelechyProblem, location: LOCATION_DECK },
            { code: blackHole, location: LOCATION_DECK, sequence: 1 },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local sameCol=Duel.GetFieldCard(1,LOCATION_MZONE,2)
          local other=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local col=c:GetColumnGroup()
          local e1=Effect.CreateEffect(c)
          e1:SetCode(EFFECT_CHANGE_TYPE)
          e1:SetType(EFFECT_TYPE_SINGLE)
          e1:SetValue(TYPE_SPELL+TYPE_CONTINUOUS)
          c:RegisterEffect(e1,true)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,LOCATION_MZONE,LOCATION_MZONE,1,c,col)
          Duel.IsExistingTarget=old
          return {
            c${cardCode}.rmfilter(sameCol,col),
            c${cardCode}.rmfilter(other,col),
            r,
            c${cardCode}.thfilter(Duel.GetFieldGroup(0,LOCATION_DECK,0):Filter(Card.IsCode,nil,${angelechyProblem}):GetFirst()),
            c${cardCode}.thfilter(Duel.GetFieldGroup(0,LOCATION_DECK,0):Filter(Card.IsCode,nil,${blackHole}):GetFirst()),
            c${cardCode}.thcon(e1,0,nil,0,0,nil,0,0),
            Duel.IsExistingMatchingCard(c${cardCode}.thfilter,0,LOCATION_DECK,0,1,nil)
          }
        `);

        expect(result).toEqual([false, true, true, true, false, true, true]);
      });
    });

    it("returns false when no other-column monster can be removed", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard({
            code: cardCode,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          })
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_SINGLE)
          c:RegisterEffect(e)
          local col=c:GetColumnGroup()
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,LOCATION_MZONE,LOCATION_MZONE,1,c,col)
          Duel.IsExistingTarget=old
          return { r, c${cardCode}.thcon(e,0,nil,0,0,nil,0,0) }
        `);

        expect(result).toEqual([false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("is Synchro Summoned as a Level 7 monster", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: tuner,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const synchro = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(synchro?.canSpecialSummon()).toBe(true);
            return synchro!.specialSummon();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: tuner }),
            );
            return findCard(ctx, tuner, LOCATION_MZONE)!.select();
          })
          .state(YGOProMsgSelectSum, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: summonedSkull }),
            );
            return findCard(ctx, summonedSkull, LOCATION_MZONE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
          }),
      );
    });

    it("removes a monster from another column and cannot activate again", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: valkyrie,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const destrier = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(destrier?.canActivate()).toBe(true);
            return destrier!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: valkyrie, controller: 1 }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE)!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_REMOVED)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
          }),
      );
    });

    it("searches an Angelechy Spell when placed as a Continuous Spell", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEUP,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: angelechyProblem, location: LOCATION_DECK },
          { code: blackHole, location: LOCATION_DECK, sequence: 1 },
        ]);
        armPlaceTrigger(ctx, cardCode);
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE)!.activate(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_ATOHAND,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyProblem }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: blackHole }),
            );
            return msg.prepareResponse([{ code: angelechyProblem }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyProblem, LOCATION_HAND),
            ).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_SZONE)).toBeDefined();
          });
      });
    });

    it("allows Ash Blossom to chain to the Continuous Spell search", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEUP,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: angelechyProblem, location: LOCATION_DECK },
          {
            code: ashBlossom,
            controller: 1,
            location: LOCATION_HAND,
          },
        ]);
        armPlaceTrigger(ctx, cardCode);
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE)!.activate(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            const ash = findCard(ctx, ashBlossom, LOCATION_HAND, 1);
            expect(ash?.canActivate()).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyProblem }),
            );
            return msg.prepareResponse([{ code: angelechyProblem }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyProblem, LOCATION_HAND),
            ).toBeDefined();
          });
      });
    });

    it("inflicts 500 damage when the opponent activates an effect", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEUP,
            },
            { code: blackHole, controller: 1, location: LOCATION_HAND },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());
        registerContinuousSpellType(ctx, 0, cardCode);
        endTurn(ctx)
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const hole = findCard(ctx, blackHole, LOCATION_HAND, 1);
            expect(hole?.canActivate()).toBe(true);
            return hole!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgDamage, (msg) => {
              expect(msg.player).toBe(1);
              expect(msg.value).toBe(500);
            });
            expect(ctx.getLP(1)).toBe(7500);
          });
      });
    });
  });
});
