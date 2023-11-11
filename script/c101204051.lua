--光之黄金柜
--code by lightup37
function c101204051.initial_effect(c)
  --cannot be destroyed
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e1:SetRange(LOCATION_SZONE)
	e1:SetValue(c101204051.efilter)
	c:RegisterEffect(e1)
  --search
  local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_SEARCH+CATEGORY_TOHAND)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_SZONE)
	e2:SetCountLimit(1,101204051)
	e2:SetTarget(c101204051.thtg)
	e2:SetOperation(c101204051.thop)
	c:RegisterEffect(e2)
  --tograve
  local e3=Effect.CreateEffect(c)
  e3:SetCategory(CATEGORY_TOGRAVE)
  e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
  e3:SetRange(LOCATION_SZONE)
  e3:SetProperty(EFFECT_FLAG_CARD_TARGET+EFFECT_FLAG_DELAY)
  e3:SetCountLimit(1,101204051+100)
  e3:SetCode(EVENT_SPSUMMON_SUCCESS)
  e3:SetCondition(c101204051.tgcon)
  e3:SetCost(c101204051.tgcost)
  e3:SetTarget(c101204051.tgtg)
  e3:SetOperation(c101204051.tgop)
  c:RegisterEffect(e3)
  --Activate
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_ACTIVATE)
	e4:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e4)
end

function c101204051.efilter(e,re)
	return re:IsActiveType(TYPE_EFFECT)
end

function c101204051.filter(c)
	return (aux.IsCodeListed(c,101204051)) and (c:IsAbleToHand()) and (not c:IsCode(101204051))
end
function c101204051.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c101204051.filter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function c101204051.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,c101204051.filter,tp,LOCATION_DECK,0,1,1,nil)
	if #g>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end

function c101204051.tgfilter(c)
  return c:IsPreviousLocation(LOCATION_GRAVE) and c:IsAbleToGrave() and c:IsOnField()
end

function c101204051.tgffilter(c,eg)
  return c:IsPreviousLocation(LOCATION_GRAVE) and eg:IsContains(c) and c:IsAbleToGrave() and c:IsOnField()
end

function c101204051.disfilter(c)
  return c:IsDiscardable() and c:IsType(TYPE_SPELL)
end

function c101204051.tgcon(e,tp,eg,ep,ev,re,r,rp)
	return (rp == 1-tp) and eg:IsExists(c101204051.tgfilter,1,nil)
end

function c101204051.tgcost(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk == 0 then return Duel.IsExistingMatchingCard(c101204051.disfilter,tp,LOCATION_HAND,0,1,nil) end
  Duel.DiscardHand(tp,c101204051.disfilter,1,1,REASON_COST+REASON_DISCARD)
end

function c101204051.tgtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return c101204051.tgffilter(chkc,eg) end
  if chk == 0 then return Duel.IsExistingMatchingCard(c101204051.tgffilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil,eg) end
  local g = Duel.SelectMatchingCard(tp,c101204051.tgffilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil,eg)
  Duel.SetTargetCard(g)
  Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,g,1,0,0)
end

function c101204051.tgop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
	if tc:IsRelateToEffect(e) then
		Duel.SendtoGrave(tc,REASON_EFFECT)
	end
end

--光の黄金櫃
--永续魔法
--这个卡名的②③的效果1回合各能使用1次。
--①：这张卡只要在魔法与陷阱区域存在，不会被怪兽的效果破坏。
--②：自己主要阶段才能发动。从卡组把，除「光の黄金櫃」外的，1张有「光の黄金櫃」的卡名记述的卡加入手卡。
--③：对方从墓地把怪兽特殊召唤的场合，从手卡丢弃1张魔法卡，以那之内的1只为对象才能发动。那只怪兽送去墓地。