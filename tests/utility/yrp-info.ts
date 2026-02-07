import { formatSnapshot, YGOProTest } from "ygopro-jstest";
import { YGOProMsgBase } from "ygopro-msg-encode";

export type MsgSnapshot = {
  identifier: number;
  msg: string;
} & Partial<YGOProMsgBase>;

export interface YrpInfo {
  messages: MsgSnapshot[];
  snapshot: ReturnType<typeof YGOProTest.prototype.querySnapshot>;
  snapshotText: string;
}

export const toYrpInfo = (test: YGOProTest): YrpInfo => {
  const snapshot = test.querySnapshot();
  const snapshotText = formatSnapshot(snapshot);
  const stripMsgName = (msg: string) => msg.replace(/^YGOProMsg/, "");
  return {
    messages: test.allMessages.map((msg) => ({
      identifier: msg.identifier,
      msg: stripMsgName(msg.constructor.name),
      ...msg,
    })),
    snapshot,
    snapshotText,
  };
};
