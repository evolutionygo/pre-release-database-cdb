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
  YGOProMsgConfirmCards,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessage,
} from "../utility/current-messages";
import { findCard } from "../utility/angelechy-helpers";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305095;
const angelechyBastion = 101305091;
const angelechyProblem = 101305094;
const angelechyOpening = 101305096;
const blueEyes = 89631139;
const mysticalSpaceTyphoon = 5318639;
const ashBlossom = 14558127;
const summonedSkull = 70781052;

const {
  HINT_SELECTMSG,
  HINTMSG_ATOHAND,
  HINTMSG_CONTROL,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
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

describe("具象天使之乱", () => {
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
    it("cfilter/disfilter/thfilter and target availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_SZONE, position: POS_FACEDOWN },
          {
            code: angelechyBastion,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: ashBlossom,
            controller: 1,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: mysticalSpaceTyphoon,
            controller: 1,
            location: LOCATION_SZONE,
            sequence: 2,
            position: POS_FACEUP,
          },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          },
          { code: angelechyProblem, location: LOCATION_DECK },
          { code: cardCode, location: LOCATION_DECK, sequence: 1 },
        ]);

        ctx.advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${cardCode}):GetFirst()
          local ang=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local own=Duel.GetFieldCard(0,LOCATION_MZONE,1)
          local adjm=Duel.GetFieldCard(1,LOCATION_MZONE,1)
          local sames=Duel.GetFieldCard(1,LOCATION_SZONE,2)
          local far=Duel.GetFieldCard(1,LOCATION_MZONE,0)
          local field=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${angelechyProblem}):GetFirst()
          local selfcopy=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${cardCode}):GetFirst()
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.cfilter(ang),
            c${cardCode}.cfilter(own),
            c${cardCode}.disfilter(adjm,2),
            c${cardCode}.disfilter(sames,2),
            c${cardCode}.disfilter(far,2),
            c${cardCode}.thfilter(field),
            c${cardCode}.thfilter(selfcopy),
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thtg(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([
          true,
          false,
          true,
          true,
          false,
          true,
          false,
          true,
          true,
        ]);
      });
    });

    it("target and thtg return false without valid cards", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_SZONE, position: POS_FACEDOWN },
          { code: cardCode, location: LOCATION_GRAVE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${cardCode}):GetFirst()
          local g=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${cardCode}):GetFirst()
          local e=Effect.CreateEffect(c)
          local eg=Effect.CreateEffect(g)
          return {
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.thtg(eg,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("① gives control until EP and negates adjacent opponent cards", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            {
              code: angelechyBastion,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mysticalSpaceTyphoon,
              controller: 1,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_CONTROL,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: angelechyBastion,
                sequence: 2,
              }),
            );
            return findCard(ctx, angelechyBastion, LOCATION_MZONE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyBastion, LOCATION_MZONE, 1),
            ).toBeDefined();
            const disabled = ctx.evaluate(`
              local given=Duel.GetMatchingGroup(Card.IsCode,1,LOCATION_MZONE,0,nil,${angelechyBastion}):GetFirst()
              local seq=given:GetSequence()
              local adjm=Duel.GetFieldCard(1,LOCATION_MZONE,1)
              local adjs=Duel.GetFieldCard(1,LOCATION_SZONE,1)
              local far=Duel.GetFieldCard(1,LOCATION_MZONE,0)
              local function isAdj(c)
                if not c then return false end
                return c${cardCode}.disfilter(c,seq)
              end
              return {
                seq,
                adjm and adjm:IsDisabled() or false,
                adjs and adjs:IsDisabled() or false,
                far and far:IsDisabled() or false,
                isAdj(adjm),
                isAdj(adjs),
                isAdj(far)
              }
            `);
            // 相邻卡应被无效；非相邻不应
            if (disabled[4]) expect(disabled[1]).toBe(true);
            if (disabled[5]) expect(disabled[2]).toBe(true);
            expect(disabled[3]).toBe(false);
          }),
      );
    });

    it("① is once per card name this turn", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
            },
            {
              code: angelechyBastion,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: angelechyBastion,
              location: LOCATION_MZONE,
              sequence: 3,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCardAt(ctx, cardCode, LOCATION_SZONE, 0, 0);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCardAt(ctx, angelechyBastion, LOCATION_MZONE, 0, 2)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const other = findCardAt(ctx, cardCode, LOCATION_SZONE, 0, 1);
            expect(other?.canActivate()).toBe(false);
          }),
      );
    });

    it("② banishes itself from GY and searches another Angelechy S/T", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            { code: angelechyProblem, location: LOCATION_DECK },
            { code: angelechyOpening, location: LOCATION_DECK, sequence: 1 },
            { code: cardCode, location: LOCATION_DECK, sequence: 2 },
            { code: ashBlossom, controller: 1, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: ashBlossom }),
            );
            expect(
              findCard(ctx, ashBlossom, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(findCard(ctx, cardCode, LOCATION_REMOVED)).toBeDefined();
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_ATOHAND,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: angelechyProblem }),
                expect.objectContaining({ code: angelechyOpening }),
              ]),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return msg.prepareResponse([{ code: angelechyProblem }]);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgConfirmCards);
            expect(
              findCard(ctx, angelechyProblem, LOCATION_HAND),
            ).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_REMOVED)).toBeDefined();
          }),
      );
    });

    it("control returns at End Phase", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            {
              code: angelechyBastion,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, angelechyBastion, LOCATION_MZONE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(
              findCard(ctx, angelechyBastion, LOCATION_MZONE, 1),
            ).toBeDefined();
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(SummonPlaceAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyBastion, LOCATION_MZONE, 0),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyBastion, LOCATION_MZONE, 1),
            ).toBeUndefined();
          }),
      );
    });
  });
});
