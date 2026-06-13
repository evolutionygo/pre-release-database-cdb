import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  IndexResponse,
  OcgcoreScriptConstants,
  YGOProMsgDraw,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectOption,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessage,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 100266001;
const valkyrie = 12493482;
const blueEyes = 89631139;
const summonedSkull = 70781052;
const mammoth = 40374923;
const effectMonster = 28985331;
const ashBlossom = 14558127;
const solemnWarning = 84749824;
const ghostBelle = 73642296;
const blackHole = 53129443;
const raigeki = 12580477;

const {
  HINT_SELECTMSG,
  HINTMSG_SPSUMMON,
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
  POS_FACEUP_DEFENSE,
} = OcgcoreScriptConstants;

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

describe("古之秘笈", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("checks summon filters, alternative condition filters, and target availability", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: valkyrie, location: LOCATION_DECK },
          { code: blueEyes, location: LOCATION_DECK, sequence: 1 },
          { code: effectMonster, location: LOCATION_DECK, sequence: 2 },
          { code: summonedSkull, location: LOCATION_HAND, sequence: 1 },
          {
            code: mammoth,
            location: LOCATION_MZONE,
            position: POS_FACEUP_ATTACK,
          },
          { code: raigeki, controller: 1, location: LOCATION_SZONE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local deck=Duel.GetFieldGroup(0,LOCATION_DECK,0)
          local hand=Duel.GetFieldGroup(0,LOCATION_HAND,0)
          local oppst=Duel.GetFieldGroup(1,LOCATION_SZONE,0)
          local decklv4=deck:Filter(Card.IsCode,nil,${valkyrie}):GetFirst()
          local decklv8=deck:Filter(Card.IsCode,nil,${blueEyes}):GetFirst()
          local effect=deck:Filter(Card.IsCode,nil,${effectMonster}):GetFirst()
          local handlv6=hand:Filter(Card.IsCode,nil,${summonedSkull}):GetFirst()
          local fieldnormal=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          local spelltrap=oppst:GetFirst()
          local e=Effect.CreateEffect(c)
          return {
            c${cardCode}.spfilter(decklv4,e,0),
            c${cardCode}.spfilter(decklv8,e,0),
            c${cardCode}.spfilter(effect,e,0),
            c${cardCode}.spfilter(handlv6,e,0),
            c${cardCode}.spfilter2(effect,e,0),
            c${cardCode}.cfilter(fieldnormal),
            c${cardCode}.cfilter(effect),
            c${cardCode}.desfilter(spelltrap),
            c${cardCode}.desfilter(fieldnormal),
            c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([
          true,
          false,
          false,
          true,
          true,
          true,
          false,
          true,
          false,
          true,
        ]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when neither the normal summon branch nor alternatives are available", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          { code: effectMonster, location: LOCATION_DECK },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.target(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
        coverageRegistry.addFrom(ctx);
      });
    });
  });

  describe("e2e", () => {
    it("special summons a valid Normal Monster in Defense Position and enforces the once-per-turn activation", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            { code: cardCode, location: LOCATION_HAND, sequence: 1 },
            { code: summonedSkull, location: LOCATION_HAND, sequence: 2 },
            { code: valkyrie, location: LOCATION_DECK },
            { code: blueEyes, location: LOCATION_DECK, sequence: 1 },
            { code: effectMonster, location: LOCATION_DECK, sequence: 2 },
            { code: mammoth, location: LOCATION_GRAVE },
            { code: ashBlossom, controller: 1, location: LOCATION_HAND },
            { code: solemnWarning, controller: 1, location: LOCATION_SZONE },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, cardCode, LOCATION_HAND);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: ashBlossom }),
                expect.objectContaining({ code: solemnWarning }),
              ]),
            );
            expect(
              findCard(ctx, ashBlossom, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
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
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ code: valkyrie }),
                expect.objectContaining({ code: summonedSkull }),
                expect.objectContaining({ code: mammoth }),
              ]),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({
                code: blueEyes,
                location: LOCATION_DECK,
              }),
            );
            expect(msg.cards).not.toContainEqual(
              expect.objectContaining({ code: effectMonster }),
            );
            return msg.prepareResponse([{ code: valkyrie }]);
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expectCurrentMessage(ctx, YGOProMsgSpSummoning, (summoning) => {
              expect(summoning.code).toBe(valkyrie);
              expect(summoning.position).toBe(POS_FACEUP_DEFENSE);
            });
            return msg.prepareResponse(null);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const summoned = findCard(ctx, valkyrie, LOCATION_MZONE);
            expect(summoned?.position).toBe(POS_FACEUP_DEFENSE);
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(findCard(ctx, blueEyes, LOCATION_DECK)).toBeDefined();
            expect(findCard(ctx, effectMonster, LOCATION_DECK)).toBeDefined();
            const remaining = findCard(ctx, cardCode, LOCATION_HAND);
            expect(remaining).toBeDefined();
            expect(remaining?.canActivate()).toBe(false);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("destroys all opponent monsters with the first alternative option", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              controller: 1,
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
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(ctx.getFieldCard(1, LOCATION_MZONE)).toHaveLength(0);
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE, 1)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_GRAVE, 1),
            ).toBeDefined();
            expect(findCard(ctx, valkyrie, LOCATION_MZONE)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("destroys all opponent Spell and Trap cards with the second alternative option", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: blackHole, controller: 1, location: LOCATION_SZONE },
            {
              code: raigeki,
              controller: 1,
              location: LOCATION_SZONE,
              sequence: 1,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(ctx.getFieldCard(1, LOCATION_SZONE)).toHaveLength(0);
            expect(findCard(ctx, blackHole, LOCATION_GRAVE, 1)).toBeDefined();
            expect(findCard(ctx, raigeki, LOCATION_GRAVE, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("draws two cards with the third alternative option", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: blackHole, location: LOCATION_DECK },
            { code: effectMonster, location: LOCATION_DECK, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessage(ctx, YGOProMsgDraw, (draw) => {
              expect(draw.player).toBe(0);
              expect(draw.count).toBe(2);
            });
            expect(findCard(ctx, blackHole, LOCATION_HAND)).toBeDefined();
            expect(findCard(ctx, effectMonster, LOCATION_HAND)).toBeDefined();
            expect(ctx.getFieldCard(0, LOCATION_DECK)).toHaveLength(0);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("special summons a monster from either Graveyard with the fourth alternative option", async () => {
      await createTest({}, (ctx) => {
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_HAND },
            {
              code: valkyrie,
              location: LOCATION_MZONE,
              position: POS_FACEUP_ATTACK,
            },
            { code: summonedSkull, controller: 1, location: LOCATION_GRAVE },
            { code: ghostBelle, controller: 1, location: LOCATION_HAND },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_HAND)!.activate(),
          )
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: ghostBelle }),
            );
            expect(
              findCard(ctx, ghostBelle, LOCATION_HAND, 1)?.canActivate(),
            ).toBe(true);
            return msg.prepareResponse(null);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_SPSUMMON,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: summonedSkull, controller: 1 }),
            );
            return msg.prepareResponse([
              { code: summonedSkull, controller: 1 },
            ]);
          })
          .advance(SummonPlaceAdvancor())
          .state(YGOProMsgSelectChain, (msg) => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            return msg.prepareResponse(null);
          })
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, summonedSkull, LOCATION_MZONE)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_GRAVE, 1),
            ).toBeUndefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
