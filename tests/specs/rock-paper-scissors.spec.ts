import { resolve } from "node:path";
import {
  IdleCmdType,
  NoEffectAdvancor,
  SlientAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import {
  OcgcoreScriptConstants,
  YGOProMsgHandRes,
  YGOProMsgRetry,
  YGOProMsgRockPaperScissors,
  YGOProMsgSelectBattleCmd,
  YGOProMsgSelectCard,
  YGOProMsgSelectChain,
  YGOProMsgSelectIdleCmd,
  YGOProMsgSelectPlace,
} from "ygopro-msg-encode";
import { createCoverage } from "../utility/create-coverage";
import { createTest } from "../utility/create-test";

const repeatFixture = 9001;
const noRepeatFixture = 9002;
const gear = 58297729;
const attackerCode = 89631139;
const defenderCode = 46986414;

const fixtureDir = resolve(
  process.cwd(),
  "tests",
  "specs",
  "fixtures",
  "rock-paper-scissors",
);
const fixtureCdb = resolve(fixtureDir, "rock-paper-scissors.cdb");
const fixtureScriptDir = resolve(fixtureDir, "script");

const {
  LOCATION_HAND,
  LOCATION_MZONE,
  LOCATION_REMOVED,
  LOCATION_SZONE,
  POS_FACEUP_ATTACK,
} = OcgcoreScriptConstants;

const fixtureCoverage = createCoverage({ scriptDir: fixtureScriptDir });
const officialCoverage = createCoverage({
  scriptDir: resolve(process.cwd(), "ygopro", "script"),
});

const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

const int32Response = (value: number) => {
  const buffer = new Uint8Array(4);
  new DataView(buffer.buffer).setInt32(0, value, true);
  return buffer;
};

const packHands = (hand0: number, hand1: number) => hand0 + (hand1 << 2);

const getWinner = (hand0: number, hand1: number) => {
  if (hand0 === hand1) return -1;
  if (
    (hand0 === 1 && hand1 === 2) ||
    (hand0 === 2 && hand1 === 3) ||
    (hand0 === 3 && hand1 === 1)
  ) {
    return 1;
  }
  return 0;
};

const expectRpsPrompt = (ctx: YGOProTest, player: number) => {
  expect(ctx.lastSelectMessage).toBeInstanceOf(YGOProMsgRockPaperScissors);
  expect((ctx.lastSelectMessage as YGOProMsgRockPaperScissors).player).toBe(
    player,
  );
};

const expectHandResult = (ctx: YGOProTest, hand0: number, hand1: number) => {
  const handResult = ctx.currentMessages.find(
    (msg): msg is YGOProMsgHandRes => msg instanceof YGOProMsgHandRes,
  );
  expect(handResult?.result).toBe(packHands(hand0, hand1));
};

const respondRps = (ctx: YGOProTest, player: number, hand: number) =>
  ctx.state(YGOProMsgRockPaperScissors, (msg) => {
    expect(msg.player).toBe(player);
    return int32Response(hand);
  });

const respondInvalidRps = (ctx: YGOProTest, player: number, hand: number) => {
  const prompt = ctx.lastSelectMessage;
  expect(prompt).toBeInstanceOf(YGOProMsgRockPaperScissors);
  expect((prompt as YGOProMsgRockPaperScissors).player).toBe(player);
  expect(() =>
    ctx.state(YGOProMsgRockPaperScissors, (msg) => {
      expect(msg.player).toBe(player);
      return int32Response(hand);
    }),
  ).toThrow("Got MSG_RETRY.");
  expect(ctx.currentMessages.some((msg) => msg instanceof YGOProMsgRetry)).toBe(
    true,
  );
  ctx.lastSelectMessage = prompt;
};

const runFixtureTest = (cb: Parameters<typeof createTest>[1]) =>
  createTest({ cdb: fixtureCdb, scriptPath: fixtureScriptDir }, async (ctx) => {
    try {
      await cb(ctx);
    } finally {
      fixtureCoverage.addFrom(ctx);
    }
  });

const runOfficialTest = (cb: Parameters<typeof createTest>[1]) =>
  createTest({}, async (ctx) => {
    try {
      await cb(ctx);
    } finally {
      officialCoverage.addFrom(ctx);
    }
  });

const activateFixtureSpell = (ctx: YGOProTest, code: number) =>
  ctx
    .addCard({ code, location: LOCATION_HAND })
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, () => {
      const spell = findCard(ctx, code, LOCATION_HAND);
      expect(spell?.canActivate()).toBe(true);
      return spell!.activate();
    })
    .state(YGOProMsgSelectPlace, (msg) => {
      const place = msg
        .getSelectablePlaces()
        .find((item) => item.player === 0 && item.location === LOCATION_SZONE);
      expect(place).toBeDefined();
      return msg.prepareResponse([place!]);
    })
    .advance(NoEffectAdvancor());

const activateGear = (ctx: YGOProTest) =>
  ctx
    .addCard([
      {
        code: gear,
        location: LOCATION_SZONE,
      },
      {
        code: attackerCode,
        controller: 1,
        location: LOCATION_MZONE,
        position: POS_FACEUP_ATTACK,
      },
      {
        code: defenderCode,
        location: LOCATION_MZONE,
        position: POS_FACEUP_ATTACK,
      },
    ])
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor())
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_BP),
    )
    .advance(NoEffectAdvancor())
    .state(YGOProMsgSelectBattleCmd, (msg) => {
      expect(msg.player).toBe(1);
      expect(msg.attackableCards).toContainEqual(
        expect.objectContaining({ code: attackerCode }),
      );
      const attacker = findCard(ctx, attackerCode, LOCATION_MZONE, 1);
      expect(attacker?.canPerformAttack()).toBe(true);
      return attacker!.performAttack();
    })
    .state(YGOProMsgSelectCard, (msg) => {
      expect(msg.cards).toContainEqual(
        expect.objectContaining({ code: defenderCode, controller: 0 }),
      );
      const defender = findCard(ctx, defenderCode, LOCATION_MZONE);
      expect(defender?.canSelect()).toBe(true);
      return defender!.select();
    })
    .advance(NoEffectAdvancor())
    .state(YGOProMsgSelectChain, (msg) => {
      expect(msg.chains).toContainEqual(
        expect.objectContaining({ code: gear }),
      );
      const card = findCard(ctx, gear, LOCATION_SZONE);
      expect(card?.canActivate()).toBe(true);
      return card!.activate();
    })
    .advance(NoEffectAdvancor());

const expectBattleMonsterState = (
  ctx: YGOProTest,
  expected: { attackerOnField: boolean; defenderOnField: boolean },
) => {
  expect(Boolean(findCard(ctx, attackerCode, LOCATION_MZONE, 1))).toBe(
    expected.attackerOnField,
  );
  expect(Boolean(findCard(ctx, defenderCode, LOCATION_MZONE))).toBe(
    expected.defenderOnField,
  );
  expect(ctx.getFieldCard(0, LOCATION_REMOVED)).toHaveLength(
    expected.defenderOnField ? 0 : 1,
  );
  expect(ctx.getFieldCard(1, LOCATION_REMOVED)).toHaveLength(
    expected.attackerOnField ? 0 : 1,
  );
};

describe("Duel.RockPaperScissors response validation", () => {
  describe("fixture spells", () => {
    it.each([
      [1, 2],
      [2, 3],
      [3, 1],
      [2, 1],
      [3, 2],
      [1, 3],
    ])("resolves valid non-tie hands %i/%i", async (hand0, hand1) => {
      await runFixtureTest((ctx) => {
        activateFixtureSpell(ctx, repeatFixture);
        expectRpsPrompt(ctx, 0);
        respondRps(ctx, 0, hand0);
        expectRpsPrompt(ctx, 1);
        respondRps(ctx, 1, hand1);
        expectHandResult(ctx, hand0, hand1);

        const winner = getWinner(hand0, hand1);
        expect(ctx.getLP(0)).toBe(winner === 0 ? 8000 : 7000);
        expect(ctx.getLP(1)).toBe(winner === 0 ? 7000 : 8000);
      });
    });

    it("retries an invalid first-player response without advancing the RPS step", async () => {
      await runFixtureTest((ctx) => {
        activateFixtureSpell(ctx, repeatFixture);
        respondInvalidRps(ctx, 0, 0);
        expectRpsPrompt(ctx, 0);
        respondRps(ctx, 0, 2);
        expectRpsPrompt(ctx, 1);
        respondRps(ctx, 1, 1);
        expectHandResult(ctx, 2, 1);
        expect(ctx.getLP(0)).toBe(8000);
        expect(ctx.getLP(1)).toBe(7000);
      });
    });

    it("retries invalid second-player responses without overwriting player 0 hand", async () => {
      await runFixtureTest((ctx) => {
        activateFixtureSpell(ctx, repeatFixture);
        respondRps(ctx, 0, 3);
        respondInvalidRps(ctx, 1, 4);
        expectRpsPrompt(ctx, 1);
        respondInvalidRps(ctx, 1, -1);
        expectRpsPrompt(ctx, 1);
        respondRps(ctx, 1, 2);
        expectHandResult(ctx, 3, 2);
        expect(ctx.getLP(0)).toBe(8000);
        expect(ctx.getLP(1)).toBe(7000);
      });
    });

    it("emits hand result and restarts from player 0 on repeat ties", async () => {
      await runFixtureTest((ctx) => {
        activateFixtureSpell(ctx, repeatFixture);
        respondRps(ctx, 0, 1);
        respondRps(ctx, 1, 1);
        expectHandResult(ctx, 1, 1);
        expectRpsPrompt(ctx, 0);
        expect(
          ctx.currentMessages.some(
            (msg) =>
              msg instanceof YGOProMsgRockPaperScissors && msg.player === 0,
          ),
        ).toBe(true);

        respondRps(ctx, 0, 2);
        respondRps(ctx, 1, 1);
        expectHandResult(ctx, 2, 1);
        expect(ctx.getLP(0)).toBe(8000);
        expect(ctx.getLP(1)).toBe(7000);
      });
    });

    it("returns PLAYER_NONE on no-repeat ties", async () => {
      await runFixtureTest((ctx) => {
        activateFixtureSpell(ctx, noRepeatFixture);
        respondRps(ctx, 0, 2);
        respondRps(ctx, 1, 2);
        expectHandResult(ctx, 2, 2);
        expect(ctx.getLP(0)).toBe(8500);
        expect(ctx.getLP(1)).toBe(8000);
      });
    });
  });

  describe("变则齿轮", () => {
    it("removes the opponent battling monster when player 0 wins RPS", async () => {
      await runOfficialTest((ctx) => {
        activateGear(ctx);
        respondRps(ctx, 0, 2);
        respondRps(ctx, 1, 1);
        expectHandResult(ctx, 2, 1);
        expectBattleMonsterState(ctx, {
          attackerOnField: false,
          defenderOnField: true,
        });
      });
    });

    it("removes player 0's battling monster when player 1 wins RPS", async () => {
      await runOfficialTest((ctx) => {
        activateGear(ctx);
        respondRps(ctx, 0, 1);
        respondRps(ctx, 1, 2);
        expectHandResult(ctx, 1, 2);
        expectBattleMonsterState(ctx, {
          attackerOnField: true,
          defenderOnField: false,
        });
      });
    });
  });
});
