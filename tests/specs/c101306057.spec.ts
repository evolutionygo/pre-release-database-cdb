import { resolve } from "node:path";
import {
  IdleCmdType,
  NoEffectAdvancor,
  SelectCardAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSet,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306057;
const zhusha = 101306039;
const genkiTrapA = 101306073;
const genkiTrapB = 101306074;
const preexistingSet = 53129443;

const {
  LOCATION_SZONE,
  LOCATION_MZONE,
  LOCATION_GRAVE,
  LOCATION_EXTRA,
  POS_FACEUP,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("艮神鬼门 三千世界", () => {
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
    it("does not trigger when only genki exists and the set card is the first facedown", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 101306009,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
        ]);

        // eg 为刚盖放的那张里侧：盖放前场上没有其他里侧，不应满足②条件
        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local setc=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(setc)
          return {
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcon2(e,0,eg,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("triggers when genki and another facedown already exist before the new set", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 101306009,
            location: LOCATION_MZONE,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
          {
            code: 84749824,
            location: LOCATION_SZONE,
            sequence: 1,
            position: POS_FACEDOWN,
          },
        ]);

        // eg 为新盖放的卡；场上另有里侧，应满足②条件
        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local preexisting=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local newlyset=Duel.GetFieldCard(0,LOCATION_SZONE,1)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(newlyset)
          return {
            preexisting:IsFacedown(),
            newlyset:IsFacedown(),
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcon2(e,0,eg,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([true, true, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false without genki monster", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: 53129443,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
          {
            code: 84749824,
            location: LOCATION_SZONE,
            sequence: 1,
            position: POS_FACEDOWN,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local newlyset=Duel.GetFieldCard(0,LOCATION_SZONE,1)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(newlyset)
          return c${cardCode}.thcon(e,0,eg,0,0,nil,0,0)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });

  describe("e2e", () => {
    it("still offers effect 2 after 朱沙之王 sets 2 cards then leaves, when condition was met at set timing", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 5,
              position: POS_FACEUP,
            },
            {
              code: zhusha,
              location: LOCATION_MZONE,
              position: POS_FACEUP,
            },
            {
              code: preexistingSet,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            { code: genkiTrapA, location: LOCATION_GRAVE },
            { code: genkiTrapB, location: LOCATION_GRAVE, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(findCard(ctx, zhusha, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(zhusha);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            const codes = msg.cards.map((c) => c.code);
            expect(codes).toEqual(
              expect.arrayContaining([genkiTrapA, genkiTrapB]),
            );
            return SelectCardAdvancor(
              { code: genkiTrapA, location: LOCATION_GRAVE },
              { code: genkiTrapB, location: LOCATION_GRAVE },
            );
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards.map((c) => c.code)).toEqual(
              expect.arrayContaining([genkiTrapA, genkiTrapB]),
            );
            return findCard(ctx, genkiTrapA, LOCATION_GRAVE)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, genkiTrapB, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.finishable).toBeTruthy();
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            // 盖放时有艮鬼+原有里侧，处理后朱沙之王已回额外，场上无艮鬼
            expect(findCard(ctx, zhusha, LOCATION_MZONE)).toBeUndefined();
            expect(
              ctx
                .getFieldCard(0, LOCATION_EXTRA)
                .some((c) => c.code === zhusha),
            ).toBe(true);
            expectCurrentMessages(ctx, YGOProMsgSet);

            // 按规则：盖放时点已满足条件，延迟诱发仍应可发动
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards.length).toBeGreaterThan(0);
            const target =
              findCard(ctx, preexistingSet, LOCATION_SZONE) ??
              findCard(ctx, genkiTrapA, LOCATION_SZONE) ??
              findCard(ctx, genkiTrapB, LOCATION_SZONE);
            expect(target).toBeDefined();
            return target!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            // ② 已发动并选对象回手，朱沙之王仍在额外
            expect(
              ctx
                .getFieldCard(0, LOCATION_EXTRA)
                .some((c) => c.code === zhusha),
            ).toBe(true);
            expect(findCard(ctx, zhusha, LOCATION_MZONE)).toBeUndefined();
          });
      });
    });
  });
});
