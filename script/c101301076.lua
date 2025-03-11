--帝王の極致
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--trigger
	local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_DESTROY+CATEGORY_REMOVE+CATEGORY_TODECK+CATEGORY_HANDES)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	e2:SetRange(LOCATION_SZONE)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCost(s.cost)
	e2:SetTarget(s.target)
	e2:SetOperation(s.operation)
	c:RegisterEffect(e2)
end
function s.cfilter(c)
	return c:IsSummonType(SUMMON_TYPE_ADVANCE)
end
function s.costfilter(c)
	return c:IsSetCard(0xbe) and c:IsType(TYPE_SPELL+TYPE_TRAP) and c:IsAbleToRemoveAsCost()
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_GRAVE,0,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.costfilter,tp,LOCATION_GRAVE,0,1,1,nil)
	Duel.Remove(g,POS_FACEUP,REASON_COST)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local b1=Duel.GetFlagEffect(tp,id+1)==0 and Duel.GetFieldGroupCount(tp,LOCATION_MZONE,LOCATION_MZONE)>0
	local b2=Duel.GetFlagEffect(tp,id+2)==0 and Duel.GetFieldGroupCount(tp,LOCATION_SZONE,LOCATION_SZONE)>0
	local b3=Duel.GetFlagEffect(tp,id+3)==0 and Duel.IsExistingMatchingCard(Card.IsDiscardable,tp,0,LOCATION_HAND,1,nil,REASON_EFFECT)
	local b4=Duel.GetFlagEffect(tp,id+4)==0 and Duel.IsExistingMatchingCard(Card.IsFacedown,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
	local b5=Duel.GetFlagEffect(tp,id+5)==0 and Duel.IsExistingMatchingCard(Card.IsAbleToDeck,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
	local b6=Duel.GetFlagEffect(tp,id+6)==0 and Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_MZONE,0,1,nil) and
		(b1 or b2 or b3 or b4 or b5 or b6) end
	local op=0
	if b1 and b2 and b3 and b4 and b5 and b6 then
		local page=0
		while op==0 or op==7 do
			if page==0 then
				op=aux.SelectFromOptions(tp,
				{b1,aux.Stringid(id,1),1},
				{b2,aux.Stringid(id,2),2},
				{b3,aux.Stringid(id,3),3},
				{true,1345},7)
			else
				op=aux.SelectFromOptions(tp,
				{b4,aux.Stringid(id,4),4},
				{b5,aux.Stringid(id,5),5},
				{b6,aux.Stringid(id,6),6},
				{true,1360},7)
			end
			if op==7 then
				page=1-page
			end
		end
	else
		op=aux.SelectFromOptions(tp,
			{b1,aux.Stringid(id,1),1},
			{b2,aux.Stringid(id,2),2},
			{b3,aux.Stringid(id,3),3},
			{b4,aux.Stringid(id,4),4},
			{b5,aux.Stringid(id,5),5},
			{b6,aux.Stringid(id,6),6}
		)
	end
	e:SetLabel(op)
	Duel.RegisterFlagEffect(tp,id+op,RESET_PHASE+PHASE_END,0,1)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	local opt=e:GetLabel()
	if not opt then return end
	if opt==1 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
		if g:GetCount()>0 then
			Duel.HintSelection(g)
			Duel.Destroy(g,REASON_EFFECT)
		end
	elseif opt==2 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,LOCATION_SZONE,LOCATION_SZONE,1,2,nil)
		if g:GetCount()>0 then
			Duel.HintSelection(g)
			Duel.Destroy(g,REASON_EFFECT)
		end
	elseif opt==3 then
		local g=Duel.GetMatchingGroup(Card.IsDiscardable,tp,0,LOCATION_HAND,nil,REASON_EFFECT):RandomSelect(tp,1)
		Duel.HintSelection(g)
		Duel.SendtoGrave(g,REASON_EFFECT+REASON_DISCARD)
	elseif opt==4 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
		local g=Duel.SelectMatchingCard(tp,Card.IsFacedown,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)
		if g:GetCount()>0 then
			Duel.HintSelection(g)
			Duel.Destroy(g,REASON_EFFECT)
		end
	elseif opt==5 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
		local g=Duel.SelectMatchingCard(tp,Card.IsAbleToDeck,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)
		if g:GetCount()>0 then
			Duel.HintSelection(g)
			Duel.SendtoDeck(g,nil,SEQ_DECKTOP,REASON_EFFECT)
		end
	elseif opt==6 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemove,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)
		if g:GetCount()>0 then
			Duel.HintSelection(g)
			Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
		end
	end
end
