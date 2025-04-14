--Mitsurugi Magatama
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DESTROY+CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetCondition(s.con)
	e1:SetTarget(s.target)
	e1:SetOperation(s.operation)
	c:RegisterEffect(e1)
end
function s.cfilter(c)
	return c:IsRace(RACE_REPTILE)
end
function s.con(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsMainPhase()
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	local c1=not e:IsCostChecked() or Duel.CheckReleaseGroup(tp,s.cfilter,1,nil)
	local b1=c1 and Duel.IsExistingTarget(Card.IsFaceup,tp,0,LOCATION_ONFIELD,1,nil)
	local b2=aux.RitualUltimateTarget(s.ritual_filter,Card.GetLevel,"Greater",LOCATION_HAND,nil,s.mfilter)(e,tp,eg,ep,ev,re,r,rp,0)
	if chkc then
		if e:GetLabel()~=1 then return false end
		return chkc:IsLocation(LOCATION_ONFIELD) and chkc:IsControler(1-tp) and chkc:IsFaceup()
	end
	if chk==0 then return b1 or b2 end
	local op=aux.SelectFromOptions(tp,
		{b1,aux.Stringid(id,1),1},
		{b2,aux.Stringid(id,2),2}
	)
	if op==1 then
		if e:IsCostChecked() then
			local g=Duel.SelectReleaseGroup(tp,s.cfilter,1,1,nil)
			Duel.Release(g,REASON_COST)
		end
		e:SetLabel(1)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectTarget(tp,Card.IsFaceup,tp,0,LOCATION_ONFIELD,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_DESTROY)
		end
	elseif op==2 then
		e:SetLabel(2)
		aux.RitualUltimateTarget(s.ritual_filter,Card.GetLevel,"Greater",LOCATION_HAND,nil,s.mfilter)(e,tp,eg,ep,ev,re,r,rp,chk)
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON)
		end
	end
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	if e:GetLabel()==1 then
		s.operation1(e,tp,eg,ep,ev,re,r,rp)
	elseif e:GetLabel()==2 then
		aux.RitualUltimateOperation(s.ritual_filter,Card.GetLevel,"Greater",LOCATION_HAND,nil,s.mfilter)(e,tp,eg,ep,ev,re,r,rp)
	end
end
function s.operation1(e,tp,eg,ep,ev,re,r,rp)
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToEffect(e) then
		Duel.Destroy(tc,REASON_EFFECT)
	end
end
function s.mfilter(c)
	return c:IsLocation(LOCATION_MZONE)
end
function s.ritual_filter(c)
	return c:IsType(TYPE_RITUAL) and c:IsSetCard(0x1c3)
end