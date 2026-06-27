import { resolve } from "node:path";
import {
  NoEffectAdvancor,
  SlientAdvancor,
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
} from "ygopro-msg-encode";
import { expectCurrentMessage } from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101306080;
const blueEyes = 89631139;
const darkMagician = 46986414;
const summonedSkull = 70781052;
const valkyrie = 12493482;
const mammoth = 40374923;
const ashBlossom = 14558127;
const stardustDragon = 44508094;
const starlightRoad = 58120309;
const mirrorForce = 44095762;
const trapHole = 4206964;
const bottomless = 29401950;
const compulsory = 5795980;
const darkHole = 53129443;

const {
  LOCATION_DECK,
  LOCATION_EXTRA,
  LOCATION_GRAVE,
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
  POS_FACEDOWN,
} = OcgcoreScriptConstants;

const findCard = (
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

const fillColumn = (
  ctx: YGOProTest,
  sequence: number,
  monsterCode: number,
  allyMonsterCode: number,
  spellCode: number,
  enemySpellCode: number,
) => {
  ctx.addCard([
    {
      code: monsterCode,
      location: LOCATION_MZONE,
      sequence,
      position: POS_FACEUP_ATTACK,
    },
    {
      code: allyMonsterCode,
      controller: 1,
      location: LOCATION_MZONE,
      sequence,
      position: POS_FACEUP_ATTACK,
    },
    {
      code: spellCode,
      location: LOCATION_SZONE,
      sequence,
      position: POS_FACEUP,
    },
    {
      code: enemySpellCode,
      controller: 1,
      location: LOCATION_SZONE,
      sequence,
      position: POS_FACEUP,
    },
  ]);
};

const fillMainMonsterRow = (
  ctx: YGOProTest,
  codes: number[],
  controller = 0,
) => {
  codes.forEach((code, sequence) => {
    ctx.addCard({
      code,
      controller,
      location: LOCATION_MZONE,
      sequence,
      position: POS_FACEUP_ATTACK,
    });
  });
};

const fillSpellTrapRow = (ctx: YGOProTest, codes: number[], controller = 0) => {
  codes.forEach((code, sequence) => {
    ctx.addCard({
      code,
      controller,
      location: LOCATION_SZONE,
      sequence,
      position: POS_FACEUP,
    });
  });
};

const chainOpponentStarlightIfAvailable = (ctx: YGOProTest) => {
  const starlight = findCard(ctx, starlightRoad, LOCATION_SZONE, 1, 1);
  if (starlight?.canActivate()) {
    return starlight.activate();
  }
  return undefined;
};

describe("宾果卡", () => {
  const coverageRegistry = createCoverage({
    scriptDir: resolve(process.cwd(), "script"),
  });

  describe("unit", () => {
    it("checks column and row availability filters", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            sequence: 0,
            position: POS_FACEDOWN,
          },
          { code: darkMagician, location: LOCATION_DECK },
          { code: summonedSkull, controller: 1, location: LOCATION_DECK },
        ]);
        ctx.advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local tc=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local ae=c:GetActivateEffect()
          return {
            c${cardCode}.colfilter(tc),
            ae~=nil,
            ae and c${cardCode}.actg(ae,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result[0]).toBe(true);
        expect(result[1]).toBe(true);
        expect(result[2]).toBe(true);
        const trap = findCard(ctx, cardCode, LOCATION_SZONE, 0, 0);
        expect(trap?.canActivate()).toBe(true);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when no full column monster exists", async () => {
      await createTest({}, (ctx) => {
        ctx.addCard([
          { code: cardCode, location: LOCATION_HAND },
          {
            code: blueEyes,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_HAND,0)
          local e=Effect.CreateEffect(c)
          local tc=Duel.GetFieldCard(0,LOCATION_MZONE,0)
          return {
            c${cardCode}.colfilter(tc),
            c${cardCode}.actg(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("returns false when either player cannot draw", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx.addCard({
          code: cardCode,
          location: LOCATION_SZONE,
          sequence: 0,
          position: POS_FACEDOWN,
        });
        ctx.advance(SlientAdvancor());

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=c:GetActivateEffect()
          return {
            Duel.IsPlayerCanDraw(0,1) and Duel.IsPlayerCanDraw(1,1),
            c${cardCode}.actg(e,0,nil,0,0,nil,0,0,0)
          }
        `);

        expect(result).toEqual([false, false]);
        coverageRegistry.addFrom(ctx);
      });
    });

    it("detects a full main monster row", async () => {
      await createTest({}, (ctx) => {
        fillMainMonsterRow(ctx, [
          blueEyes,
          darkMagician,
          summonedSkull,
          valkyrie,
          mammoth,
        ]);
        ctx.addCard([
          { code: cardCode, location: LOCATION_GRAVE },
          { code: trapHole, location: LOCATION_DECK },
          { code: bottomless, location: LOCATION_DECK, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          return {
            c${cardCode}.fullmzone(0),
            c${cardCode}.fullszone(0),
            c${cardCode}.fullmzone(0) or c${cardCode}.fullszone(0),
            c${cardCode}.canrow(0)
          }
        `);

        expect(result).toEqual([true, false, true, true]);
        coverageRegistry.addFrom(ctx);
      });
    });
  });

  describe("e2e", () => {
    it("destroys a full column and makes both players draw", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            { code: darkMagician, location: LOCATION_DECK },
            { code: summonedSkull, controller: 1, location: LOCATION_DECK },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            const trap = findCard(ctx, cardCode, LOCATION_SZONE, 0, 0);
            expect(msg.activatableCards).toContainEqual(
              expect.objectContaining({ code: cardCode }),
            );
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .state(YGOProMsgSelectChain, () => undefined)
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: blueEyes }),
            );
            return findCard(ctx, blueEyes, LOCATION_MZONE, 0, 2)!.select();
          })
          .state(YGOProMsgSelectChain, () => undefined)
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_GRAVE, 0)).toBeDefined();
            expect(
              findCard(ctx, darkMagician, LOCATION_GRAVE, 1),
            ).toBeDefined();
            expect(findCard(ctx, mirrorForce, LOCATION_GRAVE, 0)).toBeDefined();
            expect(findCard(ctx, trapHole, LOCATION_GRAVE, 1)).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeDefined();
            expect(findCard(ctx, darkMagician, LOCATION_HAND, 0)).toBeDefined();
            expect(
              findCard(ctx, summonedSkull, LOCATION_HAND, 1),
            ).toBeDefined();
          });
        coverageRegistry.addFrom(ctx);
      });
    });

    it("can banish itself to destroy your full monster row and draw 2", async () => {
      await createTest({}, (ctx) => {
        fillMainMonsterRow(ctx, [
          blueEyes,
          darkMagician,
          summonedSkull,
          valkyrie,
          mammoth,
        ]);
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            { code: trapHole, location: LOCATION_DECK },
            { code: bottomless, location: LOCATION_DECK, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBeGreaterThanOrEqual(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, blueEyes, LOCATION_MZONE, 0, 0),
            ).toBeUndefined();
            expect(
              findCard(ctx, mammoth, LOCATION_MZONE, 0, 4),
            ).toBeUndefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeUndefined();
            expectCurrentMessage(ctx, YGOProMsgDraw, (msg) => {
              expect(msg.player).toBe(0);
              expect(msg.count).toBe(2);
            });
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("chooses monster or spell/trap row during resolution when both rows are full", async () => {
      await createTest({}, (ctx) => {
        fillMainMonsterRow(ctx, [
          blueEyes,
          darkMagician,
          summonedSkull,
          valkyrie,
          mammoth,
        ]);
        fillSpellTrapRow(ctx, [
          mirrorForce,
          trapHole,
          bottomless,
          compulsory,
          darkHole,
        ]);
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            { code: summonedSkull, location: LOCATION_DECK },
            { code: trapHole, location: LOCATION_DECK, sequence: 1 },
            { code: bottomless, location: LOCATION_DECK, sequence: 2 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(2);
            return msg.prepareResponse(IndexResponse(1));
          })
          .state(YGOProMsgSelectChain, () => undefined)
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 0, 0)).toBeDefined();
            expect(
              findCard(ctx, mirrorForce, LOCATION_SZONE, 0, 0),
            ).toBeUndefined();
            expect(
              findCard(ctx, darkHole, LOCATION_SZONE, 0, 4),
            ).toBeUndefined();
            expect(findCard(ctx, cardCode, LOCATION_REMOVED)).toBeDefined();
            expect(
              ctx.getFieldCard(0, LOCATION_HAND).length,
            ).toBeGreaterThanOrEqual(1);
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("can banish itself to destroy the opponent full spell/trap row", async () => {
      await createTest({}, (ctx) => {
        fillSpellTrapRow(
          ctx,
          [mirrorForce, trapHole, bottomless, compulsory, cardCode],
          1,
        );
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            { code: blueEyes, controller: 1, location: LOCATION_DECK },
            {
              code: darkMagician,
              controller: 1,
              location: LOCATION_DECK,
              sequence: 1,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, mirrorForce, LOCATION_SZONE, 1, 0),
            ).toBeUndefined();
            expect(
              findCard(ctx, compulsory, LOCATION_SZONE, 1, 3),
            ).toBeUndefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE)).toBeUndefined();
            expectCurrentMessage(ctx, YGOProMsgDraw, (msg) => {
              expect(msg.player).toBe(1);
              expect(msg.count).toBe(2);
            });
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("allows Ash Blossom to chain against the draw", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            { code: darkMagician, location: LOCATION_DECK },
            { code: summonedSkull, controller: 1, location: LOCATION_DECK },
            {
              code: ashBlossom,
              controller: 1,
              location: LOCATION_HAND,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE, 0, 0)!.activate(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: ashBlossom }),
            );
            const ash = findCard(ctx, ashBlossom, LOCATION_HAND, 1);
            expect(ash?.canActivate()).toBe(true);
            return ash!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 0, 2)).toBeDefined();
            expect(findCard(ctx, ashBlossom, LOCATION_GRAVE, 1)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("allows Starlight Road to chain when 2 or more of its controller cards would be destroyed", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            { code: darkMagician, location: LOCATION_DECK },
            { code: summonedSkull, controller: 1, location: LOCATION_DECK },
            {
              code: starlightRoad,
              controller: 1,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEDOWN,
            },
            {
              code: stardustDragon,
              controller: 1,
              location: LOCATION_EXTRA,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE, 0, 0)!.activate(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: starlightRoad }),
            );
            return chainOpponentStarlightIfAvailable(ctx);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(false))
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 0, 2)).toBeDefined();
            expect(
              findCard(ctx, darkMagician, LOCATION_MZONE, 1, 2),
            ).toBeDefined();
            expect(
              findCard(ctx, starlightRoad, LOCATION_GRAVE, 1),
            ).toBeDefined();
            expect(findCard(ctx, cardCode, LOCATION_GRAVE, 0)).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("does not allow Starlight Road to chain when only the opponent row is destroyed", async () => {
      await createTest({}, (ctx) => {
        fillSpellTrapRow(
          ctx,
          [mirrorForce, trapHole, bottomless, compulsory, cardCode],
          1,
        );
        ctx
          .addCard([
            { code: cardCode, location: LOCATION_GRAVE },
            {
              code: starlightRoad,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            {
              code: stardustDragon,
              location: LOCATION_EXTRA,
            },
            { code: blueEyes, controller: 1, location: LOCATION_DECK },
            {
              code: darkMagician,
              controller: 1,
              location: LOCATION_DECK,
              sequence: 1,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const trap = findCard(ctx, cardCode, LOCATION_GRAVE);
            expect(trap?.canActivate()).toBe(true);
            return trap!.activate();
          })
          .state(YGOProMsgSelectOption, (msg) => {
            expect(msg.count).toBe(1);
            return msg.prepareResponse(IndexResponse(0));
          })
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).not.toContainEqual(
              expect.objectContaining({ code: starlightRoad }),
            );
            const starlight = findCard(
              ctx,
              starlightRoad,
              LOCATION_SZONE,
              0,
              0,
            );
            expect(starlight?.canActivate()).toBe(false);
            return undefined;
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(
              findCard(ctx, mirrorForce, LOCATION_SZONE, 1, 0),
            ).toBeUndefined();
            expect(
              findCard(ctx, starlightRoad, LOCATION_SZONE, 0, 0),
            ).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });

    it("allows Stardust Dragon to chain against the destroy", async () => {
      await createTest({}, (ctx) => {
        fillColumn(ctx, 2, blueEyes, darkMagician, mirrorForce, trapHole);
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEDOWN,
            },
            { code: darkMagician, location: LOCATION_DECK },
            { code: summonedSkull, controller: 1, location: LOCATION_DECK },
            {
              code: stardustDragon,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE, 0, 0)!.activate(),
          )
          .state(YGOProMsgSelectChain, (msg) => {
            expect(msg.chains).toContainEqual(
              expect.objectContaining({ code: stardustDragon }),
            );
            const stardust = findCard(
              ctx,
              stardustDragon,
              LOCATION_MZONE,
              1,
              0,
            );
            expect(stardust?.canActivate()).toBe(true);
            return stardust!.activate();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, blueEyes, LOCATION_MZONE, 0, 2)).toBeDefined();
            expect(
              findCard(ctx, darkMagician, LOCATION_MZONE, 1, 2),
            ).toBeDefined();
            expect(
              findCard(ctx, stardustDragon, LOCATION_GRAVE, 1),
            ).toBeDefined();
          });

        coverageRegistry.addFrom(ctx);
      });
    });
  });
});
