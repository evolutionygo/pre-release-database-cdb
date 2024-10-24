--万物の始源-「水」
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id)
	e1:SetTarget(s.target(nil))
	e1:SetOperation(s.activate(nil))
	c:RegisterEffect(e1)
	--destroy and spsummon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_TOHAND)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_GRAVE)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(aux.exccon)
	e2:SetCost(aux.bfgcost)
	e2:SetTarget(s.target(ATTRIBUTE_WATER))
	e2:SetOperation(s.activate(ATTRIBUTE_WATER))
	c:RegisterEffect(e2)
end
function s.spfilter(c,e,tp,att)
	if not att or not c:IsAttribute(att) then return false end
	return c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_DEFENSE,c:GetOwner())
		and Duel.IsExistingMatchingCard(s.desfilter,c:GetOwner(),LOCATION_MZONE,0,1,nil,c:GetOwner(),att)
end
function s.desfilter(c,tp,att)
	if att and not c:IsAttribute(att) then return false end
	return c:IsFaceup()
		and Duel.GetMZoneCount(tp,c)>0
end
function s.target(att)
	return function(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
			if chkc then return chkc:IsLocation(LOCATION_GRAVE) and s.spfilter(chkc,e,tp,att) end
			if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
				and Duel.IsExistingTarget(s.spfilter,tp,LOCATION_GRAVE,LOCATION_GRAVE,1,nil,e,tp,att) end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
			local g=Duel.SelectTarget(tp,s.spfilter,tp,LOCATION_GRAVE,LOCATION_GRAVE,1,1,nil,e,tp,att)
			Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
		end
end
function s.activate(att)
	return function(e,tp,eg,ep,ev,re,r,rp)
			local tc=Duel.GetFirstTarget()
			if not tc:IsRelateToEffect(e) then return end
			local sp=tc:GetOwner()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
			local g=Duel.SelectMatchingCard(tp,s.desfilter,sp,LOCATION_MZONE,0,1,1,nil,sp,att)
			if g and Duel.Destroy(g,REASON_EFFECT)~=0
				and aux.NecroValleyFilter()(tc) then
				Duel.SpecialSummon(tc,0,tp,sp,false,false,POS_FACEUP_DEFENSE)
			end
		end
end