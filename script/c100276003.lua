--四次元竜クレイデス
local s,id,o=GetID()
function s.initial_effect(c)
	aux.AddSynchroProcedure(c,nil,aux.NonTuner(nil),1)
	c:EnableReviveLimit()
	--activate
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_REMOVE+CATEGORY_DECKDES)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCost(s.cost)
	e1:SetTarget(s.target)
	e1:SetOperation(s.operation)
	c:RegisterEffect(e1)
	--atk
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_ATKCHANGE)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_ATTACK_ANNOUNCE)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCondition(s.atkcon)
	e2:SetTarget(s.atktg)
	e2:SetOperation(s.atkop)
	c:RegisterEffect(e2)
	if not s.global_check then
		s.global_check=true
		local ge1=Effect.CreateEffect(c)
		ge1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ge1:SetCode(EVENT_ATTACK_ANNOUNCE)
		ge1:SetOperation(s.checkop)
		Duel.RegisterEffect(ge1,0)
	end
end
function s.checkop(e,tp,eg,ep,ev,re,r,rp)
	Duel.RegisterFlagEffect(tp,id,RESET_PHASE+PHASE_END,0,1)
	Duel.RegisterFlagEffect(1-tp,id,RESET_PHASE+PHASE_END,0,1)
end
function s.flagok(e,tp,code)
	return not e:IsCostChecked() or Duel.GetFlagEffect(tp,code)==0
end
function s.payremove(tp,ct,filter,...)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,filter,tp,LOCATION_HAND,0,ct,ct,nil,...)
	Duel.Remove(g,POS_FACEUP,REASON_COST)
end
function s.spfilter(c,e,tp)
	return c:IsLevelBelow(4) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spcostfilter(c,e,tp)
	return c:IsAbleToRemoveAsCost()
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_HAND,0,1,c,e,tp)
end
function s.spchk(e,tp)
	return s.flagok(e,tp,id+o)
		and Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
end
function s.spcostchk(e,tp)
	return s.spchk(e,tp)
		and Duel.IsExistingMatchingCard(s.spcostfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
end
function s.rmfilter(c)
	return c:IsFaceup() and c:IsLevelBelow(4) and c:IsAbleToRemove()
end
function s.rmchk(e,tp)
	return s.flagok(e,tp,id+o*2)
		and Duel.IsExistingMatchingCard(s.rmfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
end
function s.rmcostchk(e,tp)
	return s.rmchk(e,tp)
		and Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_HAND,0,2,nil)
end
function s.grfilter(c)
	return c:IsAttribute(ATTRIBUTE_DARK) and c:IsType(TYPE_MONSTER) and c:IsAbleToGrave()
end
function s.grchk(e,tp)
	return s.flagok(e,tp,id+o*3)
		and Duel.IsExistingMatchingCard(s.grfilter,tp,LOCATION_DECK,0,1,nil)
end
function s.grcostchk(e,tp)
	return s.grchk(e,tp)
		and Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_HAND,0,3,nil)
end
function s.drchk(e,tp)
	return s.flagok(e,tp,id+o*4)
end
function s.drcostchk(e,tp)
	return s.drchk(e,tp)
		and Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_HAND,0,4,nil)
end
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
	local b1=s.spcostchk(e,tp)
	local b2=s.rmcostchk(e,tp)
	local b3=s.grcostchk(e,tp)
	local b4=s.drcostchk(e,tp)
	if chk==0 then return b1 or b2 or b3 or b4 end
	local op=aux.SelectFromOptions(tp,
		{b1,aux.Stringid(id,2),1},
		{b2,aux.Stringid(id,3),2},
		{b3,aux.Stringid(id,4),3},
		{b4,aux.Stringid(id,5),4})
	if not op then return end
	e:SetLabel(op)
	if op==1 then
		s.payremove(tp,1,s.spcostfilter,e,tp)
	else
		s.payremove(tp,op,Card.IsAbleToRemoveAsCost)
	end
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local b1=s.spchk(e,tp)
	local b2=s.rmchk(e,tp)
	local b3=s.grchk(e,tp)
	local b4=s.drchk(e,tp)
	if chk==0 then return b1 or b2 or b3 or b4 end
	local op=e:GetLabel()
	if not e:IsCostChecked() then
		op=aux.SelectFromOptions(tp,
			{b1,aux.Stringid(id,2),1},
			{b2,aux.Stringid(id,3),2},
			{b3,aux.Stringid(id,4),3},
			{b4,aux.Stringid(id,5),4})
		if not op then return end
		e:SetLabel(op)
	end
	if op==1 then
		e:SetCategory(CATEGORY_SPECIAL_SUMMON)
		if e:IsCostChecked() then
			Duel.RegisterFlagEffect(tp,id+o,RESET_PHASE+PHASE_END,0,1)
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND)
	elseif op==2 then
		e:SetCategory(CATEGORY_REMOVE)
		if e:IsCostChecked() then
			Duel.RegisterFlagEffect(tp,id+o*2,RESET_PHASE+PHASE_END,0,1)
		end
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,PLAYER_ALL,LOCATION_MZONE)
	elseif op==3 then
		e:SetCategory(CATEGORY_DECKDES)
		if e:IsCostChecked() then
			Duel.RegisterFlagEffect(tp,id+o*3,RESET_PHASE+PHASE_END,0,1)
		end
		Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)
	elseif op==4 then
		e:SetCategory(0)
		if e:IsCostChecked() then
			Duel.RegisterFlagEffect(tp,id+o*4,RESET_PHASE+PHASE_END,0,1)
		end
	end
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
	local op=e:GetLabel()
	if op==1 then
		s.spop(e,tp,eg,ep,ev,re,r,rp)
	elseif op==2 then
		s.rmop(e,tp,eg,ep,ev,re,r,rp)
	elseif op==3 then
		s.grop(e,tp,eg,ep,ev,re,r,rp)
	elseif op==4 then
		s.drawop(e,tp,eg,ep,ev,re,r,rp)
	end
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,s.spfilter,tp,LOCATION_HAND,0,1,1,nil,e,tp)
	if #g>0 then
		Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
	end
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.rmfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
	if #g>0 then
		Duel.HintSelection(g)
		Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
	end
end
function s.grop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.grfilter,tp,LOCATION_DECK,0,1,1,nil)
	if #g>0 then
		Duel.SendtoGrave(g,REASON_EFFECT)
	end
end
function s.drawop(e,tp,eg,ep,ev,re,r,rp)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetCode(EFFECT_DRAW_COUNT)
	e1:SetTargetRange(1,0)
	e1:SetReset(RESET_PHASE+PHASE_DRAW+RESET_SELF_TURN)
	e1:SetValue(5)
	Duel.RegisterEffect(e1,tp)
end
function s.atkcon(e,tp,eg,ep,ev,re,r,rp)
	--the flag counts the declarations before this one
	return Duel.GetFlagEffect(tp,id)==3
end
function s.atktg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return not e:GetHandler():IsAttack(4000) end
end
function s.atkop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsFaceup() and c:IsRelateToChain() and not c:IsAttack(4000) then
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_SET_ATTACK_FINAL)
		e1:SetValue(4000)
		e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_DISABLE)
		c:RegisterEffect(e1)
	end
end
