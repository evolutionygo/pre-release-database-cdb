import { YGOProMsgBase, YGOProMsgHint } from "ygopro-msg-encode";

type MsgConstructor<T extends YGOProMsgBase = YGOProMsgBase> = new (
  ...args: any[]
) => T;

type MessageContext = {
  currentMessages: YGOProMsgBase[];
};

export function expectCurrentMessage<T extends YGOProMsgBase>(
  ctx: MessageContext,
  msgClass: MsgConstructor<T>,
  assertMessage?: (msg: T) => void,
) {
  const messages = ctx.currentMessages.filter(
    (msg): msg is T => msg instanceof msgClass,
  );
  const names = ctx.currentMessages.map((msg) => msg.constructor.name);

  expect(names).toContain(msgClass.name);
  if (assertMessage) {
    assertMessage(messages[messages.length - 1]);
  }
}

export function expectCurrentMessages(
  ctx: MessageContext,
  ...msgClasses: MsgConstructor[]
) {
  for (const msgClass of msgClasses) {
    expectCurrentMessage(ctx, msgClass);
  }
}

export function expectCurrentMessageMatching<T extends YGOProMsgBase>(
  ctx: MessageContext,
  msgClass: MsgConstructor<T>,
  expected: Partial<T>,
) {
  const messages = ctx.currentMessages.filter(
    (msg): msg is T => msg instanceof msgClass,
  );
  const names = ctx.currentMessages.map((msg) => msg.constructor.name);

  expect(names).toContain(msgClass.name);
  expect(messages).toContainEqual(expect.objectContaining(expected));
}

export function expectCurrentHint(
  ctx: MessageContext,
  expected: Partial<Pick<YGOProMsgHint, "type" | "player" | "desc">>,
) {
  expectCurrentMessageMatching<YGOProMsgHint>(ctx, YGOProMsgHint, expected);
}
