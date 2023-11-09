--霸王龙 扎克-同调宇宙
function c100212005.initial_effect(c)
	aux.AddCodeList(c,13331639)
	aux.EnableChangeCode(c,13331639,LOCATION_MZONE)
	aux.EnablePendulumAttribute(c)
	c:EnableReviveLimit()
	aux.AddSynchroProcedure(c,nil,aux.NonTuner(c100212005.matfilter),1)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(100212005,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_PZONE)
	e1:SetCountLimit(1,100212005)
	e1:SetCost(c100212005.pspcost)
	e1:SetTarget(c100212005.psptg)
	e1:SetOperation(c100212005.pspop)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(100212005,1))
	e2:SetCategory(CATEGORY_POSITION)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_BATTLED)
	e2:SetCondition(c100212005.spcon1)
	e2:SetTarget(c100212005.sptg)
	e2:SetOperation(c100212005.spop)
	c:RegisterEffect(e2)
	e3=e2:Clone()
	e3:SetCode(EVENT_BATTLED)
	e3:SetCondition(c100212005.spcon2)
	c:RegisterEffect(e3)
	local e4=Effect.CreateEffect(c)
	e4:SetDescription(aux.Stringid(100212005,2))
	e4:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e4:SetCode(EVENT_DESTROYED)
	e4:SetProperty(EFFECT_FLAG_DELAY)
	e4:SetCondition(c100212005.pencon)
	e4:SetTarget(c100212005.pentg)
	e4:SetOperation(c100212005.penop)
	c:RegisterEffect(e4)
end
function c100212005.matfilter(c)
	return c:IsAttribute(ATTRIBUTE_DARK) and c:IsType(TYPE_PENDULUM)
end
function c100212005.cfilter(c,tp)
	return c:IsSetCard(0x10f8,0x20f8) and Duel.GetMZoneCount(tp,c)>0
		and (c:IsFaceup() or c:IsControler(tp))
end
function c100212005.pspcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.CheckReleaseGroup(tp,c100212005.cfilter,1,nil,tp) end
	local g=Duel.SelectReleaseGroup(tp,c100212005.cfilter,1,1,nil,tp)
	Duel.Release(g,REASON_COST)
end
function c100212005.psptg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,c,1,0,0)
end
function c100212005.pspop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToEffect(e) then
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end
end
function c100212005.spcon1(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local bc=c:GetBattleTarget()
	return bc and bc:IsStatus(STATUS_BATTLE_DESTROYED)
end
function c100212005.spcon2(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local bc=c:GetBattleTarget()
	return ep~=tp and not (bc and bc:IsStatus(STATUS_BATTLE_DESTROYED))
end
function c100212005.spfilter(c,e,tp)
	return c:IsSetCard(0x20f8) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
		and (c:IsLocation(LOCATION_DECK) and Duel.GetMZoneCount(tp)>0
			or c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0)
end
function c100212005.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c100212005.spfilter,tp,LOCATION_DECK+LOCATION_EXTRA+LOCATION_GRAVE,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK+LOCATION_EXTRA)
end
function c100212005.spop(e,tp,eg,ep,ev,re,r,rp)
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	if ft<=0 then return end
	if ft>=2 then ft=2 end
	if Duel.IsPlayerAffectedByEffect(tp,59822133) then ft=1 end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,c100212005.spfilter,tp,LOCATION_DECK+LOCATION_EXTRA+LOCATION_GRAVE,0,1,ft,nil,e,tp)
	if g:GetCount()>0 then
		Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP_DEFENSE)
	end
end
function c100212005.pencon(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:IsPreviousLocation(LOCATION_MZONE) and c:IsFaceup()
end
function c100212005.pentg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.CheckLocation(tp,LOCATION_PZONE,0) or Duel.CheckLocation(tp,LOCATION_PZONE,1) end
end
function c100212005.penop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToEffect(e) then
		Duel.MoveToField(c,tp,tp,LOCATION_PZONE,POS_FACEUP,true)
	end
end