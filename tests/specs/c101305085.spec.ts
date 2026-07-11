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
  YGOProMsgAnnounceAttrib,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
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

const cardCode = 101305085;
const blueEyes = 89631139;
const darkMagician = 46986414;
const possessedWynn = 60516416;
const harpieLady = 76812113;
const solemnWarning = 84749824;
const ghostBelle = 73642296;

const {
  ATTRIBUTE_LIGHT,
  ATTRIBUTE_WATER,
  HINT_SELECTMSG,
  HINTMSG_FACEUP,
  HINTMSG_SPSUMMON,
  LOCATION_EXTRA,
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

const goToOpponentMainPhase = (ctx: YGOProTest) =>
  ctx
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) => {
      expect(msg.player).toBe(1);
    });

describe("权柄交络者 米克修希亚", () => {
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
    it("checks cosfilter and costg availability", async () => {
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
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local tc=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.costg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return {
            c${cardCode}.cosfilter(tc),
            c${cardCode}.cosfilter(c),
            ok
          }
        `);

        expect(result).toEqual([true, true, true]);
      });
    });

    it("returns false for costg when no face-up monster exists", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_GRAVE });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(c)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.costg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          return ok
        `);

        expect(result).toBe(false);
      });
    });

    it("checks fspcon and fsptg true/false", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: harpieLady, location: LOCATION_GRAVE },
            { code: possessedWynn, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect)
            if effect==e then return c end
            return oldHandler(effect)
          end
          local oldTurn=Duel.GetTurnPlayer
          local oldMain=Duel.IsMainPhase
          Duel.GetTurnPlayer=function() return 1 end
          Duel.IsMainPhase=function() return true end
          local conOk=c${cardCode}.fspcon(e,0,nil,0,0,nil,0,0)
          local tgOk=c${cardCode}.fsptg(e,0,nil,0,0,nil,0,0,0)
          Duel.GetTurnPlayer=function() return 0 end
          local ownTurn=c${cardCode}.fspcon(e,0,nil,0,0,nil,0,0)
          Duel.IsMainPhase=function() return false end
          Duel.GetTurnPlayer=function() return 1 end
          local notMain=c${cardCode}.fspcon(e,0,nil,0,0,nil,0,0)
          Effect.GetHandler=oldHandler
          Duel.GetTurnPlayer=oldTurn
          Duel.IsMainPhase=oldMain
          return {conOk,tgOk,ownTurn,notMain}
        `);

        expect(result).toEqual([true, true, false, false]);
      });
    });

    it("returns false for fsptg without fusion materials", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: possessedWynn, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect)
            if effect==e then return c end
            return oldHandler(effect)
          end
          local ok=c${cardCode}.fsptg(e,0,nil,0,0,nil,0,0,0)
          Effect.GetHandler=oldHandler
          return ok
        `);

        expect(result).toBe(false);
      });
    });

    it("atttg chk==0 is always available from the GY", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, location: LOCATION_GRAVE });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_GRAVE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.atttg(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(true);
      });
    });
  });

  describe("e2e", () => {
    it("① changes a face-up monster's Attribute", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
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
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_FACEUP,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: blueEyes }),
                expect.objectContaining({ code: cardCode }),
              ]),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE)!.select();
          })
          .state(YGOProMsgAnnounceAttrib, (msg) =>
            msg.prepareResponse(ATTRIBUTE_WATER),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const attr = ctx.evaluate(`
              return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${blueEyes}):GetFirst():GetAttribute()
            `);
            expect(attr).toBe(ATTRIBUTE_WATER);
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
          });
      });
    });

    it("② fusion summons during the opponent Main Phase by banishing field and GY", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: harpieLady, location: LOCATION_GRAVE },
          { code: possessedWynn, location: LOCATION_EXTRA },
          { code: 5318639, controller: 1, location: LOCATION_HAND },
          {
            code: solemnWarning,
            controller: 1,
            location: LOCATION_SZONE,
            position: POS_FACEDOWN,
          },
          {
            code: ghostBelle,
            controller: 1,
            location: LOCATION_HAND,
            sequence: 1,
          },
        ]);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, 5318639, LOCATION_HAND, 1);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, solemnWarning, LOCATION_SZONE, 1)!.select(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.player).toBe(0);
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            // 神之警告可连锁融合特召
            if (msg.chains.some((c) => c.code === solemnWarning)) {
              expect(
                findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
              ).toBe(true);
            }
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
              expect.objectContaining({ code: possessedWynn }),
            );
            return findCard(ctx, possessedWynn, LOCATION_EXTRA)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, cardCode, LOCATION_MZONE)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: harpieLady }),
            );
            return findCard(ctx, harpieLady, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, possessedWynn, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_REMOVED)).toBeDefined();
            expect(findCard(ctx, harpieLady, LOCATION_REMOVED)).toBeDefined();
          });
      });
    });

    it("③ declares an Attribute from the GY until the End Phase", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([{ code: cardCode, location: LOCATION_GRAVE }])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgAnnounceAttrib, (msg) =>
            msg.prepareResponse(ATTRIBUTE_LIGHT),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const attr = ctx.evaluate(`
              return Duel.GetFieldCard(0,LOCATION_GRAVE,0):GetAttribute()
            `);
            expect(attr).toBe(ATTRIBUTE_LIGHT);
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)?.canActivate()).toBe(
              false,
            );
          });
      });
    });

    it("blocks a second copy of ① in the same turn", async () => {
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
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: darkMagician,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, darkMagician, LOCATION_MZONE)!.select(),
          )
          .state(YGOProMsgAnnounceAttrib, (msg) =>
            msg.prepareResponse(ATTRIBUTE_WATER),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const copies = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((card) => card.code === cardCode);
            expect(copies.every((card) => !card.canActivate())).toBe(true);
          });
      });
    });
  });
});
