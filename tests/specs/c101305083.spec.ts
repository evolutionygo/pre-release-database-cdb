import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgAnnounceRace,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessages } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305083;
const blueEyes = 89631139;
const darkMagician = 46986414;
const summonedSkull = 70781052;
const raigeki = 12580477;
const mysticalSpaceTyphoon = 5318639;
const heavyStorm = 19613556;
const solemnWarning = 84749824;
const mudragon = 54757758;
const mirrorForce = 44095762;
const torrential = 53582587;

const {
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  POS_FACEUP_ATTACK,
  RACE_DRAGON,
  RACE_PYRO,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("幻影火精 约马格努", () => {
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
    it("checks revive cost group and sprcon true/false", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: summonedSkull, location: LOCATION_GRAVE, sequence: 2 },
        ]);

        const ok = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local g=Duel.GetMatchingGroup(c${cardCode}.sprfilter,0,LOCATION_GRAVE,0,nil)
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.sprfilter(Duel.GetFieldCard(0,LOCATION_GRAVE,0)),
            c${cardCode}.gcheck(g),
            c${cardCode}.sprcon(e,c)
          }
        `);
        expect(ok).toEqual([true, true, true]);
      });

      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
        ]);

        const ng = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.sprcon(e,c)
        `);
        expect(ng).toBe(false);
      });
    });

    it("accepts three spells or three traps for gcheck", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: raigeki, location: LOCATION_GRAVE },
          { code: mysticalSpaceTyphoon, location: LOCATION_GRAVE, sequence: 1 },
          { code: heavyStorm, location: LOCATION_GRAVE, sequence: 2 },
          { code: mirrorForce, location: LOCATION_GRAVE, sequence: 3 },
          { code: torrential, location: LOCATION_GRAVE, sequence: 4 },
          { code: solemnWarning, location: LOCATION_GRAVE, sequence: 5 },
        ]);

        const result = ctx.evaluate(`
          local spells=Group.FromCards(
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${raigeki}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${mysticalSpaceTyphoon}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${heavyStorm}):GetFirst()
          )
          local traps=Group.FromCards(
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${mirrorForce}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${torrential}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${solemnWarning}):GetFirst()
          )
          local mixed=Group.FromCards(
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${raigeki}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${mirrorForce}):GetFirst(),
            Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${mysticalSpaceTyphoon}):GetFirst()
          )
          return {
            c${cardCode}.gcheck(spells),
            c${cardCode}.gcheck(traps),
            c${cardCode}.gcheck(mixed)
          }
        `);

        expect(result).toEqual([true, true, false]);
      });
    });

    it("checks race target always available and fusion target true/false", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: mudragon, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            const result = ctx.evaluate(`
              local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
              local opp=Duel.GetFieldCard(1,LOCATION_MZONE,0)
              local e=Effect.CreateEffect(c)
              local oldHandler=Effect.GetHandler
              Effect.GetHandler=function(effect) return c end
              local ret={
                c${cardCode}.racetg(e,0,nil,0,0,nil,0,0,0),
                c${cardCode}.filter0(opp,e)
              }
              Effect.GetHandler=oldHandler
              return ret
            `);
            expect(result).toEqual([true, true]);
          });
      });

      await runCoveredTest((ctx) => {
        ctx
          .addCard({
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)?.canActivate()).toBe(
              false,
            );
            const result = ctx.evaluate(`
              local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
              local e=Effect.CreateEffect(c)
              local oldHandler=Effect.GetHandler
              Effect.GetHandler=function(effect) return c end
              local ret=c${cardCode}.fsptg(e,0,nil,0,0,nil,0,0,0)
              Effect.GetHandler=oldHandler
              return ret
            `);
            expect(result).toBe(false);
          });
      });
    });
  });

  describe("e2e", () => {
    it("special summons by returning three monsters and can declare a race", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: summonedSkull, location: LOCATION_GRAVE, sequence: 2 },
            {
              code: solemnWarning,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canSummon()).toBe(false);
            expect(monster?.canSpecialSummon()).toBe(true);
            return monster!.specialSummon();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: blueEyes }),
                expect.objectContaining({ code: darkMagician }),
                expect.objectContaining({ code: summonedSkull }),
              ]),
            );
            return findCard(ctx, blueEyes, LOCATION_GRAVE)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, darkMagician, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, summonedSkull, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            const warning = findCard(ctx, solemnWarning, LOCATION_HAND, 1);
            if (warning?.canActivate()) {
              expect(msg.chains).toContainEqual(
                expect.objectContaining({ code: solemnWarning }),
              );
            }
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expectCurrentMessages(ctx, YGOProMsgSpSummoned);
            expect(msg.code).toBe(cardCode);
            return msg.prepareResponse(true);
          })
          .state(YGOProMsgAnnounceRace, (msg) => {
            expect(msg.player).toBe(0);
            expect(msg.count).toBe(1);
            expect(msg.availableRaces & RACE_PYRO).toBe(0);
            expect(msg.availableRaces & RACE_DRAGON).not.toBe(0);
            return msg.prepareResponse(RACE_DRAGON);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, blueEyes, LOCATION_DECK)).toBeDefined();
            const race = ctx.evaluate(`
              return Duel.GetFieldCard(0,LOCATION_MZONE,0):GetRace()
            `);
            expect(race).toBe(RACE_DRAGON);
          });
      });
    });

    it("fusion summons using itself and an opponent monster", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: summonedSkull,
              controller: 1,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: mudragon, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: mudragon }),
            );
            return findCard(ctx, mudragon, LOCATION_EXTRA)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            return findCard(ctx, cardCode, LOCATION_MZONE)!.select();
          })
          .state(YGOProMsgSelectUnselectCard, (msg) => {
            expect(msg.selectableCards).toContainEqual(
              expect.objectContaining({
                code: summonedSkull,
                controller: 1,
              }),
            );
            return findCard(ctx, summonedSkull, LOCATION_MZONE, 1)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, mudragon, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
          });
      });
    });

    it("only allows race change once per turn across copies", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: summonedSkull, location: LOCATION_GRAVE, sequence: 2 },
            { code: raigeki, location: LOCATION_GRAVE, sequence: 3 },
            {
              code: mysticalSpaceTyphoon,
              location: LOCATION_GRAVE,
              sequence: 4,
            },
            { code: heavyStorm, location: LOCATION_GRAVE, sequence: 5 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.specialSummon(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, blueEyes, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, darkMagician, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, summonedSkull, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgAnnounceRace, (msg) =>
            msg.prepareResponse(RACE_DRAGON),
          )
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.specialSummon(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, raigeki, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, mysticalSpaceTyphoon, LOCATION_GRAVE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, heavyStorm, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            // 种族效果次数已用，第二张特召后不应再提示宣言种族
            const copies = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((c) => c.code === cardCode);
            expect(copies.length).toBe(2);
          });
      });
    });

    it("only allows fusion once per turn", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
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
              code: summonedSkull,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            { code: mudragon, location: LOCATION_EXTRA },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monsters = ctx
              .getFieldCard(0, LOCATION_MZONE)
              .filter((c) => c.code === cardCode);
            expect(monsters.some((m) => m.canActivate())).toBe(true);
            return monsters.find((m) => m.canActivate())!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, mudragon, LOCATION_EXTRA)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, cardCode, LOCATION_MZONE)!.select(),
          )
          .state(YGOProMsgSelectUnselectCard, () =>
            findCard(ctx, summonedSkull, LOCATION_MZONE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
          });
      });
    });
  });
});
