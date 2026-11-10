--王の記憶－オベリスクの巨神兵
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	--condition
	local e0=Effect.CreateEffect(c)
	e0:SetType(EFFECT_TYPE_SINGLE)
	e0:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e0:SetCode(EFFECT_SPSUMMON_CONDITION)
	e0:SetValue(aux.FALSE)
	c:RegisterEffect(e0)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_RELEASE+CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e1:SetCode(EVENT_DRAW)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_DUEL)
	e1:SetCost(s.cost)
	e1:SetTarget(s.target)
	e1:SetOperation(s.operation)
	c:RegisterEffect(e1)
	local e2=e1:Clone()
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_ATTACK_ANNOUNCE)
	e2:SetRange(LOCATION_HAND)
	e2:SetCondition(s.atkcon)
	c:RegisterEffect(e2)
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return not e:GetHandler():IsPublic() end
end
function s.atkcon(e,tp,eg,ep,ev,re,r,rp)
	local ac=Duel.GetAttacker()
	return ac~=nil and ac:IsControler(1-tp) and not Duel.GetAttackTarget()
end
function s.gyfilter(c,e,tp)
	return c:IsType(TYPE_MONSTER) and c:IsReason(REASON_DESTROY) and c:GetTurnID()==Duel.GetTurnCount()
		and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	local gct=Duel.GetMatchingGroupCount(s.gyfilter,tp,LOCATION_GRAVE,0,nil,e,tp)
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	if chk==0 then
		if gct<=0 or ft<=0 or not c:IsCanBeSpecialSummoned(e,0,tp,true,false) then return false end
		return Duel.IsPlayerCanRelease(tp)
	end
	if ft>1 and Duel.IsPlayerAffectedByEffect(tp,59822133) then ft=1 end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,math.min(gct,ft),tp,LOCATION_GRAVE)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	if ft>1 and Duel.IsPlayerAffectedByEffect(tp,59822133) then ft=1 end
	if ft<=0 then return end
	local g=Duel.GetMatchingGroup(aux.NecroValleyFilter(s.gyfilter),tp,LOCATION_GRAVE,0,nil,e,tp)
	if #g>ft then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		g=g:Select(tp,ft,ft,nil)
	end
	if #g==0 then return end
	if Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)==0 then return end
	local rg=Duel.GetMatchingGroup(Card.IsReleasableByEffect,tp,LOCATION_MZONE,0,nil)
	if #rg==0 then return end
	Duel.BreakEffect()
	local ct=Duel.Release(rg,REASON_EFFECT)
	if ct>0 and c:IsRelateToChain() and c:IsLocation(LOCATION_HAND)
		and Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and c:IsCanBeSpecialSummoned(e,0,tp,true,false) then
		local res=Duel.SpecialSummon(c,0,tp,tp,true,false,POS_FACEUP)
		if res>0 and ct>=3 then
			Duel.BreakEffect()
			local dg=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil)
			if #dg>0 and Duel.Destroy(dg,REASON_EFFECT)>0 then
				Duel.SetLP(1-tp,math.ceil(Duel.GetLP(1-tp)/2))
			end
		end
	end
end
