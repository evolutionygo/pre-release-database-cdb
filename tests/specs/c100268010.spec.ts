import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
  SummonPlaceAdvancor,
} from "ygopro-jstest";
import {
  IdleCmdType,
  OcgcoreScriptConstants,
  YGOProMsgAnnounceNumber,
  YGOProMsgChainDisabled,
  YGOProMsgDraw,
  YGOProMsgHint,
  YGOProMsgSelectChain,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectPlace,
  YGOProMsgSelectUnselectCard,
  YGOProMsgSet,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import { expectCurrentMessageMatching } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const CARD = 100268010;
const FILLER = 89631139;
const POT = 55144522;
const UPSTART = 70368879;
const JAR = 83968380;
const RECKLESS = 37576645;
const ASH = 14558127;
const DARK_MAGICIAN = 46986414;
const DARK_HOLE = 53129443;
const CARD_DESTRUCTION = 72892473;

const {
  LOCATION_DECK,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const copies = (
  code: number,
  location: number,
  controller: number,
  count: number,
) => Array.from({ length: count }, () => ({ code, location, controller }));

const faceUp = (code: number, controller = 0) => ({
  code,
  location: LOCATION_MZONE,
  controller,
  position: POS_FACEUP_ATTACK,
});

const placeInOwnSpellZone = (msg: YGOProMsgSelectPlace, player: number) => {
  const place = msg
    .getSelectablePlaces()
    .find(
      (item) =>
        item.player === player &&
        item.location === LOCATION_SZONE &&
        item.sequence <= 4,
    );
  expect(place).toBeDefined();
  return msg.prepareResponse([place!]);
};

const hintNumbers = (
  messages: {
    constructor: unknown;
    type?: number;
    player?: number;
    desc?: number;
  }[],
) =>
  messages
    .filter(
      (msg): msg is YGOProMsgHint =>
        msg instanceof YGOProMsgHint &&
        msg.type === OcgcoreScriptConstants.HINT_NUMBER,
    )
    .map((msg) => ({ player: msg.player, desc: msg.desc }));

describe("c100268010 沉默斗者-沉默魔术师", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  it("checks draw count and whether the effect can be activated", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([faceUp(CARD), ...copies(FILLER, LOCATION_DECK, 0, 5)])
        .state(() => {
          expect(
            ctx.evaluate(`
              local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
              local e=Effect.CreateEffect(c)
              local s=c100268010
              local fid=c:GetFieldID()
              s.visible=1
              s.rec[fid]={{n=1,era=1}}
              local can=s.drtg(e,0,nil,1,1,nil,0,1,0)
              s.rec[fid]={{n=99,era=1}}
              local cannot=s.drtg(e,0,nil,1,99,nil,0,1,0)
              s.rec[fid]=nil
              local empty=s.drtg(e,0,nil,1,1,nil,0,1,0)
              return {
                s.drcon(e,0,nil,1,0,nil,0,1),
                s.drcon(e,0,nil,0,0,nil,0,0),
                s.drawcount(0,4,REASON_EFFECT,1),
                s.drawcount(0,4,REASON_EFFECT,0),
                s.drawcount(0,4,REASON_RULE,1),
                can,
                cannot,
                empty,
              }
            `),
          ).toEqual([true, false, 4, 1, 1, true, false, false]);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("copies the opponent's own effect draw and can be chained by Ash Blossom", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 0, 5),
          ...copies(FILLER, LOCATION_DECK, 1, 5),
          { code: POT, location: LOCATION_HAND, controller: 1 },
          { code: ASH, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(0);
          return msg.prepareResponse(IdleCmdType.TO_EP);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(1);
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          expect(pot.canActivate()).toBe(true);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(0);
          return msg.prepareResponse(null);
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(1);
          const ash = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === ASH);
          expect(ash.canActivate()).toBe(true);
          return msg.prepareResponse(null);
        })
        .state(YGOProMsgSelectEffectYn, (msg) => {
          expect(msg.player).toBe(0);
          expect(msg.code).toBe(CARD);
          expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
            player: 1,
            count: 2,
          });
          return msg.prepareResponse(true);
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(1);
          expect(hintNumbers(ctx.currentMessages)).toEqual(
            expect.arrayContaining([
              { player: 0, desc: 2 },
              { player: 1, desc: 2 },
            ]),
          );
          const ash = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === ASH);
          expect(ash.canActivate()).toBe(true);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
            player: 0,
            count: 2,
          });
          const hand = ctx.getFieldCard(0, LOCATION_HAND);
          expect(hand).toHaveLength(2);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("lets the player pick one of several draw amounts from the same chain", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          { code: UPSTART, location: LOCATION_HAND, controller: 0 },
          ...copies(FILLER, LOCATION_DECK, 0, 8),
          ...copies(FILLER, LOCATION_DECK, 1, 8),
          { code: JAR, location: LOCATION_HAND, controller: 1 },
          { code: RECKLESS, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(1);
          const jar = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === JAR);
          expect(jar.canSset()).toBe(true);
          return jar.sset();
        })
        .state(YGOProMsgSelectPlace, (msg) => placeInOwnSpellZone(msg, 1))
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(1);
          expectCurrentMessageMatching(ctx, YGOProMsgSet, {
            code: JAR,
            controller: 1,
            location: LOCATION_SZONE,
          });
          expect(
            ctx
              .getFieldCard(1, LOCATION_SZONE)
              .some((card) => card.code === JAR),
          ).toBe(true);
          const reckless = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === RECKLESS);
          expect(reckless.canSset()).toBe(true);
          return reckless.sset();
        })
        .state(YGOProMsgSelectPlace, (msg) => placeInOwnSpellZone(msg, 1))
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expectCurrentMessageMatching(ctx, YGOProMsgSet, {
            code: RECKLESS,
            controller: 1,
            location: LOCATION_SZONE,
          });
          expect(
            ctx
              .getFieldCard(1, LOCATION_SZONE)
              .some((card) => card.code === RECKLESS),
          ).toBe(true);
          return msg.prepareResponse(IdleCmdType.TO_EP);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(0);
          const upstart = ctx
            .getFieldCard(0, LOCATION_HAND)
            .find((card) => card.code === UPSTART);
          return upstart.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(1);
          const jar = ctx
            .getFieldCard(1, LOCATION_SZONE)
            .find((card) => card.code === JAR);
          expect(jar.canActivate()).toBe(true);
          return jar.activate();
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(0);
          return msg.prepareResponse(null);
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.player).toBe(1);
          const reckless = ctx
            .getFieldCard(1, LOCATION_SZONE)
            .find((card) => card.code === RECKLESS);
          expect(reckless.canActivate()).toBe(true);
          return reckless.activate();
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          const triggers = msg.chains.filter((chain) => chain.code === CARD);
          expect(triggers).toHaveLength(2);
          return msg.prepareResponse({ code: CARD });
        })
        .state(YGOProMsgAnnounceNumber, (msg) => {
          expect(msg.player).toBe(0);
          expect([...msg.numbers].sort((left, right) => left - right)).toEqual([
            1, 2,
          ]);
          return msg.prepareResponse(2);
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(
            msg.chains.filter((chain) => chain.code === CARD),
          ).toHaveLength(1);
          expect(hintNumbers(ctx.currentMessages)).toEqual(
            expect.arrayContaining([
              { player: 0, desc: 2 },
              { player: 1, desc: 2 },
            ]),
          );
          return msg.prepareResponse({ code: CARD });
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(hintNumbers(ctx.currentMessages)).toEqual(
            expect.arrayContaining([
              { player: 0, desc: 1 },
              { player: 1, desc: 1 },
            ]),
          );
          const draws = ctx.currentMessages.filter(
            (msg): msg is YGOProMsgDraw =>
              msg instanceof YGOProMsgDraw && msg.player === 0,
          );
          expect(
            draws.map((msg) => msg.count).sort((left, right) => left - right),
          ).toEqual([1, 2]);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("drops an unused draw amount before the next opponent draw", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 0, 5),
          ...copies(FILLER, LOCATION_DECK, 1, 5),
          { code: POT, location: LOCATION_HAND, controller: 1 },
          { code: UPSTART, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectEffectYn, (msg) => msg.prepareResponse(false))
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const upstart = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === UPSTART);
          return upstart.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectEffectYn, (msg) => {
          expect(msg.code).toBe(CARD);
          return msg.prepareResponse(true);
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ctx.allMessages.some(
              (msg) => msg instanceof YGOProMsgAnnounceNumber,
            ),
          ).toBe(false);
          expect(hintNumbers(ctx.currentMessages)).toEqual(
            expect.arrayContaining([
              { player: 0, desc: 1 },
              { player: 1, desc: 1 },
            ]),
          );
          expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
            player: 0,
            count: 1,
          });
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("draws 1 when the opponent draw was caused by our card", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          { code: CARD_DESTRUCTION, location: LOCATION_HAND, controller: 0 },
          ...copies(FILLER, LOCATION_DECK, 0, 3),
          ...copies(FILLER, LOCATION_HAND, 1, 3),
          ...copies(FILLER, LOCATION_DECK, 1, 3),
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const spell = ctx
            .getFieldCard(0, LOCATION_HAND)
            .find((card) => card.code === CARD_DESTRUCTION);
          return spell.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectEffectYn, (msg) => {
          expect(msg.code).toBe(CARD);
          return msg.prepareResponse(true);
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ctx.allMessages.some(
              (msg) => msg instanceof YGOProMsgAnnounceNumber,
            ),
          ).toBe(false);
          expect(hintNumbers(ctx.currentMessages)).toEqual(
            expect.arrayContaining([
              { player: 0, desc: 1 },
              { player: 1, desc: 1 },
            ]),
          );
          const ourDraws = ctx.allMessages.filter(
            (msg): msg is YGOProMsgDraw =>
              msg instanceof YGOProMsgDraw && msg.player === 0,
          );
          expect(ourDraws.map((msg) => msg.count)).toEqual([1]);
          expect(ctx.getFieldCard(1, LOCATION_HAND)).toHaveLength(3);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("lets each copy answer the same draw", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 0, 6),
          ...copies(FILLER, LOCATION_DECK, 1, 5),
          { code: POT, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          expect(
            msg.chains.filter((chain) => chain.code === CARD),
          ).toHaveLength(2);
          return msg.prepareResponse({ code: CARD });
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(
            msg.chains.filter((chain) => chain.code === CARD),
          ).toHaveLength(1);
          return msg.prepareResponse({ code: CARD });
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const draws = ctx.currentMessages.filter(
            (msg): msg is YGOProMsgDraw =>
              msg instanceof YGOProMsgDraw && msg.player === 0,
          );
          expect(draws.map((msg) => msg.count)).toEqual([2, 2]);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("cannot activate when the deck cannot pay the recorded draw", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 1, 4),
          { code: POT, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(ctx.getFieldCard(0, LOCATION_HAND)).toHaveLength(0);
          expect(
            ctx.allMessages.some(
              (msg) => msg instanceof YGOProMsgSelectEffectYn,
            ),
          ).toBe(false);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("copies a draw phase draw without asking for a number", async () => {
    await createTest(
      {
        playerInfo: [{ drawCount: 1 }, { drawCount: 1 }],
      },
      (ctx) => {
        ctx
          .addCard([
            faceUp(CARD),
            ...copies(FILLER, LOCATION_DECK, 0, 3),
            ...copies(FILLER, LOCATION_DECK, 1, 3),
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(0);
            return msg.prepareResponse(IdleCmdType.TO_EP);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectEffectYn, (msg) => {
            expect(msg.player).toBe(0);
            expect(msg.code).toBe(CARD);
            expect(
              ctx.allMessages.some(
                (message) => message instanceof YGOProMsgAnnounceNumber,
              ),
            ).toBe(false);
            expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
              player: 1,
              count: 1,
            });
            return msg.prepareResponse(true);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(hintNumbers(ctx.currentMessages)).toEqual(
              expect.arrayContaining([
                { player: 0, desc: 1 },
                { player: 1, desc: 1 },
              ]),
            );
            expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
              player: 0,
              count: 1,
            });
            expect(ctx.getFieldCard(0, LOCATION_HAND)).toHaveLength(1);
          });

        coverageRegistry.addFrom(ctx);
      },
    );
  });

  it("stops the copy that already used both activations this turn", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 0, 6),
          ...copies(FILLER, LOCATION_DECK, 1, 6),
          { code: POT, location: LOCATION_HAND, controller: 1 },
          { code: UPSTART, location: LOCATION_HAND, controller: 1 },
          { code: UPSTART, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          expect(msg.player).toBe(0);
          return msg.prepareResponse(IdleCmdType.TO_EP);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          expect(
            msg.chains
              .filter((chain) => chain.code === CARD)
              .map((chain) => chain.sequence)
              .sort(),
          ).toEqual([0, 1]);
          return msg.prepareResponse({ code: CARD, sequence: 0 });
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.chains.filter((chain) => chain.code === CARD)).toEqual([
            expect.objectContaining({ sequence: 1 }),
          ]);
          return msg.prepareResponse(null);
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ctx.allMessages.some(
              (message) => message instanceof YGOProMsgAnnounceNumber,
            ),
          ).toBe(false);
          expectCurrentMessageMatching(ctx, YGOProMsgDraw, {
            player: 0,
            count: 2,
          });
          const upstart = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === UPSTART);
          return upstart.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectChain, (msg) => {
          expect(
            msg.chains
              .filter((chain) => chain.code === CARD)
              .map((chain) => chain.sequence)
              .sort(),
          ).toEqual([0, 1]);
          return msg.prepareResponse({ code: CARD, sequence: 0 });
        })
        .state(YGOProMsgSelectChain, (msg) => {
          expect(msg.chains.filter((chain) => chain.code === CARD)).toEqual([
            expect.objectContaining({ sequence: 1 }),
          ]);
          return msg.prepareResponse(null);
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const upstart = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === UPSTART);
          return upstart.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectEffectYn, (msg) => {
          expect(msg.code).toBe(CARD);
          expect(msg.sequence).toBe(1);
          return msg.prepareResponse(true);
        })
        .advance(NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const ourDraws = ctx.allMessages.filter(
            (message): message is YGOProMsgDraw =>
              message instanceof YGOProMsgDraw && message.player === 0,
          );
          expect(ourDraws.map((message) => message.count)).toEqual([2, 1, 1]);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("special summons by releasing a level 7 or lower spellcaster", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(DARK_MAGICIAN),
          { code: CARD, location: LOCATION_HAND, controller: 0 },
          ...copies(FILLER, LOCATION_DECK, 0, 1),
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const card = ctx
            .getFieldCard(0, LOCATION_HAND)
            .find((item) => item.code === CARD);
          expect(card.canSummon()).toBe(false);
          expect(card.canSpecialSummon()).toBe(true);
          return card.specialSummon();
        })
        .state(YGOProMsgSelectUnselectCard, (msg) => {
          expect(msg.cancelable).toBe(1);
          expect(msg.selectableCards.map((card) => card.code)).toContain(
            DARK_MAGICIAN,
          );
          return msg.prepareResponse(null);
        })
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ctx
              .getFieldCard(0, LOCATION_HAND)
              .some((card) => card.code === CARD),
          ).toBe(true);
          const card = ctx
            .getFieldCard(0, LOCATION_HAND)
            .find((item) => item.code === CARD);
          return card.specialSummon();
        })
        .state(YGOProMsgSelectUnselectCard, (msg) => {
          expect(msg.selectableCards.map((card) => card.code)).toContain(
            DARK_MAGICIAN,
          );
          return msg.prepareResponse({ code: DARK_MAGICIAN });
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expectCurrentMessageMatching(ctx, YGOProMsgSpSummoning, {
            code: CARD,
            controller: 0,
          });
          expect(
            ctx
              .getFieldCard(0, LOCATION_MZONE)
              .some((card) => card.code === CARD),
          ).toBe(true);
          expect(
            ctx
              .getFieldCard(0, LOCATION_GRAVE)
              .some((card) => card.code === DARK_MAGICIAN),
          ).toBe(true);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("is destroyed by the second effect destruction in the same turn", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          ...copies(FILLER, LOCATION_DECK, 0, 1),
          ...copies(FILLER, LOCATION_DECK, 1, 2),
          { code: DARK_HOLE, location: LOCATION_HAND, controller: 1 },
          { code: DARK_HOLE, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const hole = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === DARK_HOLE);
          return hole.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(
            ctx
              .getFieldCard(0, LOCATION_MZONE)
              .some((card) => card.code === CARD),
          ).toBe(true);
          const hole = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === DARK_HOLE);
          return hole.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expect(ctx.getFieldCard(0, LOCATION_MZONE)).toHaveLength(0);
          expect(
            ctx
              .getFieldCard(0, LOCATION_GRAVE)
              .some((card) => card.code === CARD),
          ).toBe(true);
        });

      coverageRegistry.addFrom(ctx);
    });
  });

  it("negates an opponent spell while the hand has 6 or more cards", async () => {
    await createTest({}, (ctx) => {
      ctx
        .addCard([
          faceUp(CARD),
          ...copies(FILLER, LOCATION_HAND, 0, 6),
          ...copies(FILLER, LOCATION_DECK, 0, 1),
          ...copies(FILLER, LOCATION_DECK, 1, 4),
          { code: POT, location: LOCATION_HAND, controller: 1 },
        ])
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) =>
          msg.prepareResponse(IdleCmdType.TO_EP),
        )
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          const pot = ctx
            .getFieldCard(1, LOCATION_HAND)
            .find((card) => card.code === POT);
          return pot.activate();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectIdleCmd, () => {
          expectCurrentMessageMatching(ctx, YGOProMsgChainDisabled, {
            chainCount: 1,
          });
          expect(
            ctx
              .getFieldCard(1, LOCATION_HAND)
              .some((card) => card.code === POT),
          ).toBe(false);
          const drawn = ctx.allMessages.filter(
            (msg): msg is YGOProMsgDraw =>
              msg instanceof YGOProMsgDraw &&
              msg.player === 1 &&
              msg.count === 2,
          );
          expect(drawn).toHaveLength(0);
        });

      coverageRegistry.addFrom(ctx);
    });
  });
});
