import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import {
  findCard,
  registerContinuousSpellType,
} from "../utility/angelechy-helpers";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305094;
const angelechyEnlisted = 101305093;
const angelechyShatranga = 101305090;
const angelechyDestrier = 101305092;
const mysticalSpaceTyphoon = 5318639;
const darkHole = 53129443;
const blueEyes = 89631139;

const {
  HINT_SELECTMSG,
  HINTMSG_DISCARD,
  HINTMSG_SPSUMMON,
  HINTMSG_TOFIELD,
  HINTMSG_TODECK,
  LOCATION_EXTRA,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

describe("具象天使之问", () => {
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
    it("cost/sp/set/te filters and target availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          { code: mysticalSpaceTyphoon, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_HAND, sequence: 1 },
          { code: angelechyEnlisted, location: LOCATION_EXTRA },
          { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 1 },
          {
            code: angelechyDestrier,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEUP,
          },
        ]);
        registerContinuousSpellType(ctx, 0, angelechyDestrier);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local st=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local mon=Duel.GetFieldCard(0,LOCATION_HAND,1)
          local lv2=Duel.GetFieldCard(0,LOCATION_EXTRA,0)
          local lv10=Duel.GetFieldCard(0,LOCATION_EXTRA,1)
          local sz=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.costfilter(st),
            c${cardCode}.costfilter(mon),
            c${cardCode}.spcost(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.spfilter(lv2,e,0,true),
            c${cardCode}.spfilter(lv10,e,0,true),
            c${cardCode}.setfilter(lv10,0),
            c${cardCode}.setfilter(st,0),
            c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.tefilter(sz,0),
            c${cardCode}.tetg(e,0,nil,0,0,nil,0,0,0)
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
          true,
        ]);
      });
    });

    it("sptg/tetg/tecon false paths", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          { code: mysticalSpaceTyphoon, location: LOCATION_HAND },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_FZONE,0)
          local e=Effect.CreateEffect(c)
          local eg=Group.CreateGroup()
          eg:AddCard(c)
          return {
            c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.tetg(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.tecon(e,0,eg,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([false, false, false]);
      });
    });
  });

  describe("e2e", () => {
    it("① discards S/T, SS Level 2 Angelechy, places another as Continuous Spell", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 5,
              position: POS_FACEUP,
            },
            { code: mysticalSpaceTyphoon, location: LOCATION_HAND },
            { code: angelechyEnlisted, location: LOCATION_EXTRA },
            { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const field = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(field?.canActivate()).toBe(true);
            return field!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_DISCARD,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: mysticalSpaceTyphoon }),
            );
            return findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyEnlisted }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: angelechyShatranga }),
            );
            return findCard(ctx, angelechyEnlisted, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_TOFIELD,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyShatranga }),
            );
            return findCard(ctx, angelechyShatranga, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyEnlisted, LOCATION_MZONE),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_SZONE),
            ).toBeDefined();
            expect(
              findCard(ctx, mysticalSpaceTyphoon, LOCATION_HAND),
            ).toBeUndefined();
            const field = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(field?.canActivate()).toBe(false);
          }),
      );
    });

    it("② returns SZONE Angelechy to Extra then may Special Summon it", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: angelechyEnlisted,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: angelechyShatranga,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEUP,
          },
          { code: darkHole, location: LOCATION_HAND },
        ]);
        registerContinuousSpellType(ctx, 0, angelechyShatranga);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const hole = findCard(ctx, darkHole, LOCATION_HAND);
            expect(hole?.canActivate()).toBe(true);
            return hole!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_TODECK,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyShatranga }),
            );
            return findCard(ctx, angelechyShatranga, LOCATION_SZONE)!.select();
          })
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
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
            expect(
              findCard(ctx, angelechyEnlisted, LOCATION_MZONE),
            ).toBeUndefined();
          });
      });
    });

    it("② can decline the Special Summon after returning to Extra", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 5,
            position: POS_FACEUP,
          },
          {
            code: angelechyEnlisted,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: angelechyShatranga,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEUP,
          },
          { code: darkHole, location: LOCATION_HAND },
        ]);
        registerContinuousSpellType(ctx, 0, angelechyShatranga);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, darkHole, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, angelechyShatranga, LOCATION_SZONE)!.select(),
          )
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(false))
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_EXTRA),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_MZONE),
            ).toBeUndefined();
          });
      });
    });
  });
});
