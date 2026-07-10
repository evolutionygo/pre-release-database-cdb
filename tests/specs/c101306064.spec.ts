import { resolve } from "node:path";
import {
  IdleCmdType,
  MapAdvancor,
  MapAdvancorHandler,
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  IndexResponse,
  OcgcoreScriptConstants,
  YGOProMsgConfirmCards,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectOption,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessage,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306064;
const lightAndDarknessRitual = 33599853;
const mysticalSpaceTyphoon = 5318639;
const harpieFeatherDuster = 18144506;
const blueEyes = 89631139;
const effectVeiler = 97268402;
const stardustDragon = 44508094;
const summonedSkull = 70781052;

const {
  HINT_SELECTMSG,
  HINTMSG_CONFIRM,
  HINTMSG_DESTROY,
  HINTMSG_FACEUP,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("魔法效果之剑", () => {
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
    it("checks filters and target availability for both options", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          {
            code: lightAndDarknessRitual,
            location: LOCATION_HAND,
            sequence: 1,
          },
          {
            code: mysticalSpaceTyphoon,
            controller: 1,
            location: LOCATION_SZONE,
            position: POS_FACEUP,
          },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: harpieFeatherDuster,
            controller: 1,
            location: LOCATION_SZONE,
            sequence: 1,
            position: POS_FACEDOWN,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local ritual=Duel.GetFieldCard(0,LOCATION_HAND,1)
          local spell=Duel.GetFieldCard(1,LOCATION_SZONE,0)
          local setspell=Duel.GetFieldCard(1,LOCATION_SZONE,1)
          local mon=Duel.GetFieldCard(1,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local can=c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return {
            c${cardCode}.desfilter(spell),
            c${cardCode}.desfilter(setspell),
            c${cardCode}.cfilter(ritual),
            c${cardCode}.cfilter(c),
            c${cardCode}.disfilter(mon),
            can
          }
        `);

        expect(result).toEqual([true, false, true, false, true, true]);
      });
    });

    it("returns false when neither option is available", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_HAND });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local can=c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return can
        `);

        expect(result).toBe(false);
      });
    });

    it("checks destroy trigger target availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            position: POS_FACEDOWN,
          },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          local withOpp=c${cardCode}.destg(e,0,nil,0,0,nil,0,0,0)
          return withOpp
        `);

        expect(result).toBe(true);
      });
    });

    it("returns false for destroy trigger when opponent has no cards", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({
          code: cardCode,
          location: LOCATION_SZONE,
          position: POS_FACEDOWN,
        });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.destg(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("destroys all face-up Spells on the opponent field", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEUP,
            },
            {
              code: harpieFeatherDuster,
              controller: 1,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
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
            const spell = findCard(ctx, cardCode, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.options.length).toBeGreaterThanOrEqual(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.count).toBe(0);
            return msg.prepareResponse(null);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, mysticalSpaceTyphoon, LOCATION_GRAVE, 1),
            ).toBeDefined();
            expect(
              findCard(ctx, harpieFeatherDuster, LOCATION_SZONE, 1),
            ).toBeDefined();
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("lets Stardust Dragon chain to the destroy-all-Spells option", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEUP,
            },
            {
              code: stardustDragon,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectOption, (msg) =>
            msg.prepareResponse(IndexResponse(0)),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            const stardust = findCard(ctx, stardustDragon, LOCATION_MZONE, 1);
            expect(stardust?.canActivate()).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, mysticalSpaceTyphoon, LOCATION_GRAVE, 1),
            ).toBeDefined();
          });
      });
    });

    it("reveals Ritual of Light and Darkness then sets ATK to 0 and negates", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: lightAndDarknessRitual,
              location: LOCATION_HAND,
              sequence: 1,
            },
            {
              code: effectVeiler,
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
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.options.length).toBeGreaterThanOrEqual(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_FACEUP,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: effectVeiler,
                controller: 1,
              }),
            );
            return findCard(ctx, effectVeiler, LOCATION_MZONE, 1)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_CONFIRM,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: lightAndDarknessRitual }),
            );
            return findCard(
              ctx,
              lightAndDarknessRitual,
              LOCATION_HAND,
            )!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgConfirmCards, (confirm) => {
              expect(confirm.cards).toContainEqual(
                expect.objectContaining({ code: lightAndDarknessRitual }),
              );
            });
            const mon = findCard(ctx, effectVeiler, LOCATION_MZONE, 1);
            expect(mon?.attack).toBe(0);
            expect(
              findCard(ctx, lightAndDarknessRitual, LOCATION_HAND),
            ).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("can reveal the Ritual from the GY for the negate option", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: lightAndDarknessRitual, location: LOCATION_GRAVE },
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
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectOption, (msg) =>
            msg.prepareResponse(IndexResponse(0)),
          )
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: lightAndDarknessRitual,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(
              ctx,
              lightAndDarknessRitual,
              LOCATION_GRAVE,
            )!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 1)?.attack).toBe(0);
            expect(
              findCard(ctx, lightAndDarknessRitual, LOCATION_GRAVE),
            ).toBeDefined();
          });
      });
    });

    it("only allows one copy to be activated per turn", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEUP,
            },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectOption, (msg) =>
            msg.prepareResponse(IndexResponse(0)),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = ctx
              .getFieldCard(0, LOCATION_HAND)
              .find((card) => card.code === cardCode);
            expect(remaining?.canActivate()).toBe(false);
          });
      });
    });

    it("when destroyed by the opponent, destroys a card from their hand", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_HAND,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_HAND,
              sequence: 1,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            const mst = findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND, 1);
            expect(mst?.canActivate()).toBe(true);
            return mst!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: cardCode, controller: 0 }),
            );
            return findCard(ctx, cardCode, LOCATION_SZONE)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            // 盖放的速攻魔法可连锁旋风发动，这里选择不连锁
            expect(msg.count).toBe(1);
            const setSpell = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(setSpell?.canActivate()).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(
            MapAdvancor(
              MapAdvancorHandler(YGOProMsgSelectChain, (msg) =>
                msg.prepareResponse(null),
              ),
            ),
          )
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            // 对方场上已无卡，②直接随机破坏手卡
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(ctx.getFieldCard(1, LOCATION_HAND)).toHaveLength(0);
            expect(
              findCard(ctx, summonedSkull, LOCATION_GRAVE, 1),
            ).toBeDefined();
          });
      });
    });

    it("when destroyed by the opponent, can destroy a card on their field", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_HAND,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_HAND,
              sequence: 1,
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
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, cardCode, LOCATION_SZONE)!.select(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(null);
          })
          .advance(
            MapAdvancor(
              MapAdvancorHandler(YGOProMsgSelectChain, (msg) =>
                msg.prepareResponse(null),
              ),
            ),
          )
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectOption, (msg) =>
            // 场上
            msg.prepareResponse(IndexResponse(1)),
          )
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_DESTROY,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes, controller: 1 }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: summonedSkull }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select();
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE, 1)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_HAND, 1),
            ).toBeDefined();
          });
      });
    });
  });
});
