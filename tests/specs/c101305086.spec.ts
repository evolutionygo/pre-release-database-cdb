import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgAnnounceNumber,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305086;
const sangan = 26202165;
const kuriboh = 40640057;
const mirrorForce = 44095762;
const trapHole = 4206964;
const cosmicCyclone = 8267140;
const solemnWarning = 84749824;
const ghostBelle = 73642296;
const blueEyes = 89631139;

const {
  HINT_SELECTMSG,
  HINTMSG_XMATERIAL,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
  SUMMON_TYPE_XYZ,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const markXyzSummoned = (ctx: YGOProTest) => {
  ctx.evaluate(`
    local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
    Debug.PreSummon(c,${SUMMON_TYPE_XYZ})
  `);
};

const placeBanishedTrap = (ctx: YGOProTest, code: number) => {
  ctx.evaluate(`
    Debug.AddCard(${code},0,0,LOCATION_REMOVED,0,POS_FACEUP)
  `);
};

const addOverlays = (ctx: YGOProTest, count: number, code: number) => {
  ctx.evaluate(`
    for i=1,${count} do
      Debug.AddCard(${code},0,0,LOCATION_MZONE,0,${POS_FACEUP_ATTACK})
    end
  `);
};

describe("方解黑骑士", () => {
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
    it("checks xyzcon, filters, and xyztg availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
        ]);
        markXyzSummoned(ctx);
        placeBanishedTrap(ctx, mirrorForce);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local trap=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_REMOVED,0,nil,${mirrorForce}):GetFirst()
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local tg=c${cardCode}.xyztg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          local eg=Group.FromCards(trap)
          local ret={
            c${cardCode}.xyzcon(e,0,nil,0,0,nil,0,0),
            c${cardCode}.cfilter(trap,0),
            c${cardCode}.cfilter(c,0),
            c${cardCode}.xyzcon2(e,0,eg,0,0,nil,0,0),
            c${cardCode}.filter(trap),
            tg
          }
          Effect.GetHandler=oldHandler
          return ret
        `);

        expect(result).toEqual([true, true, false, true, true, true]);
      });
    });

    it("returns false for xyztg without a banished trap", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard({
          code: cardCode,
          location: LOCATION_MZONE,
          position: POS_FACEUP_ATTACK,
        });
        markXyzSummoned(ctx);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local ok=c${cardCode}.xyztg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          Effect.GetHandler=oldHandler
          return ok
        `);

        expect(result).toBe(false);
      });
    });

    it("checks spcost and spfilter true/false", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: kuriboh, location: LOCATION_GRAVE },
          { code: blueEyes, location: LOCATION_GRAVE, sequence: 1 },
        ]);
        markXyzSummoned(ctx);
        addOverlays(ctx, 1, sangan);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local dark=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${kuriboh}):GetFirst()
          local light=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${blueEyes}):GetFirst()
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local costOk=c${cardCode}.spcost(e,0,nil,0,0,nil,0,0,0)
          local old=Duel.IsExistingTarget
          Duel.IsExistingTarget=Duel.IsExistingMatchingCard
          local tgOk=c${cardCode}.sptg(e,0,nil,0,0,nil,0,0,0)
          Duel.IsExistingTarget=old
          Effect.GetHandler=oldHandler
          return {
            costOk,
            tgOk,
            c${cardCode}.spfilter(dark,e,0),
            c${cardCode}.spfilter(light,e,0),
            c${cardCode}.spfilter(dark,e,0,1),
            c${cardCode}.spfilter(dark,e,0,2)
          }
        `);

        expect(result).toEqual([true, true, true, false, true, false]);
      });
    });

    it("returns false for spcost without matching overlay count", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: sangan, location: LOCATION_GRAVE },
        ]);
        markXyzSummoned(ctx);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          local oldHandler=Effect.GetHandler
          Effect.GetHandler=function(effect) return c end
          local ok=c${cardCode}.spcost(e,0,nil,0,0,nil,0,0,0)
          Effect.GetHandler=oldHandler
          return ok
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("① attaches a banished trap after Xyz Summon", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: sangan,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: sangan,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor());
        placeBanishedTrap(ctx, mirrorForce);

        ctx
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_EXTRA);
            expect(xyz?.canSpecialSummon()).toBe(true);
            return xyz!.specialSummon();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: sangan }),
              ]),
            );
            return msg.prepareResponse([{ code: sangan }, { code: sangan }]);
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
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_XMATERIAL,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: mirrorForce,
                location: LOCATION_REMOVED,
              }),
            );
            return findCard(ctx, mirrorForce, LOCATION_REMOVED)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards).toEqual(
              expect.arrayContaining([mirrorForce]),
            );
          });
      });
    });

    it("① attaches a trap when an own trap is banished", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: mirrorForce,
            location: LOCATION_SZONE,
            position: POS_FACEDOWN,
          },
          { code: cosmicCyclone, location: LOCATION_HAND },
        ]);
        markXyzSummoned(ctx);
        addOverlays(ctx, 2, sangan);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, cosmicCyclone, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: mirrorForce }),
            );
            return findCard(ctx, mirrorForce, LOCATION_SZONE)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            expect(findCard(ctx, mirrorForce, LOCATION_REMOVED)).toBeDefined();
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: mirrorForce,
                location: LOCATION_REMOVED,
              }),
            );
            return findCard(ctx, mirrorForce, LOCATION_REMOVED)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, cardCode, LOCATION_MZONE)?.overlayCards,
            ).toEqual(expect.arrayContaining([mirrorForce]));
          });
      });
    });

    it("② detaches materials and special summons a matching DARK monster", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: kuriboh, location: LOCATION_GRAVE },
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
          },
        ]);
        markXyzSummoned(ctx);
        addOverlays(ctx, 1, sangan);

        ctx
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const xyz = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(xyz?.overlayCards?.length).toBeGreaterThan(0);
            expect(xyz?.canActivate()).toBe(true);
            return xyz!.activate();
          })
          .state(YGOProMsgAnnounceNumber, (msg) => {
            expect(msg.numbers).toContain(1);
            return msg.prepareResponse(1);
          })
          .state(YGOProMsgSelectCard, (msg) => {
            // 取除超量素材
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: sangan }),
            );
            return msg.prepareResponse([{ code: sangan }]);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: kuriboh,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(ctx, kuriboh, LOCATION_GRAVE)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: solemnWarning }),
                expect.objectContaining({ code: ghostBelle }),
              ]),
            );
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(true);
            expect(
              findCard(ctx, ghostBelle, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, kuriboh, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
          });
      });
    });

    it("shares the ① once-per-turn limit across both trigger timings", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_EXTRA },
            {
              code: sangan,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: sangan,
              location: LOCATION_MZONE,
              sequence: 1,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: mirrorForce,
              location: LOCATION_SZONE,
              position: POS_FACEDOWN,
            },
            { code: cosmicCyclone, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor());
        placeBanishedTrap(ctx, trapHole);

        ctx
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_EXTRA)!.specialSummon(),
          )
          .state(YGOProMsgSelectCard, (msg) =>
            msg.prepareResponse([{ code: sangan }, { code: sangan }]),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) =>
            msg.prepareResponse([{ code: trapHole }]),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cosmicCyclone, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, mirrorForce, LOCATION_SZONE)!.select(),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, mirrorForce, LOCATION_REMOVED)).toBeDefined();
            // ① 已在超量召唤时用过，除外陷阱时不应再出现诱发
            expect(
              findCard(ctx, cardCode, LOCATION_MZONE)?.overlayCards,
            ).toEqual(expect.arrayContaining([trapHole]));
            expect(findCard(ctx, mirrorForce, LOCATION_REMOVED)).toBeDefined();
          });
      });
    });
  });
});
