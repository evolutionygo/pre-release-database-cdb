--夙めてはしろ 二人ではしろ
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_REMOVE)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCondition(s.condition)
	e1:SetCost(s.cost)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.condition(e,tp,eg,ep,ev,re,r,rp)
	return not Duel.IsExistingMatchingCard(aux.AND(Card.IsFaceupEx,Card.IsCode),tp,LOCATION_ONFIELD+LOCATION_GRAVE+LOCATION_REMOVED,0,1,nil,id)
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	local g=Duel.GetDecktopGroup(tp,7)
	if chk==0 then return g:FilterCount(Card.IsAbleToRemoveAsCost,nil,POS_FACEDOWN)==7 end
	Duel.DisableShuffleCheck()
	Duel.Remove(g,POS_FACEDOWN,REASON_COST)
end
function s.gcheck(g,tp)
	local ct=7-g:GetCount()
	if ct>0 then
		local g=Duel.GetDecktopGroup(1-tp,tc)
		if g:FilterCount(Card.IsAbleToRemoveAsCost,nil,POS_FACEDOWN)~=tc then
			return false
		end
	end
	return true
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local rg=Duel.GetDecktopGroup(1-tp,7)
	local g=Duel.GetMatchingGroup(Card.IsAbleToRemove,tp,0,LOCATION_EXTRA,nil,POS_FACEDOWN)
	if chk==0 then return g:CheckSubGroup(s.gcheck,1,7,tp) or rg:FilterCount(Card.IsAbleToRemove,nil,POS_FACEDOWN)==7 end
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,7,0,LOCATION_EXTRA+LOCATION_DECK)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp,chk)
	local rg=Duel.GetDecktopGroup(1-tp,7)
	local g=Duel.GetMatchingGroup(Card.IsAbleToRemove,tp,0,LOCATION_EXTRA,nil,POS_FACEDOWN)
	if not (g:CheckSubGroup(s.gcheck,1,7,tp) or rg:FilterCount(Card.IsAbleToRemove,nil,POS_FACEDOWN)==7) then return end
	Duel.Hint(HINT_SELECTMSG,tp,aux.Stringid(id,1))
	local sg=g:SelectSubGroup(1-tp,s.gcheck,true,1,7,tp)
	local ct=sg:GetCount()
	if ct>0 then
		Duel.Remove(sg,POS_FACEDOWN,REASON_EFFECT)
	end
	if ct<7 then
		local rsg=Duel.GetDecktopGroup(1-tp,7-ct)
		Duel.Remove(rsg,POS_FACEDOWN,REASON_EFFECT)
	end
end
