--罪なき罪宝
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--special summon
	local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_HANDES)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetRange(LOCATION_SZONE)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetCountLimit(1,id)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
end
function s.spfilter(c,e,tp)
	return c:IsFaceupEx() and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
		and (c:IsLocation(LOCATION_SZONE)
			or c:IsSetCard(0x19b) and Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>0)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_GRAVE+LOCATION_REMOVED+LOCATION_SZONE) and s.spfilter(chkc,e,tp) end
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingTarget(s.spfilter,tp,LOCATION_GRAVE+LOCATION_REMOVED+LOCATION_SZONE,0,1,nil,e,tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=aux.SelectTargetFromFieldFirst(tp,s.spfilter,tp,LOCATION_GRAVE+LOCATION_REMOVED+LOCATION_SZONE,0,1,1,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
	local sc=g:GetFirst()
	if sc:IsLocation(LOCATION_GRAVE+LOCATION_REMOVED) then
		e:SetLabel(1)
		e:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_HANDES)
		Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,0,tp,1)
		Duel.Hint(HINT_OPSELECTED,1-tp,aux.Stringid(id,0))
	elseif sc:IsLocation(LOCATION_SZONE) then
		e:SetLabel(2)
		e:SetCategory(CATEGORY_SPECIAL_SUMMON)
		Duel.Hint(HINT_OPSELECTED,1-tp,aux.Stringid(id,1))
	end
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local tc=Duel.GetFirstTarget()
	if e:GetLabel()==1 and Duel.DiscardHand(tp,nil,1,1,REASON_DISCARD+REASON_EFFECT,nil)==0 then return end
	if not tc:IsRelateToEffect(e) then return end
	if aux.NecroValleyFilter()(tc) then
		Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
	end
end
