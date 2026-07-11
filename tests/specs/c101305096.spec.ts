import { resolve } from "node:path";
import {
  IdleCmdType,
  MapAdvancor,
  MapAdvancorHandler,
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { findCard } from "../utility/angelechy-helpers";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305096;
const angelechyProblem = 101305094;
const angelechyEnlisted = 101305093;
const angelechyDestrier = 101305092;
const angelechyShatranga = 101305090;
const angelechyBastion = 101305091;
const cyberDragon = 70095154;
const solemnWarning = 84749824;
const darkHole = 53129443;

const {
  HINT_SELECTMSG,
  HINTMSG_TOFIELD,
  HINTMSG_SPSUMMON,
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

describe("具象天使e4开局", () => {
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
    it("filters and target availability", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            { code: angelechyProblem, location: LOCATION_DECK },
            { code: angelechyEnlisted, location: LOCATION_EXTRA },
            { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 1 },
            { code: angelechyBastion, location: LOCATION_EXTRA, sequence: 2 },
            { code: cyberDragon, location: LOCATION_EXTRA, sequence: 3 },
            { code: darkHole, location: LOCATION_GRAVE },
          ])
          .advance(SlientAdvancor());

        const trap = findCard(ctx, cardCode, LOCATION_SZONE);
        expect(trap).toBeDefined();

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${cardCode}):GetFirst()
          local field=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${angelechyProblem}):GetFirst()
          local lv2=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${angelechyEnlisted}):GetFirst()
          local lv10=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${angelechyShatranga}):GetFirst()
          local lv8=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${angelechyBastion}):GetFirst()
          local cyber=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${cyberDragon}):GetFirst()
          local hole=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${darkHole}):GetFirst()
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_ACTIVATE)
          return {
            c~=nil,
            field~=nil,
            lv2~=nil,
            c${cardCode}.stfilter(field,0),
            c${cardCode}.stfilter(hole,0),
            c${cardCode}.spfilter(lv2,e,0,true),
            c${cardCode}.spfilter(lv10,e,0,true),
            c${cardCode}.spfilter(lv8,e,0,true),
            c${cardCode}.setfilter(lv10,0),
            c${cardCode}.setfilter(field,0),
            c${cardCode}.splimit(e,lv2),
            c${cardCode}.splimit(e,cyber)
          }
        `);

        expect(result).toEqual([
          true,
          true,
          true,
          true,
          false,
          true,
          false,
          false,
          true,
          false,
          false,
          true,
        ]);
      });
    });

    it("handcon matches turn/player/phase requirements", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({ code: cardCode, controller: 1, location: LOCATION_HAND });

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(1,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local tp=c:GetControler()
          local expected = Duel.GetTurnCount()==1
            and Duel.GetTurnPlayer()==1-tp
            and Duel.GetCurrentPhase()==PHASE_STANDBY
          return {
            c${cardCode}.handcon(e),
            expected,
            tp,
            Duel.GetTurnCount(),
            Duel.GetTurnPlayer()
          }
        `);

        expect(result[2]).toBe(1);
        expect(result[0]).toBe(result[1]);
      });
    });

    it("target returns false without field spell", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_SZONE, position: POS_FACEDOWN },
          { code: angelechyEnlisted, location: LOCATION_EXTRA },
          { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          e:SetType(EFFECT_TYPE_ACTIVATE)
          return c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("activates from set: places Field, SS LV2/7 to EMZ, places Continuous, applies Extra lock", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            { code: angelechyProblem, location: LOCATION_DECK },
            { code: angelechyEnlisted, location: LOCATION_EXTRA },
            { code: angelechyDestrier, location: LOCATION_EXTRA, sequence: 1 },
            { code: angelechyShatranga, location: LOCATION_EXTRA, sequence: 2 },
            { code: cyberDragon, location: LOCATION_EXTRA, sequence: 3 },
            {
              code: solemnWarning,
              controller: 1,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: solemnWarning }),
            );
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_TOFIELD,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyProblem }),
            );
            return findCard(ctx, angelechyProblem, LOCATION_DECK)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            const codes = msg.cards.map((c) => c.code);
            expect(codes).toEqual(
              expect.arrayContaining([angelechyEnlisted, angelechyDestrier]),
            );
            expect(codes).not.toContain(angelechyShatranga);
            return findCard(ctx, angelechyEnlisted, LOCATION_EXTRA)!.select();
          })
          .advance(
            SummonPlaceAdvancor({
              player: 0,
              location: LOCATION_MZONE,
              sequence: 5,
              position: POS_FACEUP_ATTACK,
            }),
            NoEffectAdvancor(),
          )
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
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: angelechyDestrier }),
                expect.objectContaining({ code: angelechyShatranga }),
              ]),
            );
            return findCard(ctx, angelechyShatranga, LOCATION_EXTRA)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyProblem, LOCATION_SZONE),
            ).toBeDefined();
            const emz = findCard(ctx, angelechyEnlisted, LOCATION_MZONE);
            expect(emz).toBeDefined();
            expect([5, 6]).toContain(emz!.sequence);
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_SZONE),
            ).toBeDefined();
            const lock = ctx.evaluate(`
              local syn=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${angelechyDestrier}):GetFirst()
              local cyber=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_EXTRA,0,nil,${cyberDragon}):GetFirst()
              local e=Effect.CreateEffect(syn)
              return {
                c${cardCode}.splimit(e,syn),
                c${cardCode}.splimit(e,cyber)
              }
            `);
            expect(lock).toEqual([false, true]);
            expect(
              findCard(ctx, cyberDragon, LOCATION_EXTRA)?.canSpecialSummon(),
            ).toBe(false);
          }),
      );
    });

    it("can activate from hand on opponent first Standby", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, controller: 1, location: LOCATION_HAND },
          { code: angelechyProblem, controller: 1, location: LOCATION_DECK },
          { code: angelechyEnlisted, controller: 1, location: LOCATION_EXTRA },
          {
            code: angelechyShatranga,
            controller: 1,
            location: LOCATION_EXTRA,
            sequence: 1,
          },
          { code: darkHole, location: LOCATION_DECK },
        ]);

        let activated = false;
        ctx
          .advance(
            MapAdvancor(
              MapAdvancorHandler(YGOProMsgSelectChain, (msg) => {
                if (
                  msg.player === 1 &&
                  msg.chains.some((c) => c.code === cardCode)
                ) {
                  activated = true;
                  return msg.prepareResponse({
                    code: cardCode,
                    controller: 1,
                    location: LOCATION_HAND,
                  });
                }
                return msg.prepareResponse(null);
              }),
              MapAdvancorHandler(YGOProMsgSelectCard, (msg) => {
                if (!activated) return undefined;
                if (msg.cards.some((c) => c.code === angelechyProblem)) {
                  return msg.prepareResponse([{ code: angelechyProblem }]);
                }
                if (msg.cards.some((c) => c.code === angelechyEnlisted)) {
                  return msg.prepareResponse([{ code: angelechyEnlisted }]);
                }
                if (msg.cards.some((c) => c.code === angelechyShatranga)) {
                  return msg.prepareResponse([{ code: angelechyShatranga }]);
                }
                return undefined;
              }),
            ),
            SummonPlaceAdvancor(),
            NoEffectAdvancor(),
            SlientAdvancor(),
          )
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(activated).toBe(true);
            expect(
              findCard(ctx, angelechyProblem, LOCATION_SZONE, 1),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyEnlisted, LOCATION_MZONE, 1),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyShatranga, LOCATION_SZONE, 1),
            ).toBeDefined();
            expect(msg.player).toBe(0);
            return msg.prepareResponse(IdleCmdType.TO_EP);
          });
      });
    });

    it("places Field from GY", async () => {
      await runCoveredTest((ctx) =>
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            { code: angelechyProblem, location: LOCATION_GRAVE },
            { code: angelechyDestrier, location: LOCATION_EXTRA },
            { code: angelechyBastion, location: LOCATION_EXTRA, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: angelechyProblem,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(ctx, angelechyProblem, LOCATION_GRAVE)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: angelechyDestrier }),
            );
            return findCard(ctx, angelechyDestrier, LOCATION_EXTRA)!.select();
          })
          .advance(
            SummonPlaceAdvancor({
              player: 0,
              location: LOCATION_MZONE,
              sequence: 5,
              position: POS_FACEUP_ATTACK,
            }),
            NoEffectAdvancor(),
          )
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, angelechyBastion, LOCATION_EXTRA)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, angelechyProblem, LOCATION_SZONE),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyDestrier, LOCATION_MZONE),
            ).toBeDefined();
            expect(
              findCard(ctx, angelechyBastion, LOCATION_SZONE),
            ).toBeDefined();
          }),
      );
    });
  });
});
