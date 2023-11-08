--精灵兽使 蕾拉
--code by lightup37
function c100211122.initial_effect(c)
	--add ns
  c:SetSPSummonOnce(100211122)
  local e1=Effect.CreateEffect(c)
  e1:SetCategory(CATEGORY_SUMMON)
  e1:SetType(EFFECT_TYPE_IGNITION)
  e1:SetRange(LOCATION_HAND)
	e1:SetCost(c100211122.sumcost)
	e1:SetTarget(c100211122.sumtg)
	e1:SetOperation(c100211122.sumop)
  e1:SetCountLimit(1,100211122)
	c:RegisterEffect(e1)
  --destroy replace
  local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e2:SetCode(EFFECT_DESTROY_REPLACE)
	e2:SetRange(LOCATION_ONFIELD+LOCATION_GRAVE)
	e2:SetCountLimit(1,100211122+100)
	e2:SetTarget(c100211122.reptg)
	e2:SetValue(c100211122.repval)
	e2:SetOperation(c100211122.repop)
	c:RegisterEffect(e2)
  --when be remove
  local e3=Effect.CreateEffect(c)
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_REMOVE)
	e3:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DELAY)
	e3:SetCountLimit(1,100211122+200)
	e3:SetTarget(c100211122.sstg)
	e3:SetOperation(c100211122.ssop)
	c:RegisterEffect(e3)
end

function c100211122.sumcost(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:IsDiscardable() end
	Duel.SendtoGrave(c,REASON_COST+REASON_DISCARD)
end

function c100211122.sumfilter(c)
	return c:IsSetCard(0xb5) and c:IsSummonable(true,nil)
end

function c100211122.sumtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c100211122.sumfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_SUMMON,nil,1,0,0)
end

function c100211122.sumop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SUMMON)
	local g=Duel.SelectMatchingCard(tp,c100211122.sumfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,1,nil)
	local tc=g:GetFirst()
	if tc then
		Duel.Summon(tp,tc,true,nil)
	end
end

function c100211122.repfilter(c,tp)
	return c:IsFaceup() and c:IsSetCard(0xb5)
		and c:IsOnField() and c:IsControler(tp) and c:IsReason(REASON_EFFECT+REASON_BATTLE) and not c:IsReason(REASON_REPLACE)
end

function c100211122.reptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:GetHandler():IsAbleToRemove() and eg:IsExists(c100211122.repfilter,1,nil,tp) end
	return Duel.SelectEffectYesNo(tp,e:GetHandler(),96)
end

function c100211122.repval(e,c)
	return c100211122.repfilter(c,e:GetHandlerPlayer())
end

function c100211122.repop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Remove(e:GetHandler(),POS_FACEUP,REASON_EFFECT)
end

function c100211122.ssfilter(c,e,tp)
  return c:IsSetCard(0xb5) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end

function c100211122.sstg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and
    Duel.IsExistingMatchingCard(c100211122.ssfilter,tp,LOCATION_DECK,0,1,nil,e,tp) end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end

function c100211122.ssop(e,tp,eg,ep,ev,re,r,rp,chk)
  local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	if ft<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,c100211122.ssfilter,tp,LOCATION_DECK,0,1,1,nil,e,tp)
	if g:GetCount()>0 then
		Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
	end
end