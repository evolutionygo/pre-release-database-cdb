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
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305082;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const mysticalSpaceTyphoon = 5318639;
const cosmicCyclone = 8267140;
const mammoth = 40374923;

const {
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

describe("不信妄想症", () => {
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
    it("checks control filters and activate target from hand/set", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: summonedSkull,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local opp=Duel.GetFieldCard(1,LOCATION_MZONE,2)
          local own=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ret={
            c${cardCode}.cfilter2(opp,0),
            c${cardCode}.cfilter2(own,0),
            c${cardCode}.cfilter(opp,0),
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([true, false, true, true]);
      });
    });

    it("returns false for target without controllable opponent monsters", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_HAND });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ret=c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          Effect.GetHandler=oldHandler
          return ret
        `);
        expect(result).toBe(false);
      });
    });

    it("checks immune condition and trap monster summonability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local mon=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local eImm=Effect.CreateEffect(mon)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return mon end
          local con=c${cardCode}.efcon(eImm)
          Effect.GetHandler=oldHandler
          return {
            con,
            Duel.IsPlayerCanSpecialSummonMonster(0,${cardCode},0,TYPES_EFFECT_TRAP_MONSTER,4000,4000,10,RACE_FIEND,ATTRIBUTE_DARK)
          }
        `);

        expect(result[0]).toBe(false);
        expect(result[1]).toBe(true);
      });
    });
  });

  describe("e2e", () => {
    it("takes control of all opponent monsters in the same column", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 2,
              position: POS_FACEDOWN,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mammoth,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(trap).toBeDefined();
            expect(trap!.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 0)).toBeDefined();
            expect(findCard(ctx, mammoth, LOCATION_MZONE, 1)).toBeDefined();
            // 通常陷阱发动后进入墓地
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("special summons as a trap monster when set and destroyed by the opponent", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
            },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            return findCard(
              ctx,
              mysticalSpaceTyphoon,
              LOCATION_HAND,
              1,
            )!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: cardCode, controller: 0 }),
            );
            return findCard(ctx, cardCode, LOCATION_SZONE)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            const mon = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(mon).toBeDefined();
            expect(mon?.attack).toBe(4000);
            expect(mon?.defense).toBe(4000);
            expect(mon?.level).toBe(10);
          });
      });
    });

    it("special summons when set and banished by the opponent", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
            },
            {
              code: cosmicCyclone,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            return findCard(ctx, cosmicCyclone, LOCATION_HAND, 1)!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, cardCode, LOCATION_SZONE)!.select(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            expect(findCard(ctx, cardCode, LOCATION_REMOVED)).toBeDefined();
            return msg.prepareResponse(true);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
          });
      });
    });

    it("only allows one activation per turn by OATH", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 2,
              position: POS_FACEDOWN,
            },
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const traps = ctx
              .getFieldCard(0, LOCATION_SZONE)
              .filter((c) => c.code === cardCode);
            expect(traps.length).toBe(2);
            const activatable = traps.find((t) => t.canActivate());
            expect(activatable).toBeDefined();
            return activatable!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = ctx
              .getFieldCard(0, LOCATION_SZONE)
              .find((c) => c.code === cardCode && c.position === POS_FACEDOWN);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
          });
      });
    });
  });
});
