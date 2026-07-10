import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306042;
const futureZexal = 41522092;
const nashKnight = 34876719;
const gaiaDragoon = 91949988;
const rumSeventh = 57734012;
const cNo104 = 49456901;
const deckFiller = 89631139; // LIGHT
const darkMagician = 46986414; // DARK
const gaia = 6368038; // EARTH
const flameCerberus = 23297235; // FIRE
const legendaryFisherman = 3643300; // WATER
const harpieLady = 76812113; // WIND
const monsterReborn = 83764718; // SPELL
const potOfGreed = 55144522; // SPELL

const monsterCodes = [
  deckFiller,
  darkMagician,
  gaia,
  flameCerberus,
  legendaryFisherman,
  harpieLady,
];

/** CheckSubGroup/SelectSubGroup ????????? */
const SUBGROUP_PERF_LIMIT_MS = 3000;

const {
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  POS_FACEUP_ATTACK,
  REASON_FUSION,
  REASON_SYNCHRO,
  REASON_XYZ,
} = OcgcoreScriptConstants;

const deckCard = (code: number, sequence: number) => ({
  code,
  controller: 1,
  location: LOCATION_DECK,
  sequence,
});

/** 40 ???????? + ?????????? */
const buildSelectableOpponentDeck = () => {
  const cards = [
    deckCard(deckFiller, 0),
    deckCard(darkMagician, 1),
    deckCard(gaia, 2),
    deckCard(flameCerberus, 3),
    deckCard(legendaryFisherman, 4),
    deckCard(harpieLady, 5),
    deckCard(monsterReborn, 6),
    deckCard(potOfGreed, 7),
    deckCard(monsterReborn, 8),
    deckCard(potOfGreed, 9),
  ];
  for (let i = 10; i < 40; i += 1) {
    cards.push(deckCard(deckFiller, i));
  }
  return cards;
};

/** 40 ??? LIGHT + ??????? 4 ?? */
const buildUnselectableOpponentDeck = () => {
  const cards = [
    deckCard(monsterReborn, 0),
    deckCard(potOfGreed, 1),
    deckCard(monsterReborn, 2),
    deckCard(potOfGreed, 3),
    deckCard(monsterReborn, 4),
  ];
  for (let i = 5; i < 40; i += 1) {
    cards.push(deckCard(deckFiller, i));
  }
  return cards;
};

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const opponentDeck = Array.from({ length: 20 }, (_, sequence) =>
  deckCard(deckFiller, sequence),
);

const attachOverlay = (ctx: YGOProTest, sequence: number, code: number) => {
  ctx.evaluate(`
    Debug.AddCard(${code},0,0,LOCATION_MZONE,${sequence},${POS_FACEUP_ATTACK})
  `);
};

const measureCheckSubGroup = (ctx: YGOProTest) => {
  if (
    !ctx.getFieldCard(0, LOCATION_MZONE).some((card) => card.code === cardCode)
  ) {
    ctx.addCard([
      {
        code: cardCode,
        location: LOCATION_MZONE,
        position: POS_FACEUP_ATTACK,
      },
    ]);
  }
  const started = Date.now();
  const ok = ctx.evaluate(`
    local g=Duel.GetMatchingGroup(c${cardCode}.rmfilter,0,0,LOCATION_DECK,nil,1)
    aux.GCheckAdditional=c${cardCode}.rmgcheck
    local res=g:CheckSubGroup(c${cardCode}.gcheck,5,5)
    aux.GCheckAdditional=nil
    return res
  `) as boolean;
  return { ok, elapsedMs: Date.now() - started };
};

const selectDeckCard = (
  msg: {
    selectableCards: Array<{ code: number }>;
    prepareResponse: (cardOption: { code: number }) => Uint8Array;
  },
  code: number,
) => {
  expect(msg.selectableCards.some((card) => card.code === code)).toBe(true);
  return msg.prepareResponse({ code });
};

const selectAnyMonster = (msg: {
  selectableCards: Array<{ code: number }>;
  prepareResponse: (cardOption: { code: number }) => Uint8Array;
}) => {
  const monster = msg.selectableCards.find((card) =>
    monsterCodes.includes(card.code),
  );
  expect(monster).toBeDefined();
  return selectDeckCard(msg, monster!.code);
};

const xyzSummonFutureZexalWithTwoCopies = (ctx: YGOProTest) =>
  ctx
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, () => {
      const xyz = findCard(ctx, futureZexal, LOCATION_EXTRA);
      expect(xyz?.canSpecialSummon()).toBe(true);
      return xyz!.specialSummon();
    })
    .state(YGOProMsgSelectUnselectCard, () => {
      const materials = ctx
        .getFieldCard(0, LOCATION_MZONE)
        .filter((card) => card.code === cardCode);
      return materials[0].select();
    })
    .state(YGOProMsgSelectUnselectCard, () => {
      const materials = ctx
        .getFieldCard(0, LOCATION_MZONE)
        .filter((card) => card.code === cardCode);
      const remaining = materials.find((card) => card.canSelect());
      return remaining!.select();
    });

describe("No.104 ????? ??�??", () => {
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
    it("efcon is true only for REASON_XYZ", async () => {
      await runCoveredTest((ctx) => {
        const result = ctx.addCard([
          { code: cardCode, location: LOCATION_MZONE },
        ]).evaluate(`
            local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
            local e=Effect.CreateEffect(c)
            return {
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_XYZ},0),
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_SYNCHRO},0),
              c${cardCode}.efcon(e,0,nil,0,0,nil,${REASON_FUSION},0)
            }
          `);
        expect(result).toEqual([true, false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("grants the remove effect only once when two copies are used as Xyz materials", async () => {
      await runCoveredTest((ctx) =>
        xyzSummonFutureZexalWithTwoCopies(
          ctx.addCard([
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
            { code: futureZexal, location: LOCATION_EXTRA },
            ...opponentDeck,
          ]),
        )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            // ??????????? SelectYesNo???? 10 ??
            // ?????????????? 20 ??
            expect(
              ctx.allMessages.filter((m) => m instanceof YGOProMsgSelectYesNo),
            ).toHaveLength(0);
            expect(findCard(ctx, futureZexal, LOCATION_MZONE)).toBeDefined();
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(10);
            expect(ctx.getFieldCard(1, LOCATION_DECK)).toHaveLength(10);
          }),
      );
    });

    it("does not trigger when an Xyz with this card as overlay is used as material", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: nashKnight,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          },
          { code: gaiaDragoon, location: LOCATION_EXTRA },
          ...opponentDeck,
        ]);
        attachOverlay(ctx, 0, cardCode);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const host = findCard(ctx, nashKnight, LOCATION_MZONE);
            expect(host?.overlayCards).toEqual(
              expect.arrayContaining([cardCode]),
            );
            const xyz = findCard(ctx, gaiaDragoon, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: nashKnight }),
            );
            const host = findCard(ctx, nashKnight, LOCATION_MZONE);
            return host!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(
              ctx.allMessages.filter((m) => m instanceof YGOProMsgSelectYesNo),
            ).toHaveLength(0);
            expect(findCard(ctx, gaiaDragoon, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, gaiaDragoon, LOCATION_MZONE)?.overlayCards,
            ).toEqual(expect.arrayContaining([nashKnight, cardCode]));
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(0);
          });
      });
    });

    it("grants and triggers the remove effect when used as material via RUM - The Seventh One", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: rumSeventh, location: LOCATION_HAND },
          { code: cardCode, location: LOCATION_EXTRA },
          { code: cNo104, location: LOCATION_EXTRA },
          ...opponentDeck,
        ]);
        // ?????????????????????????
        ctx.evaluate(`
          local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_HAND,0,nil,${rumSeventh})
          c:RegisterFlagEffect(${rumSeventh},RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_MAIN1,EFFECT_FLAG_CLIENT_HINT,1,0,66)
          local e1=Effect.CreateEffect(c)
          e1:SetType(EFFECT_TYPE_SINGLE)
          e1:SetCode(EFFECT_PUBLIC)
          e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_MAIN1)
          c:RegisterEffect(e1)
        `);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const rum = findCard(ctx, rumSeventh, LOCATION_HAND);
            expect(rum?.canActivate()).toBe(true);
            return rum!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, cardCode, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: cNo104 }),
            );
            return findCard(ctx, cNo104, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, cNo104, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, cNo104, LOCATION_MZONE)?.overlayCards).toEqual(
              expect.arrayContaining([cardCode]),
            );
            // ???????????? 10 ???????????? 0
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(10);
          });
      });
    });

    it("lets the opponent banish 1 spell and 4 different-attribute monsters without hanging", async () => {
      await runCoveredTest((ctx) => {
        const checkStarted = { ms: 0 };
        const selectStarted = { ms: 0 };

        xyzSummonFutureZexalWithTwoCopies(
          ctx.addCard([
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
            { code: futureZexal, location: LOCATION_EXTRA },
            ...buildSelectableOpponentDeck(),
          ]),
        )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => {
            checkStarted.ms = Date.now();
            expect(msg.player).toBe(1);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            selectStarted.ms = Date.now();
            const selectSubGroupMs = selectStarted.ms - checkStarted.ms;
            // eslint-disable-next-line no-console
            console.log(
              `[perf] SelectSubGroup first selectable set: ${selectSubGroupMs}ms`,
            );
            expect(selectSubGroupMs).toBeLessThan(SUBGROUP_PERF_LIMIT_MS);
            expect(msg.selectableCards.length).toBeGreaterThanOrEqual(5);
            const spell = msg.selectableCards.find(
              (card) => card.code === monsterReborn || card.code === potOfGreed,
            );
            expect(spell).toBeDefined();
            return selectDeckCard(msg, spell!.code);
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => selectAnyMonster(msg))
          .state(YGOProMsgSelectUnselectCard, (msg) => selectAnyMonster(msg))
          .state(YGOProMsgSelectUnselectCard, (msg) => selectAnyMonster(msg))
          .state(YGOProMsgSelectUnselectCard, (msg) => selectAnyMonster(msg))
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(Date.now() - selectStarted.ms).toBeLessThan(
              SUBGROUP_PERF_LIMIT_MS * 5,
            );
            expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(5);
            expect(
              ctx
                .getFieldCard(1, LOCATION_REMOVED)
                .filter(
                  (card) =>
                    card.code === monsterReborn || card.code === potOfGreed,
                ),
            ).toHaveLength(1);
            expect(findCard(ctx, futureZexal, LOCATION_MZONE)).toBeDefined();
          });
      });
    }, 60000);
  });

  describe("performance", () => {
    it("CheckSubGroup finishes quickly when a valid 1-spell+4-monster set exists in a 40-card deck", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard(buildSelectableOpponentDeck());
        const { ok, elapsedMs } = measureCheckSubGroup(ctx);
        // eslint-disable-next-line no-console
        console.log(`[perf] CheckSubGroup (valid 40-card): ${elapsedMs}ms`);
        expect(ok).toBe(true);
        expect(elapsedMs).toBeLessThan(SUBGROUP_PERF_LIMIT_MS);
      });
    }, 30000);

    it("CheckSubGroup finishes quickly when no valid set exists in a 40-card same-attribute deck", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard(buildUnselectableOpponentDeck());
        const { ok, elapsedMs } = measureCheckSubGroup(ctx);
        // eslint-disable-next-line no-console
        console.log(`[perf] CheckSubGroup (no-valid 40-card): ${elapsedMs}ms`);
        expect(ok).toBe(false);
        expect(elapsedMs).toBeLessThan(SUBGROUP_PERF_LIMIT_MS);
      });
    }, 30000);
  });
});
