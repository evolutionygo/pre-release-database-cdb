--三相の魔導兵
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddLinkProcedure(c,aux.FilterBoolFunction(Card.IsLinkType,TYPE_EFFECT),2,2)
	--gain an effect
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e1:SetCode(EVENT_SPSUMMON_SUCCESS)
	e1:SetProperty(EFFECT_FLAG_DELAY)
	e1:SetCountLimit(1,id)
	e1:SetCost(s.cost)
	e1:SetOperation(s.operation)
	c:RegisterEffect(e1)
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(Card.IsDiscardable,tp,LOCATION_HAND,0,1,nil) end
	Duel.DiscardHand(tp,Card.IsDiscardable,1,1,REASON_COST+REASON_DISCARD)
	Duel.SetTargetParam(Duel.GetOperatedGroup():GetFirst():GetType())
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if not c:IsRelateToChain() or not c:IsFaceup() then return end
	local ctype=Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)
	if ctype&TYPE_MONSTER~=0 then
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
		e1:SetRange(LOCATION_MZONE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue(800)
		e1:SetReset(RESET_EVENT+RESETS_STANDARD)
		c:RegisterEffect(e1)
	elseif ctype&TYPE_SPELL~=0 then
		local e2=Effect.CreateEffect(c)
		e2:SetDescription(aux.Stringid(id,1))
		e2:SetType(EFFECT_TYPE_CONTINUOUS+EFFECT_TYPE_FIELD)
		e2:SetProperty(EFFECT_FLAG_CLIENT_HINT)
		e2:SetCode(EFFECT_DESTROY_REPLACE)
		e2:SetRange(LOCATION_MZONE)
		e2:SetTarget(s.reptg)
		e2:SetValue(s.repval)
		e2:SetReset(RESET_EVENT+RESETS_STANDARD)
		c:RegisterEffect(e2)
	else
		local e3=Effect.CreateEffect(c)
		e3:SetDescription(aux.Stringid(id,2))
		e3:SetCategory(CATEGORY_DESTROY)
		e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
		e3:SetProperty(EFFECT_FLAG_DELAY+EFFECT_FLAG_CLIENT_HINT)
		e3:SetCode(EVENT_SPSUMMON_SUCCESS)
		e3:SetRange(LOCATION_MZONE)
		e3:SetCountLimit(1)
		e3:SetCondition(s.descon)
		e3:SetTarget(s.destg)
		e3:SetOperation(s.desop)
		e3:SetReset(RESET_EVENT+RESETS_STANDARD)
		c:RegisterEffect(e3)
	end
end
function s.repfilter(c,tp)
	return c:IsControler(tp) and c:IsLocation(LOCATION_MZONE)
		and c:IsReason(REASON_EFFECT) and not c:IsReason(REASON_REPLACE)
end
function s.reptg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return eg:IsExists(s.repfilter,1,c,tp)
		and c:IsDestructable(e) and not c:IsStatus(STATUS_DESTROY_CONFIRMED) end
	if Duel.SelectEffectYesNo(tp,c,96) then
		Duel.Destroy(c,REASON_EFFECT+REASON_REPLACE)
		return true
	end
	return false
end
function s.repval(e,c)
	return s.repfilter(c,e:GetHandlerPlayer()) and c~=e:GetHandler()
end
function s.descon(e,tp,eg,ep,ev,re,r,rp)
	local lg=e:GetHandler():GetLinkedGroup()
	return eg:IsExists(aux.IsInGroup,1,nil,lg)
end
function s.destg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	local lg=e:GetHandler():GetLinkedGroup()
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,lg,#lg,0,0)
end
function s.desop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if not c:IsRelateToChain() then return end
	Duel.Destroy(c:GetLinkedGroup(),REASON_EFFECT)
end
