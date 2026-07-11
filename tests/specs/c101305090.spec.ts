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
  YGOProMsgSelectSum,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  angelechyTrap,
  armPlaceTrigger,
  findCard,
  registerContinuousSpellType,
  synchroLevel9,
  tuner,
} from "../utility/angelechy-helpers";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305090;
const blackHole = 53129443;
const blueEyes = 89631139;
const ashBlossom = 14558127;
const ghostBelle = 73642296;

const {
  HINT_SELECTMSG,
  HINTMSG_ATOHAND,
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

describe("四军之具象天使", () => {
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
    it("checks remove target availability and trap search filters", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: angelechyTrap, location: LOCATION_DECK },
          { code: blackHole, location: LOCATION_DECK, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local opp=Duel.GetFieldCard(1,LOCATION_MZONE,0)
          local e1=Effect.CreateEffect(c)
          e1:SetCode(EFFECT_CHANGE_TYPE)
          e1:SetType(EFFECT_TYPE_SINGLE)
          e1:SetValue(TYPE_SPELL+TYPE_CONTINUOUS)
          c:RegisterEffect(e1,true)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r1=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,0,LOCATION_MZONE,1,nil)
          Duel.IsExistingTarget=old
          return {
            r1,
            c${cardCode}.rmfilter(opp),
            c${cardCode}.thfilter(Duel.GetFieldGroup(0,LOCATION_DECK,0):Filter(Card.IsCode,nil,${angelechyTrap}):GetFirst()),
            c${cardCode}.thfilter(Duel.GetFieldGroup(0,LOCATION_DECK,0):Filter(Card.IsCode,nil,${blackHole}):GetFirst()),
            c${cardCode}.thcon(e1,0,nil,0,0,nil,0,0),
            Duel.IsExistingMatchingCard(c${cardCode}.thfilter,0,LOCATION_DECK+LOCATION_GRAVE,0,1,nil)
          }
        `);

        expect(result).toEqual([true, true, true, false, true, true]);
      });
    });

    it("returns false for remove and search when no valid targets exist", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_MZONE });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_SINGLE)
          c:RegisterEffect(e)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r1=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,0,LOCATION_MZONE,1,nil)
          Duel.IsExistingTarget=old
          return {
            r1,
            c${cardCode}.thcon(e,0,nil,0,0,nil,0,0),
            Duel.IsExistingMatchingCard(c${cardCode}.thfilter,0,LOCATION_DECK+LOCATION_GRAVE,0,1,nil)
          }
        `);

        expect(result).toEqual([false, false, false]);
      });
    });

    it("econ is true only after more than 4 opponent monster activations", async () => {
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
        ]);
        registerContinuousSpellType(ctx, 0, cardCode);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_FIELD)
          e:SetRange(LOCATION_SZONE)
          c:RegisterEffect(e)
          local before=c${cardCode}.econ(e)
          for i=1,5 do c:RegisterFlagEffect(${cardCode},RESET_EVENT+0x3ff0000+RESET_PHASE+PHASE_END,0,1) end
          return { before, c${cardCode}.econ(e) }
        `);

        expect(result).toEqual([false, true]);
      });
    });
  });

  describe("e2e", () => {
    it("is Synchro Summoned as a Level 10 monster", async () => {
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
              code: synchroLevel9,
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
              expect.objectContaining({ code: synchroLevel9 }),
            );
            return findCard(ctx, synchroLevel9, LOCATION_MZONE)!.select();
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

    it("removes one opponent monster and cannot activate the effect again", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const synchro = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(synchro?.canActivate()).toBe(true);
            return synchro!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes, controller: 1 }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_REMOVED, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
          }),
      );
    });

    it("searches an Angelechy Trap when placed as a Continuous Spell", async () => {
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
          { code: angelechyTrap, location: LOCATION_DECK },
          { code: blackHole, location: LOCATION_DECK, sequence: 1 },
        ]);
        armPlaceTrigger(ctx, cardCode);
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const host = findCard(ctx, blueEyes, LOCATION_MZONE);
            expect(host?.canActivate()).toBe(true);
            return host!.activate();
          })
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
              expect.objectContaining({ code: angelechyTrap }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: blackHole }),
            );
            return msg.prepareResponse([{ code: angelechyTrap }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, angelechyTrap, LOCATION_HAND)).toBeDefined();
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
          { code: angelechyTrap, location: LOCATION_DECK },
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
              expect.objectContaining({ code: angelechyTrap }),
            );
            return msg.prepareResponse([{ code: angelechyTrap }]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, angelechyTrap, LOCATION_HAND)).toBeDefined();
          });
      });
    });

    it("allows Ghost Belle to chain when searching a Trap from the Graveyard", async () => {
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
          { code: angelechyTrap, location: LOCATION_GRAVE },
          {
            code: ghostBelle,
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
            const belle = findCard(ctx, ghostBelle, LOCATION_HAND, 1);
            expect(belle?.canActivate()).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: angelechyTrap,
                location: LOCATION_GRAVE,
              }),
            );
            return msg.prepareResponse([
              { code: angelechyTrap, location: LOCATION_GRAVE },
            ]);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, angelechyTrap, LOCATION_HAND)).toBeDefined();
          });
      });
    });
  });
});
