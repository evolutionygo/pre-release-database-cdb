--废品插座龙
local s,id=GetID()
function c100200238.initial_effect(c)
	--special summon
    local e1=Effect.CreateEffect(c)
    e1:SetDescription(aux.Stringid(id,0))
    e1:SetType(EFFECT_TYPE_FIELD)
    e1:SetCode(EFFECT_SPSUMMON_PROC)
    e1:SetProperty(EFFECT_FLAG_UNCOPYABLE)
    e1:SetRange(LOCATION_HAND)
    e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
    e1:SetCondition(s.spcon)
    e1:SetValue(SUMMON_VALUE_SELF)
    c:RegisterEffect(e1)
    --atk up
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_ATKCHANGE)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_ATTACK_ANNOUNCE)
	e2:SetRange(LOCATION_GRAVE)
	e2:SetCountLimit(1,id+100)
	e2:SetCondition(s.atkcon)
	e2:SetCost(aux.bfgcost)
	e2:SetOperation(s.atkop)
	c:RegisterEffect(e2)
end
--spsummon
function s.spfilter(c)
	return c:IsFaceup() and c:IsType(TYPE_SYNCHRO)
end
function s.spcon(e,c)
	if c==nil then return true end
	return Duel.GetLocationCount(c:GetControler(),LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,c:GetControler(),LOCATION_MZONE,0,1,nil)
end
--atk up
function s.atkcon(e,tp,eg,ep,ev,re,r,rp)
	local ac=Duel.GetAttacker()
	if not ac:IsControler(tp) then return false end
	return ac and ac:IsControler(tp) and ac:IsFaceup() and ac:IsType(TYPE_SYNCHRO) end
function s.atkfilter(c)
	return c:IsFaceup() and c:IsRelateToBattle()
end
function s.atkop(e,tp,eg,ep,ev,re,r,rp)
	local ac=e:GetLabelObject()
	if ac:IsRelateToBattle() and ac:IsFaceup() and ac:IsControler(tp) then
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetValue(800)
		e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
		ac:RegisterEffect(e1)
	end
end
