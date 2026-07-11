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
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305084;
const blueEyes = 89631139;
const thunderMonster = 11324436; // 电蛇
const stardust = 44508094;
const ghostBelle = 73642296;
const mysticalSpaceTyphoon = 5318639;
const monsterReborn = 83764718;

const {
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

describe("设陷雷轰稻草人", () => {
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
    it("checks non-Thunder face-up special summon filter and condition", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: thunderMonster,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local non=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local th=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local egOk=Group.FromCards(non)
          local egNg=Group.FromCards(th)
          local egSelf=Group.FromCards(c)
          local ret={
            c${cardCode}.cfilter(non),
            c${cardCode}.cfilter(th),
            c${cardCode}.descon(e,0,egOk,0,0,nil,0,0),
            c${cardCode}.descon(e,0,egNg,0,0,nil,0,0),
            c${cardCode}.descon(e,0,egSelf,0,0,nil,0,0),
            c${cardCode}.destg(e,0,egOk,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([true, false, true, false, false, true]);
      });
    });

    it("checks grave recycle target true/false and chkc", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_GRAVE },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: mysticalSpaceTyphoon,
            location: LOCATION_SZONE,
            position: POS_FACEDOWN,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${cardCode}):GetFirst()
          local face=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local setc=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          local ret={
            ok,
            c${cardCode}.tfilter(face),
            c${cardCode}.tfilter(setc),
            c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0,face),
            c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0,setc)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([true, true, false, true, false]);
      });
    });

    it("returns false for thtg without face-up card", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_GRAVE });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          Effect.GetHandler=oldHandler
          return ok
        `);
        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("triggers on non-Thunder face-up special summon, blocks attack, destroys at End Phase", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: monsterReborn, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, monsterReborn, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            return findCard(ctx, blueEyes, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, blueEyes, LOCATION_MZONE)).toBeDefined();
            const flagged = ctx.evaluate(`
              local tc=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${blueEyes}):GetFirst()
              return tc:GetFlagEffect(${cardCode})>0
            `);
            expect(flagged).toBe(true);
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE)).toBeUndefined();
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("does not trigger when a Thunder monster is special summoned", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: thunderMonster, location: LOCATION_GRAVE },
            { code: monsterReborn, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, monsterReborn, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, thunderMonster, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(findCard(ctx, thunderMonster, LOCATION_MZONE)).toBeDefined();
            const flagged = ctx.evaluate(`
              local tc=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${thunderMonster}):GetFirst()
              return tc:GetFlagEffect(${cardCode})>0
            `);
            expect(flagged).toBe(false);
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, thunderMonster, LOCATION_MZONE)).toBeDefined();
          });
      });
    });

    it("destroys own face-up card from grave and adds itself to hand, with chain checks", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: stardust,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: ghostBelle,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const gy = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(gy?.canActivate()).toBe(true);
            return gy!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: stardust, controller: 1 }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(
              findCard(ctx, ghostBelle, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            expect(
              findCard(ctx, stardust, LOCATION_MZONE, 1)?.canActivate(),
            ).toBe(true);
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: ghostBelle }),
                expect.objectContaining({ code: stardust }),
              ]),
            );
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_HAND)).toBeDefined();
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("only allows the grave effect once per turn", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            { code: cardCode, location: LOCATION_GRAVE, sequence: 1 },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_SZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_GRAVE)!.activate(),
          )
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, mysticalSpaceTyphoon, LOCATION_SZONE)!.select(),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
            expect(findCard(ctx, cardCode, LOCATION_HAND)).toBeDefined();
          });
      });
    });
  });
});
