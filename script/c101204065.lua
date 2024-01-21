--ヴァルモニカ・インヴィターレ
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_TOEXTRA+CATEGORY_SEARCH+CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.spfilter(c,e,tp)
	return c:IsSetCard(0x1a3) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.thfilter(c,tp)
	return c:IsSetCard(0x1a3) and c:IsType(TYPE_PENDULUM)
		and (c:IsAbleToExtra() or c:IsAbleToHand())
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local b1=Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_DECK,0,1,nil,e,tp)
	local b2=Duel.IsExistingMatchingCard(s.thfilter1,tp,LOCATION_DECK,0,1,nil,tp)
		and Duel.IsExistingMatchingCard(aux.NOT(Card.IsType),tp,LOCATION_MZONE,0,1,nil,TYPE_PENDULUM)
	if chk==0 then return b1 or b2 end
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local g=Duel.GetMatchingGroup(s.thfilter,tp,LOCATION_DECK,0,nil)
	local b1=Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_DECK,0,1,nil,e,tp)
	local b2=g:CheckSubGroup(aux.dncheck,2,2)
		and Duel.IsExistingMatchingCard(aux.NOT(Card.IsType),tp,LOCATION_MZONE,0,1,nil,TYPE_PENDULUM)
	local op=0
	if b1 and b2 then
		op=Duel.SelectOption(tp,aux.Stringid(id,1),aux.Stringid(id,2))+1
	elseif b1 then
		op=Duel.SelectOption(tp,aux.Stringid(id,1))+1
	elseif b2 then
		op=Duel.SelectOption(tp,aux.Stringid(id,2))+2
	end
	if op==1 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local sg=Duel.SelectMatchingCard(tp,s.filter,tp,LOCATION_DECK,0,1,1,nil,e,tp)
		if sg:GetCount()>0 then
			Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP)
		end
	elseif op==2 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		sg=g:SelectSubGroup(tp,aux.dncheck,false,2,2)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local tc=sg:FilterSelect(tp,Card.IsAbleToHand,1,1,nil):GetFirst()
		Duel.SendtoHand(tc,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,tc)
		sg:RemoveCard(tc)
		Duel.SendtoExtraP(sg,nil,REASON_EFFECT)
	end
end
