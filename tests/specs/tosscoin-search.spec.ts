import {
  SlientAdvancor,
  SummonPlaceAdvancor,
  NoEffectAdvancor,
} from "koishipro-core.js";
import {
  OcgcoreScriptConstants,
  YGOProMsgSelectCard,
  YGOProMsgSelectEffectYn,
  YGOProMsgSelectIdleCmd,
} from "ygopro-msg-encode";
import { createTest } from "../utility/create-test";

describe("Tosscoin Search", () => {
  it("Should be able to search proper cards", async () => {
    await createTest({}, (ctx) =>
      ctx
        .addCard([
          {
            code: 10000,
            location: OcgcoreScriptConstants.LOCATION_DECK, // not searchable
          },
          {
            code: 71625222,
            location: OcgcoreScriptConstants.LOCATION_DECK, // searchable
          },
          {
            code: 83764718,
            location: OcgcoreScriptConstants.LOCATION_DECK, // even not a monster
          },
          {
            code: 50915474,
            location: OcgcoreScriptConstants.LOCATION_HAND,
          },
        ])
        .state(() => {
          expect(ctx.evaluate(`return EFFECT_FLAG_COIN`)).toBe(
            OcgcoreScriptConstants.EFFECT_FLAG_COIN,
          ); // caused by lua int64 problem, just check if the constant is correctly passed
          expect(
            ctx.evaluate(`
            local dg = Duel.GetFieldGroup(0, LOCATION_DECK, 0)
            local notSearchable = dg:Filter(Card.IsCode, nil, 10000):GetFirst()
            local searchable = dg:Filter(Card.IsCode, nil, 71625222):GetFirst()
            return {c50915474.thfilter(notSearchable), c50915474.thfilter(searchable)}
            `),
          ).toEqual([false, true]);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectIdleCmd, (msg) => {
          const hand = ctx.getFieldCard(
            0,
            OcgcoreScriptConstants.LOCATION_HAND,
          );
          expect(hand).toHaveLength(1);
          const hc = hand[0];
          expect(hc.code).toBe(50915474);
          expect(hc.canSummon()).toBeTruthy();
          return hc.summon();
        })
        .advance(SummonPlaceAdvancor(), NoEffectAdvancor())
        .state(YGOProMsgSelectEffectYn, (msg) => {
          expect(msg.code).toBe(50915474); // check if it's the correct card effect
          return msg.prepareResponse(true);
        })
        .advance(SlientAdvancor())
        .state(YGOProMsgSelectCard, (msg) => {
          expect(msg.cards).toHaveLength(1);
          const c = msg.cards[0];
          expect(c.code).toBe(71625222);
          return msg.prepareResponse([c]);
        })
        .state(() => {
          const hand = ctx.getFieldCard(
            0,
            OcgcoreScriptConstants.LOCATION_HAND,
          );
          expect(hand).toHaveLength(1);
          const hc = hand[0];
          expect(hc.code).toBe(71625222);
        }),
    );
  });
});
