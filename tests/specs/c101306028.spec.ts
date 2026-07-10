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
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306028;
const blueEyes = 89631139; // LIGHT
const darkMagician = 46986414; // DARK
const gaia = 6368038; // EARTH
const flameCerberus = 23297235; // FIRE
const legendaryFisherman = 3643300; // WATER
const ashBlossom = 14558127;
const solemnWarning = 84749824;
const ghostBelle = 73642296;

const {
  ATTRIBUTE_FIRE,
  ATTRIBUTE_LIGHT,
  HINT_SELECTMSG,
  HINTMSG_SPSUMMON,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("精灵世妃 树精", () => {
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
    it("checks attribute condition true/false", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
        ]);

        const ok = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.spcon(e,0,nil,0,0,nil,0,0)
        `);
        expect(ok).toBe(true);
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
          return c${cardCode}.spcon(e,0,nil,0,0,nil,0,0)
        `);
        expect(ng).toBe(false);
      });
    });

    it("checks filters and target availability for effect 1", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${cardCode}):GetFirst()
          local gy=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${blueEyes}):GetFirst()
          local e=Effect.CreateEffect(c)
          local can=not Duel.IsPlayerAffectedByEffect(0,59822133)
            and Duel.GetLocationCount(0,LOCATION_MZONE)>1
            and c:IsCanBeSpecialSummoned(e,0,0,false,false)
            and Duel.IsExistingMatchingCard(c${cardCode}.spfilter,0,LOCATION_GRAVE,0,1,nil,e,0)
          return {
            c${cardCode}.spfilter(gy,e,0),
            can and true or false
          }
        `);

        expect(result).toEqual([true, true]);
      });
    });

    it("returns false for effect 1 target when zones or attributes are insufficient", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 1,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 3,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 4,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,${cardCode}):GetFirst()
          local e=Effect.CreateEffect(c)
          local can=not Duel.IsPlayerAffectedByEffect(0,59822133)
            and Duel.GetLocationCount(0,LOCATION_MZONE)>1
            and c:IsCanBeSpecialSummoned(e,0,0,false,false)
            and Duel.IsExistingMatchingCard(c${cardCode}.spfilter,0,LOCATION_GRAVE,0,1,nil,e,0)
          return {
            c${cardCode}.spcon(e,0,nil,0,0,nil,0,0),
            can and true or false
          }
        `);

        expect(result).toEqual([true, false]);
      });
    });

    it("checks attribute filter and deck special summon availability for effect 2", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
          { code: flameCerberus, location: LOCATION_DECK },
          { code: legendaryFisherman, location: LOCATION_DECK, sequence: 1 },
          { code: darkMagician, location: LOCATION_DECK, sequence: 2 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local fire=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${flameCerberus}):GetFirst()
          local water=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${legendaryFisherman}):GetFirst()
          local dark=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${darkMagician}):GetFirst()
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.attfilter(c,${ATTRIBUTE_LIGHT}),
            c${cardCode}.attfilter(Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${blueEyes}):GetFirst(),${ATTRIBUTE_LIGHT}),
            c${cardCode}.attfilter(c,${ATTRIBUTE_FIRE}),
            c${cardCode}.spfilter2(fire,e,0),
            c${cardCode}.spfilter2(water,e,0),
            c${cardCode}.spfilter2(dark,e,0),
            c${cardCode}.sptg2(e,0,nil,0,0,nil,0,0,0),
            c${cardCode}.spcon(e,0,nil,0,0,nil,0,0)
          }
        `);

        expect(result).toEqual([
          true,
          true,
          false,
          true,
          true,
          false,
          true,
          true,
        ]);
      });
    });

    it("returns false for effect 2 when no unique-attribute monster exists in deck", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: blueEyes, location: LOCATION_GRAVE },
          { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
          { code: blueEyes, location: LOCATION_DECK },
          { code: darkMagician, location: LOCATION_DECK, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.sptg2(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("special summons this card and a GY monster, and cannot be responded to", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
            {
              code: ashBlossom,
              controller: 1,
              location: LOCATION_HAND,
            },
            {
              code: ghostBelle,
              controller: 1,
              location: LOCATION_HAND,
              sequence: 1,
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
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  code: blueEyes,
                  location: LOCATION_GRAVE,
                }),
                expect.objectContaining({
                  code: darkMagician,
                  location: LOCATION_GRAVE,
                }),
                expect.objectContaining({
                  code: gaia,
                  location: LOCATION_GRAVE,
                }),
              ]),
            );
            return findCard(ctx, blueEyes, LOCATION_GRAVE)!.select();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(
              findCard(ctx, ashBlossom, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(false);
            expect(
              findCard(ctx, ghostBelle, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(false);
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(false);
            expect(msg.chains).toEqual([]);
            return msg.prepareResponse(null);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, cardCode, LOCATION_MZONE)).toBeTruthy();
            expect(findCard(ctx, blueEyes, LOCATION_MZONE)).toBeTruthy();
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE)).toBeUndefined();
          });
      });
    });

    it("special summons a unique-attribute monster from the deck with effect 2", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
            { code: flameCerberus, location: LOCATION_DECK },
            { code: darkMagician, location: LOCATION_DECK, sequence: 1 },
            { code: blueEyes, location: LOCATION_DECK, sequence: 2 },
            {
              code: ashBlossom,
              controller: 1,
              location: LOCATION_HAND,
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
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(
              findCard(ctx, ashBlossom, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(false);
            expect(
              findCard(ctx, solemnWarning, LOCATION_SZONE, 1)?.canActivate(),
            ).toBe(false);
            expect(msg.chains).toEqual([]);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: flameCerberus,
                location: LOCATION_DECK,
              }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: darkMagician }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            return msg.prepareResponse([{ code: flameCerberus }]);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, flameCerberus, LOCATION_MZONE)).toBeTruthy();
            expect(findCard(ctx, flameCerberus, LOCATION_DECK)).toBeUndefined();
          });
      });
    });

    it("enforces the once-per-turn limit of effect 1 across same-name copies", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
            { code: blueEyes, location: LOCATION_GRAVE, sequence: 3 },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 4 },
            { code: gaia, location: LOCATION_GRAVE, sequence: 5 },
            { code: flameCerberus, location: LOCATION_DECK },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(true);
            return monster!.activate();
          })
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, blueEyes, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const remaining = ctx
              .getFieldCard(0, LOCATION_HAND)
              .find((card) => card.code === cardCode);
            expect(remaining?.canActivate()).toBe(false);
            const onField = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(onField?.canActivate()).toBe(true);
          });
      });
    });

    it("enforces the once-per-turn limit of effect 2", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
            { code: gaia, location: LOCATION_GRAVE, sequence: 2 },
            { code: flameCerberus, location: LOCATION_DECK },
            { code: legendaryFisherman, location: LOCATION_DECK, sequence: 1 },
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
              expect.objectContaining({ code: flameCerberus }),
            );
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: legendaryFisherman }),
            );
            return msg.prepareResponse([{ code: flameCerberus }]);
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, flameCerberus, LOCATION_MZONE)).toBeTruthy();
            const monster = findCard(ctx, cardCode, LOCATION_MZONE);
            expect(monster?.canActivate()).toBe(false);
          });
      });
    });

    it("cannot activate effect 1 without 3 attributes in the GY", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: blueEyes, location: LOCATION_GRAVE },
            { code: darkMagician, location: LOCATION_GRAVE, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const monster = findCard(ctx, cardCode, LOCATION_HAND);
            expect(monster?.canActivate()).toBe(false);
          });
      });
    });
  });
});
