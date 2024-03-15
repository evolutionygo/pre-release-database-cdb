--トリックスター・コルチカ
local s,id,o=GetID()
function s.initial_effect(c)
	c:SetSPSummonOnce(id)
	aux.AddLinkProcedure(c,s.mat,1,1)
	c:EnableReviveLimit()
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DAMAGE)
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e1:SetCode(EVENT_BATTLE_DESTROYING)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetRange(LOCATION_GRAVE)
	e1:SetCountLimit(1,id)
	e1:SetCondition(s.damcon)
	e1:SetCost(aux.bfgcost)
	e1:SetTarget(s.damtg)
	e1:SetOperation(s.damop)
	c:RegisterEffect(e1)
end
function s.mat(c)
	return c:IsLinkSetCard(0xfb) and not c:IsLinkType(TYPE_LINK)
end
function s.damcon(e,tp,eg,ep,ev,re,r,rp)
	local rc=eg:GetFirst()
	local bc=rc:GetBattleTarget()
	return rc:IsRelateToBattle() and rc:IsStatus(STATUS_OPPO_BATTLE) and rc:IsSetCard(0xfb)
		and bc:IsType(TYPE_MONSTER) and bc:IsLocation(LOCATION_GRAVE+LOCATION_REMOVED) and bc:IsFaceupEx()
end
function s.damtg(e,tp,eg,ep,ev,re,r,rp,chk)
	local rc=eg:GetFirst()
	local bc=rc:GetBattleTarget()
	if chkc then return false end
	if chk==0 then return not bc:IsAttack(0) and bc:IsCanBeEffectTarget(e) end
	Duel.SetTargetCard(bc)
	local dam=bc:GetAttack()
	Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,dam)
end
function s.damop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToEffect(e) then
		Duel.Damage(1-tp,tc:GetAttack(),REASON_EFFECT)
	end
end