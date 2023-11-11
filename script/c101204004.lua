--三色零件
--code by lightup37
function c101204004.initial_effect(c)
  aux.AddCodeList(c,101204051)
  --search
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(101204004,1))
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e1:SetCode(EVENT_SUMMON_SUCCESS)
	e1:SetProperty(EFFECT_FLAG_DELAY)
	e1:SetCountLimit(1,101204004)
	e1:SetTarget(c101204004.thtg)
	e1:SetOperation(c101204004.thop)
	c:RegisterEffect(e1)
  local e3=e1:Clone()
	e3:SetCode(EVENT_SPSUMMON_SUCCESS)
	c:RegisterEffect(e3)
  --break
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(101204004,2))
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCode(EVENT_DESTROYED)
	e2:SetCondition(c101204004.stcon)
	e2:SetTarget(c101204004.sttg)
	e2:SetOperation(c101204004.stop)
  e2:SetCountLimit(1,101204004+100)
	c:RegisterEffect(e2)
end

function c101204004.thfilter(c)
	return ( ( aux.IsCodeListed(c,101204051) and ( c:IsType(TYPE_SPELL) or c:IsType(TYPE_TRAP) ) ) or (c:IsCode(101204051)) ) and c:IsAbleToHand()
end

function c101204004.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then 
    return Duel.IsExistingMatchingCard(c101204004.thfilter,tp,LOCATION_DECK,0,1,nil) 
  end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end

function c101204004.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,c101204004.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g:GetCount()>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end

function c101204004.stfilter(c)
  return c:IsCode(101204071) and c:IsSSetable()
end

function c101204004.stcon(e,tp,eg,ep,ev,re,r,rp)
	return bit.band(r,REASON_EFFECT+REASON_BATTLE)~=0
end

function c101204004.sttg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c101204004.stfilter,tp,LOCATION_DECK,0,1,nil) end
end

function c101204004.stop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SET)
	local g=Duel.SelectMatchingCard(tp,c101204004.stfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g:GetCount()>0 then
		Duel.SSet(tp,g:GetFirst())
	end
end