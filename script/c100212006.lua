--灵魂代码
function c100212006.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(100212006,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,100212006)
	e1:SetCondition(c100212006.spcon)
	e1:SetTarget(c100212006.sptg)
	e1:SetOperation(c100212006.spop)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(100212006,1))
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,100212106)
	e2:SetOperation(c100212006.efop)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(100212006,2))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetCode(EVENT_FREE_CHAIN)
	e3:SetRange(LOCATION_GRAVE)
	e3:SetCountLimit(1,100212306)
	e3:SetCondition(c100212006.lkcon)
	e3:SetCost(aux.bfgcost)
	e3:SetTarget(c100212006.lktg)
	e3:SetOperation(c100212006.lkop)
	c:RegisterEffect(e3)
end
function c100212006.cfilter(c)
	return c:IsFaceup() and c:IsType(TYPE_LINK)
end
function c100212006.spcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsExistingMatchingCard(c100212006.cfilter,tp,LOCATION_MZONE,0,1,nil)
end
function c100212006.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function c100212006.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if not c:IsRelateToEffect(e) then return end
	Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
end
function c100212006.efop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(100212006,3))
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_UNCOPYABLE+EFFECT_FLAG_IGNORE_IMMUNE)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetRange(LOCATION_EXTRA)
	e1:SetCountLimit(1,100212206)
	e1:SetCondition(c100212006.linkcon)
	e1:SetOperation(c100212006.linkop)
	e1:SetValue(SUMMON_TYPE_LINK)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_GRANT)
	e2:SetTargetRange(LOCATION_EXTRA,0)
	e2:SetTarget(c100212006.mattg)
	e2:SetReset(RESET_PHASE+PHASE_END)
	e2:SetLabelObject(e1)
	Duel.RegisterEffect(e2,tp)
end
function c100212006.lmfilter(c,lc,tp,og,lmat)
	return c:IsFaceup() and c:IsCanBeLinkMaterial(lc) and c:IsLinkCode(lc:GetCode()) and c:IsLinkType(TYPE_LINK)
		and Duel.GetLocationCountFromEx(tp,tp,c,lc)>0 and aux.MustMaterialCheck(c,tp,EFFECT_MUST_BE_LMATERIAL)
		and (not og or og:IsContains(c)) and (not lmat or lmat==c)
end
function c100212006.linkcon(e,c,og,lmat,min,max)
	if c==nil then return true end
	local tp=c:GetControler()
	return Duel.IsExistingMatchingCard(c100212006.lmfilter,tp,LOCATION_MZONE,0,1,nil,c,tp,og,lmat)
end
function c100212006.linkop(e,tp,eg,ep,ev,re,r,rp,c,og,lmat,min,max)
	local mg=Duel.SelectMatchingCard(tp,c100212006.lmfilter,tp,LOCATION_MZONE,0,1,1,nil,c,tp,og,lmat)
	c:SetMaterial(mg)
	Duel.SendtoGrave(mg,REASON_MATERIAL+REASON_LINK)
end
function c100212006.mattg(e,c)
	return c:IsSetCard(0x119) and c:IsType(TYPE_LINK)
end
function c100212006.lkcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.GetTurnPlayer()==1-tp and (Duel.GetCurrentPhase()==PHASE_MAIN1 or Duel.GetCurrentPhase()==PHASE_MAIN2)
end
function c100212006.lkfilter(c)
	return c:IsLinkSummonable(nil) and c:IsRace(RACE_CYBERSE) and c:IsLinkAbove(3)
end
function c100212006.lktg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c100212006.lkfilter,tp,LOCATION_EXTRA,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,0,0)
end
function c100212006.lkop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,c100212006.lkfilter,tp,LOCATION_EXTRA,0,1,1,nil)
	local tc=g:GetFirst()
	if tc then
		Duel.LinkSummon(tp,tc,nil)
	end
end