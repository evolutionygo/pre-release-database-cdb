import { resolve } from "node:path";
import {
  BattleCmdType,
  IdleCmdType,
  MapAdvancor,
  MapAdvancorHandler,
  NoEffectAdvancor,
  SelectCardAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectBattleCmd,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectPlace,
} from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 100266002;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const valkyrie = 12493482;
const mammoth = 40374923;
const effectMonster = 28985331;
const blackHole = 53129443;
const raigeki = 12580477;
const ashBlossom = 14558127;
const stardust = 44508094;

const {
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const addOpponentFaceUpField = (count: number) => {
  const cards: Array<{
    code: number;
    controller: number;
    location: number;
    sequence?: number;
    position?: number;
  }> = [];
  const pool = [
    { code: blueEyes, location: LOCATION_MZONE, position: POS_FACEUP_ATTACK },
    {
      code: summonedSkull,
      location: LOCATION_MZONE,
      sequence: 1,
      position: POS_FACEUP_ATTACK,
    },
    { code: blackHole, location: LOCATION_SZONE, position: POS_FACEUP },
    {
      code: raigeki,
      location: LOCATION_SZONE,
      sequence: 1,
      position: POS_FACEUP,
    },
    {
      code: mammoth,
      location: LOCATION_MZONE,
      sequence: 2,
      position: POS_FACEUP_ATTACK,
    },
  ];
  for (let i = 0; i < count; i += 1) {
    const entry = pool[i % pool.length];
    cards.push({
      code: entry.code,
      controller: 1,
      location: entry.location,
      sequence: entry.sequence,
      position: entry.position,
    });
  }
  return cards;
};

const goToPlayerOneBattlePhase = (ctx: YGOProTest) =>
  ctx
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_BP),
    )
    .advance(NoEffectAdvancor());

const passPlayerOneChain = (ctx: YGOProTest) =>
  ctx.state(YGOProMsgSelectChain, (msg) => {
    expect(msg.player).toBe(1);
    expect(msg.count).toBe(0);
    return msg.prepareResponse(null);
  });

const activateTrapFromChain = (ctx: YGOProTest) =>
  ctx.state(YGOProMsgSelectChain, (msg) => {
    expect(msg.player).toBe(0);
    expect(msg.chains).toContainEqual(
      expect.objectContaining({ code: cardCode }),
    );
    const trap = findCard(ctx, cardCode, LOCATION_SZONE);
    expect(trap?.canActivate()).toBe(true);
    return trap!.activate();
  });

const setTrapFromHand = (ctx: YGOProTest) =>
  ctx
    .state(YGOProMsgSelectIdleCmd, () => {
      const trap = findCard(ctx, cardCode, LOCATION_HAND)!;
      expect(trap.canSset()).toBe(true);
      return trap.sset();
    })
    .state(YGOProMsgSelectPlace, (msg) => {
      const place = msg
        .getSelectablePlaces()
        .find((p) => p.player === 0 && p.location === LOCATION_SZONE)!;
      return msg.prepareResponse([place]);
    })
    .advance(NoEffectAdvancor());

const confirmKnightEffect = (ctx: YGOProTest) =>
  ctx.advance(
    MapAdvancor(
      MapAdvancorHandler(YGOProMsgSelectEffectYn, (msg) =>
        msg.prepareResponse(true),
      ),
      MapAdvancorHandler(YGOProMsgSelectChain, (msg) => {
        if (msg.count === 0) {
          return msg.prepareResponse(null);
        }
        return undefined;
      }),
    ),
  );

const finishBattleAfterTrap = (ctx: YGOProTest) =>
  ctx
    .advance(NoEffectAdvancor())
    .state(YGOProMsgSelectBattleCmd, (msg) =>
      msg.prepareResponse(BattleCmdType.TO_EP),
    )
    .advance(SlientAdvancor());

const registerDestroyFieldQuickEffect = (ctx: YGOProTest) => {
  ctx.evaluate(`
    local c=Duel.GetFieldCard(1,LOCATION_MZONE,0)
    local e=Effect.CreateEffect(c)
    e:SetDescription(1)
    e:SetCategory(CATEGORY_DESTROY)
    e:SetType(EFFECT_TYPE_QUICK_O)
    e:SetCode(EVENT_FREE_CHAIN)
    e:SetRange(LOCATION_MZONE)
    e:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk)
      if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end
      local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
      Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
    end)
    e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp)
      local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
      Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
      local sg=g:Select(tp,1,1,nil)
      Duel.Destroy(sg,REASON_EFFECT)
    end)
    c:RegisterEffect(e)
  `);
};

describe("圣心防护罩 -心灵之力-", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("checks set-turn support and target availability with five face-up cards", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          ...addOpponentFaceUpField(5),
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.actcon(e),
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when opponent has fewer than five face-up cards", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          ...addOpponentFaceUpField(4),
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.actcon(e),
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([false, true]);
        coverageRegistry.addFrom(ctx);
      });
    });
  });

  describe("e2e", () => {
    it("activates on the highest-ATK opponent attack and destroys all opponent face-up cards", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_SZONE },
            ...addOpponentFaceUpField(2),
          ])
          .advance(SlientAdvancor());
        goToPlayerOneBattlePhase(ctx).state(YGOProMsgSelectBattleCmd, (msg) => {
          expect(msg.player).toBe(1);
          expect(msg.attackableCards).toContainEqual(
            expect.objectContaining({ code: blueEyes }),
          );
          return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.performAttack();
        });
        passPlayerOneChain(ctx);
        activateTrapFromChain(ctx);
        finishBattleAfterTrap(ctx).state(YGOProMsgSelectIdleCmd, () => {
          expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
          expect(ctx.getFieldCard(1, LOCATION_SZONE)).toHaveLength(0);
          expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          expect(findCard(ctx, blueEyes, LOCATION_GRAVE, 1)).toBeDefined();
          expect(findCard(ctx, summonedSkull, LOCATION_GRAVE, 1)).toBeDefined();
        });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("can be activated the turn it was set when the opponent controls five face-up cards", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: effectMonster, location: LOCATION_HAND, sequence: 1 },
            { code: summonedSkull, location: LOCATION_DECK },
            { code: ashBlossom, controller: 1, location: LOCATION_HAND },
            ...addOpponentFaceUpField(5),
          ])
          .advance(SlientAdvancor());
        setTrapFromHand(ctx)
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_SZONE)).toBeDefined();
            return findCard(ctx, effectMonster, LOCATION_HAND)!.summon();
          })
          .advance(SummonPlaceAdvancor());
        confirmKnightEffect(ctx)
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.player).toBe(1);
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: ashBlossom }),
            );
            return findCard(ctx, ashBlossom, LOCATION_HAND, 1)!.activate();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.player).toBe(0);
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            const trap = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(NoEffectAdvancor())
          .advance(
            SlientAdvancor(),
            SelectCardAdvancor({ code: summonedSkull }),
          )
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
            expect(ctx.getFieldCard(1, LOCATION_SZONE)).toHaveLength(0);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("activates when the opponent activates a monster effect that destroys a card on the field", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_SZONE },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());
        registerDestroyFieldQuickEffect(ctx);
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            const monster = findCard(ctx, summonedSkull, LOCATION_MZONE, 1);
            expect(monster?.canActivate(1)).toBe(true);
            return monster!.activate(1);
          });
        activateTrapFromChain(ctx);
        ctx.advance(SlientAdvancor(), NoEffectAdvancor(), NoEffectAdvancor());
        ctx.state(YGOProMsgSelectIdleCmd, () => {
          expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
          expect(findCard(ctx, valkyrie, LOCATION_MZONE)).toBeDefined();
        });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("activates during the player's turn when the opponent activates a hand monster effect", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_SZONE },
            { code: effectMonster, location: LOCATION_HAND },
            { code: summonedSkull, location: LOCATION_DECK },
            { code: ashBlossom, controller: 1, location: LOCATION_HAND },
            {
              code: valkyrie,
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
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, effectMonster, LOCATION_HAND)!.summon(),
          )
          .advance(SummonPlaceAdvancor());
        confirmKnightEffect(ctx)
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.player).toBe(1);
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: ashBlossom }),
            );
            return findCard(ctx, ashBlossom, LOCATION_HAND, 1)!.activate();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.player).toBe(0);
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            const trap = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(NoEffectAdvancor())
          .advance(
            SlientAdvancor(),
            SelectCardAdvancor({ code: summonedSkull }),
          )
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
            expect(
              findCard(ctx, summonedSkull, LOCATION_GRAVE, 1),
            ).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("prevents direct attacks until the end of the next turn after activation", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_SZONE },
            ...addOpponentFaceUpField(5),
            { code: valkyrie, location: LOCATION_HAND, sequence: 1 },
          ])
          .advance(SlientAdvancor());
        goToPlayerOneBattlePhase(ctx).state(YGOProMsgSelectBattleCmd, (msg) => {
          expect(msg.attackableCards).toContainEqual(
            expect.objectContaining({ code: blueEyes }),
          );
          return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.performAttack();
        });
        passPlayerOneChain(ctx);
        activateTrapFromChain(ctx);
        finishBattleAfterTrap(ctx)
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, valkyrie, LOCATION_HAND)!.summon(),
          )
          .advance(SummonPlaceAdvancor(), SlientAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_BP),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectBattleCmd, (msg) => {
            const valkyrieAttack = msg.attackableCards.find(
              (card) => card.code === valkyrie,
            );
            expect(valkyrieAttack?.directAttack).not.toBe(1);
            return msg.prepareResponse(BattleCmdType.TO_EP);
          });
        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_BP),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectBattleCmd, (msg) => {
            const valkyrieAttack = msg.attackableCards.find(
              (card) => card.code === valkyrie,
            );
            expect(valkyrieAttack?.directAttack).toBe(1);
            return msg.prepareResponse(BattleCmdType.TO_EP);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("allows stardust dragon to chain against the destroy effect", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_SZONE },
            ...addOpponentFaceUpField(2),
            {
              code: stardust,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());
        goToPlayerOneBattlePhase(ctx).state(YGOProMsgSelectBattleCmd, () =>
          findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.performAttack(),
        );
        passPlayerOneChain(ctx);
        activateTrapFromChain(ctx).state(YGOProMsgSelectChain, (msg) => {
          expect(msg.chains).toContainEqual(
            expect.objectContaining({ code: stardust }),
          );
          expect(
            findCard(ctx, stardust, LOCATION_MZONE, 1)?.canActivate(),
          ).toBe(true);
          return msg.prepareResponse(null);
        });
        finishBattleAfterTrap(ctx).state(YGOProMsgSelectIdleCmd, () => {
          expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
          expect(ctx.getFieldCard(1, LOCATION_SZONE)).toHaveLength(0);
        });

        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
