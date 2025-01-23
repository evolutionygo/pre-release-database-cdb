--ボンバー・ブレイズ
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_QUICK_O)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCountLimit(1,EFFECT_COUNT_CODE_CHAIN)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e1:SetCondition(s.descon1)
	e1:SetCost(s.descost)
	e1:SetTarget(s.destg1)
	e1:SetOperation(s.desop1)
	c:RegisterEffect(e1)
	local e2=e1:Clone()
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCondition(aux.TRUE)
	e2:SetTarget(s.destg2)
	e2:SetOperation(s.desop2)
	c:RegisterEffect(e2)
end
function s.descon1(e,tp,eg,ep,ev,re,r,rp)
	local g=Duel.GetMatchingGroup(aux.AND(Card.IsFaceup,Card.IsLevelAbove),tp,LOCATION_MZONE,0,nil,1)
	local res=true
	for i=1,6 do
		if not g:IsExists(Card.IsLevel,1,nil,i) then
			res=false
		end
	end
	return res
end
function s.descost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.CheckLPCost(tp,600) end
	Duel.PayLPCost(tp,600)
end
function s.cfilter1(c,tp)
	return c:IsFaceup() and c:IsLevelAbove(1)
		and Duel.IsExistingMatchingCard(s.desfilter1,tp,0,LOCATION_MZONE,c,c:GetLevel())
end
function s.desfilter1(c,lv)
	return c:IsFaceup() and (c:IsLevel(lv) or c:IsRank(lv) or c:IsLink(lv))
end
function s.destg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter1,tp,0,LOCATION_MZONE,1,nil,tp) end
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,LOCATION_MZONE)
end
function s.desop1(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter1,tp,0,LOCATION_MZONE,1,1,nil,tp)
	if g:GetCount()>0 then
		local sg=Duel.GetMatchingGroup(s.desfilter1,tp,0,LOCATION_MZONE,g,g:GetFirst():GetLevel())
		Duel.HintSelection(g)
		Duel.Destroy(sg,POS_FACEUP,REASON_EFFECT)
	end
end
function s.cfilter2(c,tp)
	local g=c:GetColumnGroup()
	return c:IsFaceup() and c:IsLevelAbove(1)
		and Duel.IsExistingMatchingCard(s.desfilter2,tp,0,LOCATION_MZONE,c,tp,c:GetLevel(),g)
end
function s.desfilter2(c,tp,lv,g)
	return c:IsFaceup() and c:IsControler(1-tp) and (c:IsLevel(lv) or c:IsRank(lv) or c:IsLink(lv)) and g:IsContains(c)
end
function s.destg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter2,tp,LOCATION_MZONE,0,1,nil,tp) end
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,LOCATION_MZONE)
end
function s.desop2(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter2,tp,LOCATION_MZONE,0,1,1,nil,tp)
	if g:GetCount()>0 then
		local tc=g:GetFirst()
		local sg=Duel.GetMatchingGroup(s.desfilter2,tp,0,LOCATION_MZONE,tc,tp,tc:GetLevel(),tc:GetColumnGroup())
		Duel.HintSelection(g)
		Duel.Destroy(sg,POS_FACEUP,REASON_EFFECT)
	end
end