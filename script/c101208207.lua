--繋がり－Ai－
local s,id,o=GetID()
function s.initial_effect(c)
	--activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TODECK+CATEGORY_SEARCH+CATEGORY_SPECIAL_SUMMON+CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetCost(s.cost)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	e:SetLabel(1)
	if chk==0 then return true end
end
function s.cfilter(c,res,att)
	if res then
		if c:IsLevelAbove(5) or not c:IsRace(RACE_CYBERSE) then return false end
	else
		if not c:IsSetCard(0x135) then return false end
	end
	return not c:IsAttribute(att) and c:IsAbleToHand()
end
function s.cfilter(c,e,tp)
	return c:IsRace(RACE_CYBERSE) and not c:IsPublic()
		and (c:IsAttribute(ATTRIBUTE_DARK)
		and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
		and Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil,true,ATTRIBUTE_DARK)
		or not c:IsAttribute(ATTRIBUTE_DARK) and c:IsAbleToDeck()
		and Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil,false,c:GetAttribute()))
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then
		if e:GetLabel()==0 then return false end
		e:SetLabel(0)
		return Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
	end
	e:SetLabel(0)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONFIRM)
	local g=Duel.SelectMatchingCard(tp,s.cfilter,tp,LOCATION_HAND,0,1,1,nil,e,tp)
	Duel.ConfirmCards(1-tp,g)
	Duel.ShuffleHand(tp)
	Duel.SetTargetCard(g)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local tc=Duel.GetFirstTarget()
	if not tc:IsRelateToEffect(e) then return false end
	if tc:IsAttribute(ATTRIBUTE_DARK) then
		if Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)~=0
			and Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil,true,ATTRIBUTE_DARK) then
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
			local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil,true,ATTRIBUTE_DARK)
			if g:GetCount()>0 then
				Duel.BreakEffect()
				Duel.SendtoHand(g,nil,REASON_EFFECT)
				Duel.ConfirmCards(1-tp,g)
			end
		end
	else
		if Duel.SendtoDeck(tc,nil,SEQ_DECKBOTTOM,REASON_EFFECT)~=0 and tc:IsLocation(LOCATION_DECK)
			and Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil,false,c:GetAttribute()) then
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
			local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil,false,c:GetAttribute())
			if g:GetCount()>0 then
				Duel.SendtoHand(g,nil,REASON_EFFECT)
				Duel.ConfirmCards(1-tp,g)
			end
		end
	end
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetReset(RESET_PHASE+PHASE_END)
	e1:SetTarget(s.splimit)
	Duel.RegisterEffect(e1,tp)
end
function s.splimit(e,c)
	return not c:IsRace(RACE_CYBERSE)
end