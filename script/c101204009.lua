--幻奏的歌姬 露芙兰
function c101204009.initial_effect(c)
	aux.EnablePendulumAttribute(c)
	local e0=Effect.CreateEffect(c)
	e0:SetDescription(aux.Stringid(101204009,0))
	e0:SetCategory(CATEGORY_ATKCHANGE)
	e0:SetType(EFFECT_TYPE_IGNITION)
	e0:SetRange(LOCATION_PZONE)
	e0:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e0:SetCountLimit(1,101204009)
	e0:SetTarget(c101204009.atktg)
	e0:SetOperation(c101204009.atkop)
	c:RegisterEffect(e0)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(101204009,1))
	e1:SetCategory(CATEGORY_SEARCH+CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e1:SetCode(EVENT_SUMMON_SUCCESS)
	e1:SetCountLimit(1,101204109)
	e1:SetProperty(EFFECT_FLAG_DELAY)
	e1:SetTarget(c101204009.thtg)
	e1:SetOperation(c101204009.thop)
	c:RegisterEffect(e1)
	local e2=e1:Clone()
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(101204009,2))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_SPSUMMON_SUCCESS)
	e3:SetProperty(EFFECT_FLAG_DELAY)
	e3:SetRange(LOCATION_EXTRA)
	e3:SetCountLimit(1,101204209)
	e3:SetCondition(c101204009.pencon)
	e3:SetTarget(c101204009.pentg)
	e3:SetOperation(c101204009.penop)
	c:RegisterEffect(e3)
end
function c101204009.tgfilter(c)
	return c:IsType(TYPE_MONSTER) and c:IsSetCard(0x9b) and c:IsAbleToGrave()
end
function c101204009.filter(c)
	return c:IsType(TYPE_FUSION) and c:IsSetCard(0x9b) and c:IsFaceup()
end
function c101204009.atktg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(tp) and chkc:IsFaceup() end
	if chk==0 then return Duel.IsExistingTarget(c101204009.filter,tp,LOCATION_MZONE,0,1,nil) and Duel.IsExistingMatchingCard(c101204009.tgfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
	local g=Duel.SelectTarget(tp,c101204009.filter,tp,LOCATION_MZONE,0,1,1,nil)
	Duel.SetOperationInfo(0,CATEGORY_ATKCHANGE,g,1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)
end
function c101204009.atkop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local tg=Duel.SelectMatchingCard(tp,c101204009.tgfilter,tp,LOCATION_DECK,0,1,1,nil):GetFirst()
	if tg and Duel.SendtoGrave(tg,REASON_COST)~=0 then
		local tc=Duel.GetFirstTarget()
		if tc:IsRelateToEffect(e) and tc:IsFaceup() then
			local e0=Effect.CreateEffect(c)
			e0:SetType(EFFECT_TYPE_SINGLE)
			e0:SetCode(EFFECT_UPDATE_ATTACK)
			e0:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
			e0:SetValue(tg:GetLevel()*200)
			tc:RegisterEffect(e0)
		end
	end
end
function c101204009.thfilter(c)
	return not c:IsCode(101204009) and c:IsType(TYPE_MONSTER) and c:IsSetCard(0x9b) and c:IsAbleToHand()
end
function c101204009.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c101204009.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function c101204009.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,c101204009.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if #g>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end
function c101204009.cfilter(c,tp)
	return c:IsFaceup() and c:IsType(TYPE_FUSION) and c:IsSetCard(0x9b) and c:IsFaceup() and c:IsControler(tp)
end
function c101204009.pencon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():IsFaceup() and eg:IsExists(c101204009.cfilter,1,nil,tp)
end
function c101204009.pentg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.CheckLocation(tp,LOCATION_PZONE,0) or Duel.CheckLocation(tp,LOCATION_PZONE,1) end
end
function c101204009.penop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToEffect(e) then
		Duel.MoveToField(c,tp,tp,LOCATION_PZONE,POS_FACEUP,true)
	end
end