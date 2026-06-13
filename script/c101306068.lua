--宇宙的ハリケーン
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_TODECK)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.cfilter(c,tp)
	return c:IsLocation(LOCATION_HAND) and c:IsControler(tp)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
	local g=Duel.SelectMatchingCard(tp,Card.IsAbleToHand,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,2,nil)
	if g:GetCount()>0 and Duel.SendtoHand(g,nil,REASON_EFFECT)~=0 then
		local og=Duel.GetOperatedGroup()
		local sg1=Group.CreateGroup()
		local sg2=Group.CreateGroup()
		if og:IsExists(s.cfilter,1,nil,tp) then
			local ct=og:FilterCount(s.cfilter,nil,tp)
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
			sg1=Duel.GetFieldGroup(tp,LOCATION_HAND,0):Select(tp,ct,ct,nil)
			Duel.ShuffleHand(tp)
		end
		if og:IsExists(s.cfilter,1,nil,1-tp) then
			local ct=og:FilterCount(s.cfilter,nil,1-tp)
			Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_TODECK)
			sg2=Duel.GetFieldGroup(1-tp,LOCATION_HAND,0):Select(1-tp,ct,ct,nil)
			Duel.ShuffleHand(1-tp)
		end
		if sg1:GetCount()>0 then
			aux.PlaceCardsOnDeckBottom(tp,sg1)
		end
		if sg2:GetCount()>0 then
			aux.PlaceCardsOnDeckBottom(tp,sg2)
		end
	end
end