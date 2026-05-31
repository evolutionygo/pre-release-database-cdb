import {
  BattleCmdType,
  type CardHandle,
  IdleCmdType,
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgAddCounter,
  YGOProMsgDraw,
  YGOProMsgSelectBattleCmd,
  YGOProMsgSelectCard,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentMessage,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createTest } from "../utility/create-test";

const cardCode = 101306045;
const crownCounter = 0x77;

const level3Monsters = [114932, 1006081];
const downerdMagician = 72167543;
const rank3Control = 1426714;
const beastMaterial = 2619149;
const secondBeastMaterial = 1371589;
const overAtkBeast = 340002;
const defender = 40640057;
const ashBlossom = 14558127;
const drawCards = [28985331, 5560911, 89631139];

const {
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_HAND,
  LOCATION_MZONE,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const getCounter = (card: CardHandle | undefined, counterType: number) =>
  card?.counters?.find((counter) => counter.type === counterType)?.count ?? 0;

const addPreCounters = (ctx: YGOProTest, player: number, count: number) => {
  if (count === 0) return;
  ctx.evaluate(`
    local c=Duel.GetFieldCard(${player},LOCATION_MZONE,0)
    Debug.PreAddCounter(c,${crownCounter},${count})
  `);
};

const goToPlayerOneBattlePhase = (flow: YGOProTest) =>
  flow
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg: YGOProMsgSelectIdleCmd) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg: YGOProMsgSelectIdleCmd) =>
      msg.prepareResponse(IdleCmdType.TO_BP),
    )
    .advance(NoEffectAdvancor());

const triggerBattleDestroyEffect = (ctx: YGOProTest) =>
  ctx
    .state(YGOProMsgSelectBattleCmd, (msg: YGOProMsgSelectBattleCmd) => {
      expect(msg.player).toBe(1);
      expect(msg.attackableCards).toContainEqual(
        expect.objectContaining({ code: cardCode }),
      );
      const attacker = findCard(ctx, cardCode, LOCATION_MZONE, 1);
      expect(attacker?.canPerformAttack()).toBe(true);
      return attacker!.performAttack();
    })
    .state(YGOProMsgSelectCard, (msg: YGOProMsgSelectCard) => {
      expect(msg.cards).toContainEqual(
        expect.objectContaining({ code: defender }),
      );
      const target = findCard(ctx, defender, LOCATION_MZONE);
      expect(target?.canSelect()).toBe(true);
      return target!.select();
    })
    .advance(NoEffectAdvancor());

describe("燦冠乗騎シックラヴィー", () => {
  describe("unit", () => {
    it("returns true and false for summon filters, target checks, and predicted categories", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
          { code: beastMaterial, location: LOCATION_MZONE, sequence: 1 },
          { code: overAtkBeast, location: LOCATION_MZONE, sequence: 2 },
          {
            code: 7264861,
            location: LOCATION_MZONE,
            sequence: 3,
            position: OcgcoreScriptConstants.POS_FACEDOWN_DEFENSE,
          },
          { code: 89631139, location: LOCATION_MZONE, sequence: 4 },
        ]);

        const result = ctx.evaluate(`
          local fieldcard=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local beast=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local overatk=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local facedown=Duel.GetFieldCard(0,LOCATION_MZONE,3)
          local nonbeast=Duel.GetFieldCard(0,LOCATION_MZONE,4)
          local fe=Effect.CreateEffect(fieldcard)
          local be=Effect.CreateEffect(beast)
          return {
            c${cardCode}.ovfilter(beast),
            c${cardCode}.ovfilter(overatk),
            c${cardCode}.ovfilter(facedown),
            c${cardCode}.ovfilter(nonbeast),
            c${cardCode}.cttg(fe,0,nil,0,0,nil,0,0,0),
            c${cardCode}.cttg(be,0,nil,0,0,nil,0,0,0),
            c${cardCode}.predcat(1)==CATEGORY_ATKCHANGE,
            c${cardCode}.predcat(2)==CATEGORY_ATKCHANGE,
            c${cardCode}.predcat(3)==CATEGORY_TOEXTRA+CATEGORY_DRAW,
            c${cardCode}.predcat(4)==0
          }
        `);

        expect(result).toEqual([
          true,
          false,
          false,
          false,
          true,
          true,
          true,
          true,
          true,
          true,
        ]);
      });
    });
  });

  describe("e2e", () => {
    it("is Xyz Summoned with two Level 3 monsters", async () => {
      await createTest({}, (ctx) =>
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            ...level3Monsters.map((code, sequence) => ({
              code,
              location: LOCATION_MZONE,
              sequence,
            })),
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            for (const code of level3Monsters) {
              expect(msg.cards).toContainEqual(
                expect.objectContaining({ code }),
              );
            }
            return msg.prepareResponse(
              level3Monsters.map((code) => ({ code })),
            );
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards).toEqual(
              expect.arrayContaining(level3Monsters),
            );
          }),
      );
    });

    it("is excluded from Downerd Magician materials while another Rank 3 is selectable", async () => {
      await createTest({}, (ctx) =>
        ctx
          .addCard([
            { code: downerdMagician, controller: 1, location: LOCATION_EXTRA },
            {
              code: cardCode,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: rank3Control,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_BP),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectBattleCmd, (msg) => {
            expect(msg.canM2).toBe(1);
            return msg.prepareResponse(BattleCmdType.TO_M2);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const downerd = findCard(ctx, downerdMagician, LOCATION_EXTRA, 1);
            expect(downerd?.canSpecialSummon()).toBe(true);
            return downerd!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: rank3Control }),
            );
            expect(msg.selectableCards).not.toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            const control = findCard(ctx, rank3Control, LOCATION_MZONE, 1);
            return control!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const custom = findCard(ctx, cardCode, LOCATION_MZONE, 1);
            expect(custom).toBeDefined();
            const downerd = findCard(ctx, downerdMagician, LOCATION_MZONE, 1);
            expect(downerd?.overlayCards).toEqual(
              expect.arrayContaining([rank3Control]),
            );
            expect(downerd?.overlayCards).not.toContain(cardCode);
          }),
      );
    });

    it("only allows one alternative Xyz Summon per turn with two valid Beasts", async () => {
      await createTest({}, (ctx) =>
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA, sequence: 0 },
            { code: cardCode, location: LOCATION_EXTRA, sequence: 1 },
            { code: beastMaterial, location: LOCATION_MZONE, sequence: 0 },
            {
              code: secondBeastMaterial,
              location: LOCATION_MZONE,
              sequence: 1,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: beastMaterial }),
            );
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: secondBeastMaterial }),
            );
            const material = findCard(ctx, beastMaterial, LOCATION_MZONE);
            return material!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards).toEqual(
              expect.arrayContaining([beastMaterial]),
            );
            expect(
              findCard(ctx, secondBeastMaterial, LOCATION_MZONE),
            ).toBeDefined();
            const remaining = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(remaining?.canSpecialSummon()).toBe(false);
          }),
      );
    });

    it.each([
      { before: 0, attack: 2400, counter: 1 },
      { before: 1, attack: 2600, counter: 2 },
    ])(
      "adds the $counter crown counter and applies the ATK branch",
      async ({ before, attack, counter }) => {
        await createTest({}, (ctx) => {
          const flow = ctx.addCard([
            {
              code: cardCode,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: defender,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
          ]);
          addPreCounters(ctx, 1, before);

          return triggerBattleDestroyEffect(
            goToPlayerOneBattlePhase(flow),
          ).state(YGOProMsgSelectBattleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgAddCounter, (msg) => {
              expect(msg.counterType).toBe(crownCounter);
              expect(msg.controller).toBe(1);
              expect(msg.count).toBe(1);
            });
            const attacker = findCard(ctx, cardCode, LOCATION_MZONE, 1);
            expect(attacker?.attack).toBe(attack);
            expect(getCounter(attacker, crownCounter)).toBe(counter);
          });
        });
      },
    );

    it("returns itself to the Extra Deck and draws 3 when the predicted counter count is 3", async () => {
      await createTest({}, (ctx) => {
        const flow = ctx.addCard([
          {
            code: cardCode,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: defender,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: ashBlossom, location: LOCATION_HAND },
          ...drawCards.map((code, sequence) => ({
            code,
            controller: 1,
            location: LOCATION_DECK,
            sequence,
          })),
        ]);
        addPreCounters(ctx, 1, 2);

        return triggerBattleDestroyEffect(goToPlayerOneBattlePhase(flow)).state(
          YGOProMsgSelectBattleCmd,
          () => {
            expectCurrentMessage(ctx, YGOProMsgAddCounter, (msg) => {
              expect(msg.counterType).toBe(crownCounter);
              expect(msg.controller).toBe(1);
              expect(msg.count).toBe(1);
            });
            expectCurrentMessage(ctx, YGOProMsgDraw, (msg) => {
              expect(msg.player).toBe(1);
              expect(msg.count).toBe(3);
            });
            expect(findCard(ctx, cardCode, LOCATION_EXTRA, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE, 1)).toBeUndefined();
            expect(ctx.getFieldCard(1, LOCATION_HAND)).toHaveLength(3);
          },
        );
      });
    });

    it("sets category to 0 and only places a counter when the predicted count is 4", async () => {
      await createTest({}, (ctx) => {
        const flow = ctx.addCard([
          {
            code: cardCode,
            controller: 1,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: defender,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: ashBlossom, location: LOCATION_HAND },
          ...drawCards.map((code, sequence) => ({
            code,
            controller: 1,
            location: LOCATION_DECK,
            sequence,
          })),
        ]);
        addPreCounters(ctx, 1, 3);

        return triggerBattleDestroyEffect(goToPlayerOneBattlePhase(flow)).state(
          YGOProMsgSelectBattleCmd,
          () => {
            expectCurrentMessage(ctx, YGOProMsgAddCounter, (msg) => {
              expect(msg.counterType).toBe(crownCounter);
              expect(msg.controller).toBe(1);
              expect(msg.count).toBe(1);
            });
            const attacker = findCard(ctx, cardCode, LOCATION_MZONE, 1);
            expect(attacker?.attack).toBe(2000);
            expect(getCounter(attacker, crownCounter)).toBe(4);
            expect(findCard(ctx, cardCode, LOCATION_EXTRA, 1)).toBeUndefined();
            expect(ctx.getFieldCard(1, LOCATION_HAND)).toHaveLength(0);
          },
        );
      });
    });
  });
});
