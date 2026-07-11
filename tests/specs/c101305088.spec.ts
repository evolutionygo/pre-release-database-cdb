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
  YGOProMsgSelectCard,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectYesNo,
  YGOProMsgSpSummoned,
  YGOProMsgSpSummoning,
} from "ygopro-msg-encode";
import {
  expectCurrentHint,
  expectCurrentMessages,
} from "../utility/current-messages";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const cardCode = 101305088;
const tokenCode = 101305188;
const blueEyes = 89631139;
const darkMagician = 46986414;
const summonedSkull = 70781052;
const mammoth = 40374923;
const solemnWarning = 84749824;
const sangan = 26202165;

const {
  HINT_SELECTMSG,
  HINTMSG_REMOVE,
  LOCATION_GRAVE,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP,
  POS_FACEUP_ATTACK,
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

const registerTargetingFieldEffect = (ctx: YGOProTest) => {
  ctx.evaluate(`
    local c=Duel.GetFieldCard(1,LOCATION_MZONE,0)
    local e=Effect.CreateEffect(c)
    e:SetDescription(1)
    e:SetCategory(CATEGORY_DESTROY)
    e:SetType(EFFECT_TYPE_IGNITION)
    e:SetProperty(EFFECT_FLAG_CARD_TARGET)
    e:SetRange(LOCATION_MZONE)
    e:SetTarget(function(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
      if chkc then return chkc:IsOnField() and chkc~=e:GetHandler() end
      if chk==0 then return Duel.IsExistingTarget(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,e:GetHandler()) end
      Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
      local g=Duel.SelectTarget(tp,aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,e:GetHandler())
      Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
    end)
    e:SetOperation(function(e,tp,eg,ep,ev,re,r,rp)
      local tc=Duel.GetFirstTarget()
      if tc and tc:IsRelateToChain() then
        Duel.Destroy(tc,REASON_EFFECT)
      end
    end)
    c:RegisterEffect(e)
  `);
};

describe("欺诈转移", () => {
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
    it("checks tfilter/cfilter and token cost/target availability", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            position: POS_FACEUP,
          },
          {
            code: blueEyes,
            controller: 1,
            location: LOCATION_MZONE,
            sequence: 0,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: darkMagician,
            location: LOCATION_MZONE,
            sequence: 2,
            position: POS_FACEUP_ATTACK,
          },
          {
            code: mammoth,
            location: LOCATION_MZONE,
            sequence: 4,
            position: POS_FACEUP_ATTACK,
          },
          { code: sangan, location: LOCATION_GRAVE },
          { code: solemnWarning, location: LOCATION_GRAVE, sequence: 1 },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local rc=Duel.GetFieldCard(1,LOCATION_MZONE,0)
          local diff=Duel.GetFieldCard(0,LOCATION_MZONE,2)
          local same=Duel.GetFieldCard(0,LOCATION_MZONE,4)
          local mon=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${sangan}):GetFirst()
          local trap=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_GRAVE,0,nil,${solemnWarning}):GetFirst()
          local e=Effect.CreateEffect(c)
          local oldRelate=Card.IsRelateToChain
          Card.IsRelateToChain=function(card,ev) return true end
          local ret={
            c${cardCode}.tfilter(diff,rc,0),
            c${cardCode}.tfilter(same,rc,0),
            c${cardCode}.cfilter(mon,0),
            c${cardCode}.cfilter(trap,0),
            c${cardCode}.tokencost(e,0,nil,0,0,nil,0,0,0),
            Duel.IsPlayerCanSpecialSummonMonster(0,${tokenCode},0,TYPES_TOKEN_MONSTER,800,800,3,RACE_PSYCHO,ATTRIBUTE_EARTH)
          }
          Card.IsRelateToChain=oldRelate
          return ret
        `);

        expect(result).toEqual([true, false, true, false, true, true]);
      });
    });

    it("returns false for tokencost without a level monster in the GY", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            position: POS_FACEUP,
          },
          { code: solemnWarning, location: LOCATION_GRAVE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.tokencost(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });

    it("tokentg requires a checked cost", async () => {
      await runCoveredTest((ctx) => {
        ctx.addCard([
          {
            code: cardCode,
            location: LOCATION_SZONE,
            position: POS_FACEUP,
          },
          { code: sangan, location: LOCATION_GRAVE },
        ]);

        const result = ctx.evaluate(`
          local c=Duel.GetFieldCard(0,LOCATION_SZONE,0)
          local e=Effect.CreateEffect(c)
          return c${cardCode}.tokentg(e,0,nil,0,0,nil,0,0,0)
        `);

        expect(result).toBe(false);
      });
    });
  });

  describe("e2e", () => {
    it("negates when the opponent declines to banish from the GY", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
            {
              code: darkMagician,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            { code: mammoth, controller: 1, location: LOCATION_GRAVE },
          ])
          .advance(SlientAdvancor());
        registerTargetingFieldEffect(ctx);

        ctx
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, (msg) => {
            expect(msg.player).toBe(1);
            const monster = findCard(ctx, blueEyes, LOCATION_MZONE, 1);
            expect(monster?.canActivate(1)).toBe(true);
            return monster!.activate(1);
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, (msg) => {
            expect(msg.cards).toContainEqual(
              expect.objectContaining({ code: darkMagician }),
            );
            return findCard(ctx, darkMagician, LOCATION_MZONE)!.select();
          })
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => {
            expect(msg.player).toBe(1);
            return msg.prepareResponse(false);
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, darkMagician, LOCATION_MZONE)).toBeDefined();
            expect(findCard(ctx, mammoth, LOCATION_GRAVE, 1)).toBeDefined();
          });
      });
    });

    it("lets the opponent banish from the GY to keep the effect", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
            {
              code: darkMagician,
              location: LOCATION_MZONE,
              sequence: 2,
              position: POS_FACEUP_ATTACK,
            },
            {
              code: blueEyes,
              controller: 1,
              location: LOCATION_MZONE,
              sequence: 0,
              position: POS_FACEUP_ATTACK,
            },
            { code: mammoth, controller: 1, location: LOCATION_GRAVE },
          ])
          .advance(SlientAdvancor());
        registerTargetingFieldEffect(ctx);

        ctx
          .state(YGOProMsgSelectIdleCmd, (msg) =>
            msg.prepareResponse(IdleCmdType.TO_EP),
          )
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, blueEyes, LOCATION_MZONE, 1)!.activate(1),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, darkMagician, LOCATION_MZONE)!.select(),
          )
          .advance(NoEffectAdvancor())
          .state(YGOProMsgSelectYesNo, (msg) => msg.prepareResponse(true))
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: mammoth,
                location: LOCATION_GRAVE,
                controller: 1,
              }),
            );
            return findCard(ctx, mammoth, LOCATION_GRAVE, 1)!.select();
          })
          .advance(NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, darkMagician, LOCATION_GRAVE)).toBeDefined();
            expect(findCard(ctx, mammoth, LOCATION_REMOVED, 1)).toBeDefined();
          });
      });
    });

    it("② banishes a GY monster and special summons an Imposter Token", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              position: POS_FACEUP,
            },
            { code: sangan, location: LOCATION_GRAVE },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            const spell = findCard(ctx, cardCode, LOCATION_SZONE);
            expect(spell?.canActivate()).toBe(true);
            return spell!.activate();
          })
          .state(YGOProMsgSelectCard, (msg) => {
            expectCurrentHint(ctx, {
              type: HINT_SELECTMSG,
              player: 0,
              desc: HINTMSG_REMOVE,
            });
            expect(msg.cards).toContainEqual(
              expect.objectContaining({
                code: sangan,
                location: LOCATION_GRAVE,
              }),
            );
            return findCard(ctx, sangan, LOCATION_GRAVE)!.select();
          })
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expectCurrentMessages(
              ctx,
              YGOProMsgSpSummoning,
              YGOProMsgSpSummoned,
            );
            expect(findCard(ctx, sangan, LOCATION_REMOVED)).toBeDefined();
            const token = findCard(ctx, tokenCode, LOCATION_MZONE);
            expect(token).toBeDefined();
            const level = ctx.evaluate(`
              return Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${tokenCode}):GetFirst():GetLevel()
            `);
            expect(level).toBe(3);
            expect(findCard(ctx, cardCode, LOCATION_SZONE)?.canActivate()).toBe(
              false,
            );
          });
      });
    });

    it("only allows the token effect once per turn", async () => {
      await runCoveredTest((ctx) => {
        ctx
          .addCard([
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 0,
              position: POS_FACEUP,
            },
            {
              code: cardCode,
              location: LOCATION_SZONE,
              sequence: 1,
              position: POS_FACEUP,
            },
            { code: sangan, location: LOCATION_GRAVE },
            { code: summonedSkull, location: LOCATION_GRAVE, sequence: 1 },
          ])
          .advance(SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () =>
            findCard(ctx, cardCode, LOCATION_SZONE, 0, 0)!.activate(),
          )
          .state(YGOProMsgSelectCard, () =>
            findCard(ctx, sangan, LOCATION_GRAVE)!.select(),
          )
          .advance(SummonPlaceAdvancor(), NoEffectAdvancor(), SlientAdvancor())
          .state(YGOProMsgSelectIdleCmd, () => {
            expect(findCard(ctx, tokenCode, LOCATION_MZONE)).toBeDefined();
            const other = findCard(ctx, cardCode, LOCATION_SZONE, 0, 1);
            expect(other?.canActivate()).toBe(false);
          });
      });
    });
  });
});
