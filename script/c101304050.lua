--四花繚乱の霊使い
local s,id,o=GetID()
function s.initial_effect(c)
	--link summon
	aux.AddLinkProcedure(c,nil,2)
	c:EnableReviveLimit()
	--atk
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e1:SetCode(EFFECT_UPDATE_ATTACK)
	e1:SetRange(LOCATION_MZONE)
	e1:SetValue(s.atkval)
	c:RegisterEffect(e1)
	--destroy
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_QUICK_O)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCountLimit(1,id)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET+EFFECT_FLAG_NO_TURN_RESET)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END)
	e1:SetCondition(s.spcon)
	e1:SetTarget(s.sptg)
	e1:SetOperation(s.spop)
	c:RegisterEffect(e1)
end
function s.atkfilter(c)
	return c:IsFaceup() and c:GetAttribute()~=0
end
function s.val(e,c)
	local g=Duel.GetMatchingGroup(s.atkfilter,e:GetHandlerPlayer(),LOCATION_MZONE,LOCATION_MZONE,nil)
	return aux.GetAttributeCount(g)*300
end
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsMainPhase()
end
function s.spfilter(c,e,tp)
	return c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP) and c:IsCanBeEffectTarget(e)
end
function s.gcheck(g,tp)
	return g:FilterCount(Card.GetRace)==g:GetCount()
		and g:FilterCount(Card.GetAttribute)~=g:GetCount()
			or g:FilterCount(Card.GetAttribute)==g:GetCount()
			and g:FilterCount(Card.GetRace)~=g:GetCount()
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return false end
	local g=Duel.GetMatchingGroup(s.spfilter,tp,LOCATION_GRAVE,0,nil,e,tp)
	if chk==0 then return not Duel.IsPlayerAffectedByEffect(tp,59822133)
		and Duel.GetLocationCount(tp,LOCATION_MZONE)>1
		and g:CheckSubGroup(s.gcheck,2,2) end
	e:GetHandler():RegisterFlagEffect(0,RESET_EVENT+RESETS_STANDARD,EFFECT_FLAG_CLIENT_HINT,1,0,aux.Stringid(id,3))
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g1=g:SelectSubGroup(tp,s.gcheck,false,2,2)
	Duel.SetTargetCard(g1)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g1,2,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	if ft<=0 then return end
	local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS)
	local sg=g:Filter(Card.IsRelateToChain,nil)
	if sg:GetCount()<2 or Duel.IsPlayerAffectedByEffect(tp,59822133)
		or sg:GetCount()>ft  then return end
	if Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP)~=0 then
		if c:IsRelateToChain() and c:IsFaceup() then sg:AddCard(c) end
		for tc in aux.Next(sg) do
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
			e1:SetCode(EFFECT_CANNOT_BE_LINK_MATERIAL)
			e1:SetRange(LOCATION_MZONE)
			e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END,2)
			e1:SetValue(1)
			tc:RegisterEffect(e1)
			local e3=e1:Clone()
			e3:SetCode(EFFECT_CANNOT_BE_FUSION_MATERIAL)
			e3:SetValue(s.fuslimit)
			tc:RegisterEffect(e3)
			local e4=e1:Clone()
			e4:SetCode(EFFECT_CANNOT_BE_SYNCHRO_MATERIAL)
			tc:RegisterEffect(e4)
			local e5=e1:Clone()
			e5:SetCode(EFFECT_CANNOT_BE_XYZ_MATERIAL)
			e5:SetDescription(aux.Stringid(id,1))
			e5:SetProperty(EFFECT_FLAG_SINGLE_RANGE+EFFECT_FLAG_CLIENT_HINT)
			tc:RegisterEffect(e5)
		end
	end
end
function s.fuslimit(e,c,sumtype)
	return sumtype==SUMMON_TYPE_FUSION
end