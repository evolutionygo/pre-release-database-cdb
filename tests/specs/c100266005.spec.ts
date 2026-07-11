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
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectSum,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 100266005;
const effectVeiler = 97268402;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const mammoth = 40374923;
const raigeki = 12580477;
const darkHole = 53129443;
const ashBlossom = 14558127;
const ghostBelle = 73642296;
const cyberDragon = 70095154;

const {
  HINT_SELECTMSG,
  HINTMSG_DISCARD,
  HINTMSG_REMOVE,
  HINTMSG_RTOHAND,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  POS_FACEUP_ATTACK,
  SUMMON_TYPE_SYNCHRO,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const markSynchroSummoned = (ctx: YGOProTest, controller = 0) => {
  ctx.evaluate(`
    local c=Duel.GetFieldCard(${controller},LOCATION_MZONE,0)
    Debug.PreSummon(c,${SUMMON_TYPE_SYNCHRO})
  `);
};

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

describe("冰结界的龙胤 三千界龙", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("checks effect 3 condition and target availability", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
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
          { code: mammoth, controller: 1, location: LOCATION_GRAVE },
        ]);
        markSynchroSummoned(ctx);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local oldPrev=Card.IsPreviousLocation
          local oldTurn=Duel.GetTurnPlayer
          Card.IsPreviousLocation=function(card,loc)
            return card==c and loc==LOCATION_MZONE
          end
          Duel.GetTurnPlayer=function() return 1 end
          local ok=c${cardCode}.rmcon2(e,0,nil,0,0,nil,0,0)
          local tg=c${cardCode}.rmtg2(e,0,nil,0,0,nil,0,0,0)
          Duel.GetTurnPlayer=function() return 0 end
          local ownTurn=c${cardCode}.rmcon2(e,0,nil,0,0,nil,0,0)
          Card.IsPreviousLocation=function(card,loc)
            return false
          end
          Duel.GetTurnPlayer=function() return 1 end
          local notFromField=c${cardCode}.rmcon2(e,0,nil,0,0,nil,0,0)
          Effect.GetHandler=oldHandler
          Card.IsPreviousLocation=oldPrev
          Duel.GetTurnPlayer=oldTurn
          return {ok,tg,ownTurn,notFromField,c:IsSummonType(SUMMON_TYPE_SYNCHRO)}
        `);

        expect(result).toEqual([true, true, false, false, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("rejects effect 3 when the monster was not Synchro Summoned", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
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
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local oldPrev=Card.IsPreviousLocation
          local oldTurn=Duel.GetTurnPlayer
          Card.IsPreviousLocation=function(card,loc)
            return card==c and loc==LOCATION_MZONE
          end
          Duel.GetTurnPlayer=function() return 1 end
          local ok=c${cardCode}.rmcon2(e,0,nil,0,0,nil,0,0)
          Effect.GetHandler=oldHandler
          Card.IsPreviousLocation=oldPrev
          Duel.GetTurnPlayer=oldTurn
          return ok
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("checks effect 1/2 cost and target availability", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: effectVeiler, location: LOCATION_HAND },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: summonedSkull,
            controller: 1,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          { code: mammoth, controller: 1, location: LOCATION_GRAVE },
        ]);
        markSynchroSummoned(ctx);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local eg=Group.CreateGroup()
          local opp=Duel.GetFieldCard(1,LOCATION_MZONE,0)
          eg:AddCard(opp)
          local oldSummonPlayer=Card.IsSummonPlayer
          Card.IsSummonPlayer=function(card,p)
            return card==opp and p==1
          end
          local ret={
            c${cardCode}.rmcon(e,0,nil,0,0,nil,0,0),
            c${cardCode}.rmcost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.rmtg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          Card.IsSummonPlayer=oldSummonPlayer
          return ret
        `);

        expect(result).toEqual([true, true, true, true, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false for effect 1/2 when requirements are missing", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local eg=Group.CreateGroup()
          eg:AddCard(c)
          local ret={
            c${cardCode}.rmcon(e,0,nil,0,0,nil,0,0),
            c${cardCode}.rmcost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.rmtg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thcon(e,0,eg,0,0,nil,0,0),
            c${cardCode}.thcost(e,0,nil,0,0,nil,0,0,0)
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([false, false, false, false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });
  });

  describe("e2e", () => {
    it("triggers effect 3 on opponent turn and banishes a field card", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
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
          { code: raigeki, controller: 1, location: LOCATION_HAND },
        ]);
        markSynchroSummoned(ctx);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, raigeki, LOCATION_HAND, 1);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: blueEyes,
                location: LOCATION_MZONE,
                controller: 1,
              }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_REMOVED, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("lets effect 3 banish a random hand card when chosen", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
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
          {
            code: summonedSkull,
            controller: 1,
            location: LOCATION_HAND,
            sequence: 0,
          },
          {
            code: raigeki,
            controller: 1,
            location: LOCATION_HAND,
            sequence: 1,
          },
        ]);
        markSynchroSummoned(ctx);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, raigeki, LOCATION_HAND, 1)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, summonedSkull, LOCATION_REMOVED, 1),
            ).toBeDefined();
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("does not offer effect 3 during the owner's turn", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: darkHole, location: LOCATION_HAND },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);
        markSynchroSummoned(ctx);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, darkHole, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(
              ctx.allMessages.some(
                (msg) =>
                  msg instanceof YGOProMsgSelectEffectYn &&
                  msg.code === cardCode,
              ),
            ).toBe(false);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("does not offer effect 3 when the monster was not Synchro Summoned", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
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
          { code: raigeki, controller: 1, location: LOCATION_HAND },
        ]);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, raigeki, LOCATION_HAND, 1)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(
              ctx.allMessages.some(
                (msg) =>
                  msg instanceof YGOProMsgSelectEffectYn &&
                  msg.code === cardCode,
              ),
            ).toBe(false);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("allows Ghost Belle to chain when effect 3 banishes from the GY", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: mammoth, controller: 1, location: LOCATION_GRAVE },
          { code: raigeki, controller: 1, location: LOCATION_HAND },
          {
            code: ghostBelle,
            controller: 1,
            location: LOCATION_HAND,
            sequence: 1,
          },
        ]);
        markSynchroSummoned(ctx);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, raigeki, LOCATION_HAND, 1)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
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
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(false))
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: mammoth,
                location: LOCATION_GRAVE,
                controller: 1,
              }),
            );
            return findCard(ctx, mammoth, LOCATION_GRAVE, 1)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, mammoth, LOCATION_REMOVED, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("cannot activate effect 3 again in the same turn after using it", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: cardCode,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
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
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          { code: raigeki, controller: 1, location: LOCATION_HAND },
        ]);
        ctx.evaluate(`
          local g=Duel.GetFieldGroup(0,LOCATION_MZONE,0)
          for tc in aux.Next(g) do
            Debug.PreSummon(tc,${SUMMON_TYPE_SYNCHRO})
          end
        `);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, raigeki, LOCATION_HAND, 1)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            // 两张同名卡同时满足③时，用连锁窗口选择发动
            expect(msg.player).toBe(0);
            expect(msg.chains.length).toBeGreaterThanOrEqual(1);
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: cardCode }),
              ]),
            );
            const chain = msg.chains.find((c) => c.code === cardCode)!;
            return msg.prepareResponse(chain);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select(),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_REMOVED, 1)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_MZONE, 1),
            ).toBeDefined();
            const activateCount = ctx.allMessages.filter(
              (msg) =>
                (msg instanceof YGOProMsgSelectEffectYn &&
                  msg.code === cardCode) ||
                (msg instanceof YGOProMsgSelectChain &&
                  msg.chains.some((c) => c.code === cardCode)),
            ).length;
            // 卡名1回合1次：同时送墓也只能发动其中1次
            expect(activateCount).toBe(1);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("Synchro Summons and resolves effect 1 by banishing 2 opponent cards", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: effectVeiler,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            { code: ashBlossom, location: LOCATION_HAND },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mammoth,
              controller: 1,
              location: LOCATION_GRAVE,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const synchro = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(synchro?.canSpecialSummon()).toBe(true);
            return synchro!.specialSummon();
          })
          .advance(
            MapAdvancor(
              MapAdvancorHandler(YGOProMsgSelectCard, (msg) => {
                const hasVeiler = msg.cards.some(
                  (c) => c.code === effectVeiler,
                );
                const hasBlueEyes = msg.cards.some((c) => c.code === blueEyes);
                if (hasVeiler && hasBlueEyes) {
                  return msg.prepareResponse([
                    { code: effectVeiler },
                    { code: blueEyes },
                  ]);
                }
                if (hasVeiler) {
                  return findCard(ctx, effectVeiler, LOCATION_MZONE)!.select();
                }
                if (hasBlueEyes) {
                  return findCard(ctx, blueEyes, LOCATION_MZONE)!.select();
                }
                return undefined;
              }),
              MapAdvancorHandler(YGOProMsgSelectSum, (msg) => {
                expect(msg.cards).toContainEqual(
                  expect.objectContaining({ code: blueEyes }),
                );
                return msg.prepareResponse([{ code: blueEyes }]);
              }),
            ),
            SummonPlaceAdvancor(),
            NoEffectAdvancor(),
          )
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_DISCARD,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: ashBlossom }),
            );
            return findCard(ctx, ashBlossom, LOCATION_HAND)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  code: summonedSkull,
                  location: LOCATION_MZONE,
                }),
                expect.objectContaining({
                  code: mammoth,
                  location: LOCATION_GRAVE,
                }),
              ]),
            );
            return msg.prepareResponse([
              { code: summonedSkull },
              { code: mammoth },
            ]);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_REMOVED, 1),
            ).toBeDefined();
            expect(findCard(ctx, mammoth, LOCATION_REMOVED, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("resolves effect 2 when the opponent Special Summons", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: effectVeiler, location: LOCATION_HAND },
          { code: cyberDragon, controller: 1, location: LOCATION_HAND },
        ]);
        markSynchroSummoned(ctx);

        goToOpponentMainPhase(ctx)
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cyberDragon, LOCATION_HAND, 1);
            expect(monster?.canSpecialSummon()).toBe(true);
            return monster!.specialSummon();
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
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: effectVeiler }),
            );
            return findCard(ctx, effectVeiler, LOCATION_HAND)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_RTOHAND,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: cyberDragon,
                location: LOCATION_MZONE,
                controller: 1,
              }),
            );
            return findCard(ctx, cyberDragon, LOCATION_MZONE, 1)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, effectVeiler, LOCATION_REMOVED)).toBeDefined();
            expect(findCard(ctx, cyberDragon, LOCATION_HAND, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
