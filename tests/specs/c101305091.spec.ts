import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectSum,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  armPlaceTrigger,
  endTurn,
  findCard,
  registerContinuousSpellType,
  synchroLevel7,
  tuner,
} from "../utility/angelechy-helpers";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305091;
const shatranga = 101305090;
const destrier = 101305092;
const valkyrie = 12493482;
const blueEyes = 89631139;
const blackHole = 53129443;

const {
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

describe("牙城之具象天使", () => {
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
    it("checks same-column remove targets and Shatranga placement filters", async () => {
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
              location: LOCATION_SZONE,
              sequence: 2,
              position: POS_FACEUP,
            },
            {
              code: destrier,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: shatranga, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local same=Duel.GetFieldCard(0,LOCATION_SZONE,2)
          local other=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local col=c:GetColumnGroup()
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_FIELD)
          c:RegisterEffect(e)
          local e1=Effect.CreateEffect(c)
          e1:SetCode(EFFECT_CHANGE_TYPE)
          e1:SetType(EFFECT_TYPE_SINGLE)
          e1:SetValue(TYPE_SPELL+TYPE_CONTINUOUS)
          c:RegisterEffect(e1,true)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r3=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,LOCATION_ONFIELD,LOCATION_ONFIELD,1,c,col)
          Duel.IsExistingTarget=old
          return {
            c${cardCode}.rmfilter(same,col),
            c${cardCode}.rmfilter(other,col),
            r3,
            c${cardCode}.setfilter(Duel.GetFieldGroup(0,LOCATION_EXTRA,0):Filter(Card.IsCode,nil,${shatranga}):GetFirst()),
            c${cardCode}.setcon(e1,0,nil,0,0,nil,0,0),
            Duel.IsExistingMatchingCard(c${cardCode}.setfilter,0,LOCATION_EXTRA,0,1,nil)
              and Duel.GetLocationCount(0,LOCATION_SZONE)>0,
            c${cardCode}.indtg(e,Duel.GetFieldGroup(0,LOCATION_MZONE,0):Filter(Card.IsCode,nil,${destrier}):GetFirst()),
            c${cardCode}.indtg(e,c)
          }
        `);

        expect(result).toEqual([
          true,
          false,
          true,
          true,
          true,
          true,
          true,
          false,
        ]);
      });
    });

    it("returns false when no same-column card can be removed", async () => {
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
          local col=c:GetColumnGroup()
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local r=Duel.IsExistingTarget(c${cardCode}.rmfilter,0,LOCATION_ONFIELD,LOCATION_ONFIELD,1,c,col)
          Duel.IsExistingTarget=old
          return r
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("is Synchro Summoned as a Level 8 monster", async () => {
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
              code: synchroLevel7,
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
              expect.objectContaining({ code: synchroLevel7 }),
            );
            return findCard(ctx, synchroLevel7, LOCATION_MZONE)!.select();
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

    it("removes a card in the same column and cannot activate again", async () => {
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
              code: valkyrie,
              location: LOCATION_SZONE,
              sequence: 2,
              position: POS_FACEUP,
            },
            {
              code: blackHole,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const bastion = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(bastion?.canActivate()).toBe(true);
            return bastion!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: valkyrie }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: blackHole }),
            );
            return findCard(ctx, valkyrie, LOCATION_SZONE)!.select();
          })
          .advance(SlientAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, valkyrie, LOCATION_REMOVED)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
          }),
      );
    });

    it("places Shatranga as a Continuous Spell when itself is placed as one", async () => {
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
          { code: shatranga, location: LOCATION_EXTRA },
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
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: shatranga,
                location: LOCATION_EXTRA,
              }),
            );
            return msg.prepareResponse([{ code: shatranga }]);
          })
          .advance(SummonPlaceAdvancor(), SlientAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_SZONE)).toBeDefined();
            expect(findCard(ctx, shatranga, LOCATION_SZONE)).toBeDefined();
            const isContinuous = ctx.evaluate(`
              local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${shatranga}):GetFirst()
              return c and c:GetType()==TYPE_SPELL+TYPE_CONTINUOUS
            `);
            expect(isContinuous).toBe(true);
          });
      });
    });

    it("keeps other face-up Angelechy cards from being destroyed by effects", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEUP,
            },
            {
              code: destrier,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            { code: blackHole, controller: 1, location: LOCATION_HAND },
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
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, destrier, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_SZONE)).toBeDefined();
            expect(findCard(ctx, valkyrie, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });
  });
});
