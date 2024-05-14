--エクシーズ・ポセイドン・スプラッシュ
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id)
	e1:SetCondition(s.descon)
	e1:SetTarget(s.destg)
	e1:SetOperation(s.desop)
	c:RegisterEffect(e1)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,1))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_QUICK_O)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetRange(LOCATION_GRAVE)
	e1:SetCountLimit(1,id)
	e1:SetCost(s.spcost)
	e1:SetTarget(s.sptg)
	e1:SetOperation(s.spop)
	c:RegisterEffect(e1)
end
function s.mfilter(c)
	return c:IsType(TYPE_XYZ)
end
function s.ffilter(c)
	return c:IsType(TYPE_XYZ) and c:GetOverlayGroup():IsExists(s.mfilter,1,nil)
end
function s.descon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsExistingMatchingCard(s.ffilter,tp,LOCATION_MZONE,0,1,nil)
end
function s.desfilter(c,attr)
	return c:IsFaceup() and c:IsAttribute(attr) and not c:GetEquipGroup():Filter(Card.IsType,nil,TYPE_SPELL)
end
function s.filter(c)
	return c:IsFaceup() and not c:GetEquipGroup():Filter(Card.IsType,nil,TYPE_SPELL)
end
function s.destg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
	local g=Duel.GetMatchingGroup(s.filter,tp,LOCATION_MZONE,LOCATION_MZONE,nil)
	local attr=0
	for tc in aux.Next(g) do
		attr=attr|tc:GetAttribute()
	end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTRIBUTE)
	local at=Duel.AnnounceAttribute(tp,1,attr)
	e:SetLabel(at)
	local dg=Duel.GetMatchingGroup(s.desfilter,tp,LOCATION_MZONE,LOCATION_MZONE,nil,at)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,dg,dg:GetCount(),0,0)
end
function s.desop(e,tp,eg,ep,ev,re,r,rp)
	local attr=e:GetLabel()
	local dg=Duel.GetMatchingGroup(s.desfilter,tp,LOCATION_MZONE,LOCATION_MZONE,nil,attr)
	if dg:GetCount()>0 then
		Duel.Destroy(dg,REASON_EFFECT)
	end
end
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return aux.bfgcost(e,tp,eg,ep,ev,re,r,rp,chk) and Duel.CheckRemoveOverlayCard(tp,1,0,1,REASON_COST) end
	aux.bfgcost(e,tp,eg,ep,ev,re,r,rp,chk)
	Duel.RemoveOverlayCard(tp,1,0,1,1,REASON_COST)
end
function s.filter(c,e,tp)
	return c:IsRace(RACE_FISH+RACE_AQUA+RACE_SEASERPENT) and (c:IsCanBeSpecialSummoned(e,0,tp,false,false) or c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP,1-tp))
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return (Duel.GetLocationCount(tp,LOCATION_MZONE)>0 or Duel.GetLocationCount(1-tp,LOCATION_MZONE)>0)
		and Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_GRAVE,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end
function s.sptp(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 and Duel.GetLocationCount(1-tp,LOCATION_MZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.filter),tp,LOCATION_GRAVE,0,1,1,nil,e,tp)
	local tc=g:GetFirst()
	if tc then
		if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and tc:IsCanBeSpecialSummoned(e,0,tp,false,false) and (not (Duel.GetLocationCount(1-tp,LOCATION_MZONE)>0 and tc:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP,1-tp)) or Duel.SelectYesNo(tp,aux.Stringid(id,2))) then
			Duel.SpecialSummon(tc,0,tp,1-tp,false,false,POS_FACEUP)
		else
			Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
		end
	end
end