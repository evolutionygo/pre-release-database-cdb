import {
  IdleCmdType,
  NoEffectAdvancor,
  SlientAdvancor,
  type YGOProTest,
} from "ygopro-jstest";
import { YGOProMsgSelectIdleCmd } from "ygopro-msg-encode";

// 喷气同调士：1星协调
export const tuner = 9742784;
export const synchroLevel9 = 744887;
export const synchroLevel7 = 6368038;
export const angelechyProblem = 101305094;
export const angelechyEnlisted = 101305093;
export const angelechyTrap = 101305095;
export const angelechyOpening = 101305096;

export const findCard = (
  ctx: YGOProTest,
  code: number,
  location: number,
  controller = 0,
) => ctx.getFieldCard(controller, location).find((card) => card.code === code);

export const endTurn = (ctx: YGOProTest) =>
  ctx
    .state(YGOProMsgSelectIdleCmd, (msg) =>
      msg.prepareResponse(IdleCmdType.TO_EP),
    )
    .advance(SlientAdvancor(), NoEffectAdvancor());

export const goToOpponentMainPhase = (ctx: YGOProTest) =>
  endTurn(ctx).advance(SlientAdvancor());

/** 把已在魔陷区的怪兽卡注册为永续魔法类型 */
export const registerContinuousSpellType = (
  ctx: YGOProTest,
  controller: number,
  code: number,
) => {
  ctx.evaluate(`
    local tp=${controller}
    local c=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_SZONE,0,nil,${code}):GetFirst()
    if c and c:GetType()&TYPE_SPELL==0 then
      local e1=Effect.CreateEffect(c)
      e1:SetCode(EFFECT_CHANGE_TYPE)
      e1:SetType(EFFECT_TYPE_SINGLE)
      e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
      e1:SetReset(RESET_EVENT+RESETS_STANDARD-RESET_TURN_SET)
      e1:SetValue(TYPE_SPELL+TYPE_CONTINUOUS)
      c:RegisterEffect(e1)
    end
  `);
};

/**
 * 在场上怪兽上挂测试用起动效果，Raise 魔陷区目标卡的放置诱发。
 * evaluate 里不能直接 RaiseSingleEvent / MoveToField。
 * 请在 advance 之前调用，以便 IdleCmd 能看到新效果。
 */
export const armPlaceTrigger = (
  ctx: YGOProTest,
  code: number,
  controller = 0,
) => {
  registerContinuousSpellType(ctx, controller, code);
  ctx.evaluate(`
    local tp=${controller}
    local target=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_SZONE,0,nil,${code}):GetFirst()
    local host=Duel.GetFieldCard(tp,LOCATION_MZONE,0)
    if not target or not host then return end
    function __AngechyRaisePlace(e,tp,eg,ep,ev,re,r,rp)
      Duel.RaiseSingleEvent(target,EVENT_CUSTOM+${code},e,0,tp,tp,0)
    end
    local e=Effect.CreateEffect(host)
    e:SetDescription(aux.Stringid(${code},1))
    e:SetType(EFFECT_TYPE_IGNITION)
    e:SetRange(LOCATION_MZONE)
    e:SetOperation(__AngechyRaisePlace)
    host:RegisterEffect(e)
  `);
};

/** 兼容旧名 */
export const triggerPlaceAsContinuous = armPlaceTrigger;
export const placeFromExtraAsContinuous = armPlaceTrigger;

export const addOverlays = (
  ctx: YGOProTest,
  controller: number,
  count: number,
  materialCode: number,
) => {
  ctx.evaluate(`
    local tp=${controller}
    local c=Duel.GetFieldCard(tp,LOCATION_MZONE,0)
    if not c then return end
    local seq=c:GetSequence()
    for i=1,${count} do
      Debug.AddCard(${materialCode},tp,tp,LOCATION_MZONE,seq,POS_FACEUP_ATTACK)
    end
  `);
};
