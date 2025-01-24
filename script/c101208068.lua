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
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local rg=Duel.GetDecktopGroup(1-tp,7)
	local ct1=Duel.GetMatchingGroupCount(Card.IsAbleToRemove,tp,0,LOCATION_EXTRA,nil,1-tp,POS_FACEDOWN,REASON_RULE)
	local ct2=rg:FilterCount(Card.IsAbleToRemove,nil,1-tp,POS_FACEDOWN,REASON_RULE)
	if chk==0 then return ct1+ct2>=7 end
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,7,0,LOCATION_EXTRA+LOCATION_DECK)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp,chk)
	local dg=Duel.GetDecktopGroup(1-tp,7)
	local edg=Duel.GetMatchingGroup(Card.IsAbleToRemove,tp,0,LOCATION_EXTRA,nil,1-tp,POS_FACEDOWN,REASON_RULE)
	local ct1=dg:FilterCount(Card.IsAbleToRemove,nil,1-tp,POS_FACEDOWN,REASON_RULE)
	local ct2=edg:GetCount()
	if ct1+ct2<7 then return end
	Duel.Hint(HINT_SELECTMSG,tp,aux.Stringid(id,1))
	local sg=edg:SelectSubGroup(1-tp,aux.TRUE,ct1==7,7-ct1,ct2,nil)
	local ct=sg:GetCount()
	if ct>0 then
		Duel.Remove(sg,POS_FACEDOWN,REASON_RULE,1-tp)
	end
	if ct<7 then
		local rsg=Duel.GetDecktopGroup(1-tp,7-ct)
		Duel.DisableShuffleCheck()
		Duel.Remove(rsg,POS_FACEDOWN,REASON_RULE,1-tp)
	end
end
