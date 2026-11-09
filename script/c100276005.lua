--千手遊び
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=2
		and Duel.GetFieldGroupCount(tp,0,LOCATION_DECK)>=2 end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,PLAYER_ALL,LOCATION_DECK)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local p1=Duel.GetTurnPlayer()
	local p2=1-p1
	if Duel.GetFieldGroupCount(p1,LOCATION_DECK,0)<2 or Duel.GetFieldGroupCount(p2,LOCATION_DECK,0)<2 then return end
	s.placetop(p1)
	s.placetop(p2)
	Duel.BreakEffect()
	Duel.Hint(HINT_SELECTMSG,p1,aux.Stringid(id,1))
	local n1=Duel.AnnounceNumber(p1,0,1,2,3,4)
	Duel.Hint(HINT_SELECTMSG,p2,aux.Stringid(id,1))
	local n2=Duel.AnnounceNumber(p2,0,1,2,3,4)
	Duel.ConfirmDecktop(p1,2)
	Duel.ConfirmDecktop(p2,2)
	local g1=Duel.GetDecktopGroup(p1,2)
	local g2=Duel.GetDecktopGroup(p2,2)
	local ct=g1:FilterCount(Card.IsType,nil,TYPE_MONSTER)+g2:FilterCount(Card.IsType,nil,TYPE_MONSTER)
	Duel.DisableShuffleCheck()
	s.resolve(p1,g1,n1==ct)
	s.resolve(p2,g2,n2==ct)
end
function s.placetop(p)
	Duel.Hint(HINT_SELECTMSG,p,HINTMSG_SELECT)
	local g=Duel.SelectMatchingCard(p,aux.TRUE,p,LOCATION_DECK,0,2,2,nil)
	Duel.ShuffleDeck(p)
	for tc in aux.Next(g) do
		Duel.MoveSequence(tc,SEQ_DECKTOP)
	end
	Duel.SortDecktop(p,p,2)
end
function s.resolve(p,g,win)
	if win then
		Duel.Hint(HINT_SELECTMSG,p,HINTMSG_ATOHAND)
		local sg=g:Select(p,1,1,nil)
		if sg:GetFirst():IsAbleToHand() then
			Duel.SendtoHand(sg,nil,REASON_EFFECT)
			Duel.ShuffleHand(p)
		else
			Duel.SendtoGrave(sg,REASON_RULE)
		end
		g:Sub(sg)
		Duel.MoveSequence(g:GetFirst(),SEQ_DECKBOTTOM)
	else
		Duel.SortDecktop(p,p,2)
		for i=1,2 do
			local mg=Duel.GetDecktopGroup(p,1)
			Duel.MoveSequence(mg:GetFirst(),SEQ_DECKBOTTOM)
		end
	end
end
