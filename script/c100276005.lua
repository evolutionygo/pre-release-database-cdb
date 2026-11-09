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
	--either player unable to choose 2 cards: the effect does not apply
	if Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)<2
		or Duel.GetFieldGroupCount(1-tp,LOCATION_DECK,0)<2 then return end
	for p in aux.TurnPlayers() do s.placetop(p) end
	Duel.BreakEffect()
	local num={}
	for p in aux.TurnPlayers() do num[p]=s.announce(p) end
	for p in aux.TurnPlayers() do Duel.ConfirmDecktop(p,2) end
	local g=Duel.GetDecktopGroup(tp,2)+Duel.GetDecktopGroup(1-tp,2)
	local ct=g:FilterCount(Card.IsType,nil,TYPE_MONSTER)
	Duel.DisableShuffleCheck()
	for p in aux.TurnPlayers() do s.resolve(p,Duel.GetDecktopGroup(p,2),num[p]==ct) end
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
function s.announce(p)
	Duel.Hint(HINT_SELECTMSG,p,HINGMSG_NUMBER)
	return Duel.AnnounceNumber(p,0,1,2,3,4)
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
	else
		Duel.SortDecktop(p,p,2)
	end
	for i=1,#g do
		local mg=Duel.GetDecktopGroup(p,1)
		Duel.MoveSequence(mg:GetFirst(),SEQ_DECKBOTTOM)
	end
end
