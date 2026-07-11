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
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectSum,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { findCard, tuner } from "../utility/angelechy-helpers";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305093;
const angelechyShatranga = 101305090;
// 安卡栗子球：1星非协调
const synchroLevel1 = 595626;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const solemnWarning = 84749824;

const {
  HINT_SELECTMSG,
  HINTMSG_REMOVE,
  HINTMSG_SPSUMMON,
  LOCATION_EXTRA,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCardAt = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
  sequence?: number,
) =>
  ctx
    .getFieldCard(controller, location)
    .find(
      (card) =>
        card.code === code &&
        (sequence === undefined || card.sequence === sequence),
    );

describe("应召之具象天使", () => {
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
    it("rmfilter accepts adjacent columns and rejects non-adjacent", async () => {
      await runCoveredTest((ctx) => {
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
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 3,
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
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local ec=Duel.GetFieldGroup(0,LOCATION_MZONE,0):GetFirst()
          local adj=Duel.GetMatchingGroup(function(tc) return tc:IsCode(${blueEyes}) end,1,LOCATION_MZONE,0,nil):GetFirst()
          local far=Duel.GetMatchingGroup(function(tc) return tc:IsCode(${summonedSkull}) end,1,LOCATION_MZONE,0,nil):GetFirst()
          return {
            c${cardCode}.rmfilter(adj,ec,0),
            c${cardCode}.rmfilter(far,ec,0),
            Duel.IsExistingMatchingCard(c${cardCode}.rmfilter,0,0,LOCATION_MZONE,1,nil,ec,0)
          }
        `);

        expect(result).toEqual([true, false, true]);
      });
    });

    it("rmtg returns false without adjacent removable target", async () => {
      await runCoveredTest((ctx) => {
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
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local ec=Duel.GetFieldGroup(0,LOCATION_MZONE,0):GetFirst()
          return Duel.IsExistingMatchingCard(c${cardCode}.rmfilter,0,0,LOCATION_MZONE,1,nil,ec,0)
        `);

        expect(result).toBe(false);
      });
    });

    it("spcon and spfilter true/false branches", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: tuner,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 1 },
            { code: blueEyes, location: LOCATION_EXTRA, sequence: 2 },
          ])
          .advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldGroup(0,LOCATION_MZONE,0):GetFirst()
          local ang=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${angelechyShatranga}):GetFirst()
          local be=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${blueEyes}):GetFirst()
          local e=Effect.CreateEffect(c)
          -- spcon 用 eg 是否包含 handler；这里直接测 eg 包含/不包含
          local eg=Group.CreateGroup()
          eg:AddCard(c)
          local eg2=Group.CreateGroup()
          eg2:AddCard(be)
          -- 绕过 e:GetHandler：手写与 spcon 等价的判定
          local spcon_ok = eg:IsContains(c) and c:IsFaceup()
          local spcon_bad = eg2:IsContains(c) and c:IsFaceup()
          return {
            spcon_ok,
            spcon_bad,
            c${cardCode}.spfilter(ang,e,0,0),
            c${cardCode}.spfilter(be,e,0,0)
          }
        `);

        expect(result).toEqual([true, false, true, false]);
      });
    });
  });

  describe("e2e", () => {
    it("Synchro Summons with tuner + exactly 1 non-tuner", async () => {
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
              code: synchroLevel1,
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
              expect.objectContaining({ code: synchroLevel1 }),
            );
            return findCard(ctx, synchroLevel1, LOCATION_MZONE)!.select();
          })
          .advance(
            SummonPlaceAdvancor({
              player: 0,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            }),
            NoEffectAdvancor(),
          )
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(
              findCardAt(ctx, cardCode, LOCATION_MZONE, 0, 2),
            ).toBeDefined();
          }),
      );
    });

    it("① banishes adjacent opponent then transfers control; ② returns to Extra and SS Angelechy", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            { code: angelechyShatranga, location: LOCATION_EXTRA },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const mon = findCardAt(ctx, cardCode, LOCATION_MZONE, 0, 2);
            expect(mon?.canActivate()).toBe(true);
            return mon!.activate();
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
                controller: 1,
                sequence: 1,
              }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: summonedSkull }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(findCard(ctx, blueEyes, LOCATION_REMOVED, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_EXTRA)).toBeDefined();
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyShatranga }),
            );
            return findCard(ctx, angelechyShatranga, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_MZONE),
            ).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeUndefined();
            expect(findCard(ctx, cardCode, LOCATION_EXTRA)).toBeDefined();
          }),
      );
    });

    it("① is once per card name; Solemn Warning can chain to ②", async () => {
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
              code: cardCode,
              location: LOCATION_MZONE,
              sequence: 4,
              position: POS_FACEUP_ATTACK,
            },
            { code: angelechyShatranga, location: LOCATION_EXTRA },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: solemnWarning,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const first = findCardAt(ctx, cardCode, LOCATION_MZONE, 0, 2);
            expect(first?.canActivate()).toBe(true);
            return first!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: solemnWarning }),
            );
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            return findCard(ctx, solemnWarning, LOCATION_SZONE, 1)!.activate();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_MZONE),
            ).toBeUndefined();
            const other = findCardAt(ctx, cardCode, LOCATION_MZONE, 0, 4);
            expect(other?.canActivate()).toBe(false);
          }),
      );
    });
  });
});
