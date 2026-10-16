--决斗者之力
local s,id,o=GetID()
function s.initial_effect(c)
	--activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOGRAVE|CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
	if not s.global_check then
		s.global_check=true
		s[0]=0x0
		s[1]=0x0
		local ge1=Effect.CreateEffect(c)
		ge1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ge1:SetCode(EVENT_CHAINING)
		ge1:SetOperation(s.checkop)
		Duel.RegisterEffect(ge1,0)
		local ge2=Effect.CreateEffect(c)
		ge2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ge2:SetCode(EVENT_PHASE_START+PHASE_DRAW)
		ge2:SetOperation(s.clearop)
		Duel.RegisterEffect(ge2,0)
	end
end
function s.checkop(e,tp,eg,ep,ev,re,r,rp)
	if re:IsType(TYPE_MONSTER) then
		local loc,attr=Duel.GetChainInfo(i,CHAININFO_TRIGGERING_LOCATION,CHAININFO_TRIGGERING_ATTRIBUTE)
		if (loc&LOCATION_MZONE+LOCATION_GRAVE)~=0 and s[rp]&attr==0 then
			s[rp]=bit.bor(s[rp],attr)
		end
	end
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsAbleToRemove() end
	local b1=Duel.IsExistingTarget(Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
	local b2=Duel.IsPlayerCanDraw(tp,2)
	local b3=Duel.IsExistingMatchingCard(aux.NegateAnyFilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,e:GetHandler())
	if chk==0 then return b1 or b2 end
	local op=aux.SelectFromOptions(tp,
			{b1,aux.Stringid(id,1),2},
			{b2,aux.Stringid(id,2),3},
			{b2,aux.Stringid(id,3),4})
	local att=0x0
	for i=1,op do
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTRIBUTE)
		local rc=Duel.AnnounceAttribute(tp,1,0x7f&att)
		att=bit.bor(att,rc)
	end
	e:SetLabel(op,att)
	if op==2 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_TOGRAVE+CATEGORY_REMOVE)
			e:SetProperty(EFFECT_FLAG_CARD_TARGET)
		end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local g=Duel.SelectTarget(tp,Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
	elseif op==3 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_DRAW+CATEGORY_REMOVE+CATEGORY_HANDES_SELF)
			e:SetProperty(0)
		end
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)
		Duel.SetOperationInfo(0,CATEGORY_HANDES_SELF,nil,0,tp,1)
	elseif op==3 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_DISABLE+CATEGORY_HANDES_SELF)
			e:SetProperty(0)
		end
		local g=Duel.GetMatchingGroup(aux.NegateAnyFilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,e:GetHandler())
		Duel.SetOperationInfo(0,CATEGORY_DISABLE,g,2,0,0)
	end
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local op,att=e:GetLabel()
	if op==2 then
		local tc=Duel.GetFirstTarget()
		if tc:IsRelateToChain() then
			Duel.Destroy(tc,REASON_EFFECT)
		end
	elseif op==3 then
		if Duel.Draw(tp,2,REASON_EFFECT)==2 then
			Duel.ShuffleHand(tp)
			Duel.BreakEffect()
			Duel.DiscardHand(tp,nil,1,1,REASON_EFFECT+REASON_DISCARD)
		end
	elseif op==4 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISABLE)
		local g=Duel.SelectMatchingCard(tp,aux.NegateAnyFilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,2,2,aux.ExceptThisCard(e))
		for tc in aux.Next(g) do
			Duel.NegateRelatedChain(tc,RESET_TURN_SET)
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e1:SetCode(EFFECT_DISABLE)
			e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
			tc:RegisterEffect(e1)
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e2:SetCode(EFFECT_DISABLE_EFFECT)
			e2:SetValue(RESET_TURN_SET)
			e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
			tc:RegisterEffect(e2)
			if tc:IsType(TYPE_TRAPMONSTER) then
				local e3=Effect.CreateEffect(c)
				e3:SetType(EFFECT_TYPE_SINGLE)
				e3:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
				e3:SetCode(EFFECT_DISABLE_TRAPMONSTER)
				e3:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
				tc:RegisterEffect(e3)
			end
		end
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e1:SetCode(EVENT_PHASE+PHASE_END)
	e1:SetCountLimit(1)
	e1:SetOperation(s.tgop)
	e1:SetLabel(att)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.tgop(e,tp,eg,ep,ev,re,r,rp)
	if s[tp]&e:GetLabel()~=e:GetLabel() then
		local g=Duel.GetMatchingGroup(Card.IsAbleToGrave,tp,LOCATION_ONFIELD,0,1,nil)
		Duel.SendtoGrave(g,REASON_EFFECT)
	end
end