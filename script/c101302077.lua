--星辰の刺毒
local s,id=GetID()
function s.initial_effect(c)
	--
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_REMOVE+CATEGORY_TODECK+CATEGORY_DRAW)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.fselect(g)
	return g:FilterCount(Card.IsType,TYPE_SPELL+TYPE_TRAP)<=1 and g:FilterCount(Card.IsType,TYPE_MONSTER)<=1
end
function s.tdfilter(c)
	return c:IsSetCard(0x1c9) and not c:IsCode(id) and c:IsAbleToDeck()
		and c:IsFaceupEx()
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return false end
	if chk==0 then return Duel.GetMatchingGroupCount(Card.IsAbleToRemove,tp,0,LOCATION_GRAVE,nil)>0 end	
	local g=Duel.GetMatchingGroup(Card.IsAbleToRemove,tp,0,LOCATION_GRAVE,nil)
	local sg=g:SelectSubGroup(tp,s.fselect,false,1,2)
	Duel.SetTargetCard(sg)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,tg,#tg,0,0)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local rg=Duel.GetTargetsRelateToChain()
	if #rg==0 then return end
	local dg=Duel.GetMatchingGroup(s.tdfilter,tp,LOCATION_GRAVE+LOCATION_REMOVED,0,nil)
	if Duel.Remove(rg,POS_FACEUP,REASON_EFFECT)>0 and dg:GetCount()>0 and Duel.IsPlayerCanDraw(tp) and Duel.SelectYesNo(tp,aux.Stringid(id,1)) then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
		local sc=dg:Select(tp,1,1,nil)
		if Duel.SendtoDeck(sc,nil,SEQ_DECKBOTTOM,REASON_EFFECT)>0 then
			Duel.BreakEffect()
			Duel.Draw(tp,1,REASON_EFFECT)
		end
	end
end