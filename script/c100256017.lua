--サイバース•コード•マジシャン
local s,id,o=GetID()
function s.initial_effect(c)
	aux.AddCodeList(c,34767865)
	c:EnableReviveLimit()
	--hand link
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e1:SetCode(EFFECT_EXTRA_LINK_MATERIAL)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id)
	e1:SetValue(s.matval)
	c:RegisterEffect(e1)
	--To grave
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_TOGRAVE+CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetProperty(EFFECT_FLAG_DELAY+EFFECT_FLAG_ACTIVATE_CONDITION)
	e2:SetCode(EVENT_TO_GRAVE)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.tgcon)
	e2:SetTarget(s.tgtg)
	e2:SetOperation(s.tgop)
	c:RegisterEffect(e2)
end
function s.mfilter(c,tp)
	return c:IsLocation(LOCATION_MZONE) and c:IsType(TYPE_LINK) and c:IsControler(tp)
end
function s.exmfilter(c)
	return c:IsLocation(LOCATION_HAND) and c:IsCode(id)
end
function s.matval(e,lc,mg,c,tp)
	if not lc:IsRace(RACE_CYBERSE) then return false,nil end
	return true,not mg or mg:IsExists(s.mfilter,1,nil,tp) and not mg:IsExists(s.exmfilter,1,nil)
end
function s.tgcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():IsPreviousLocation(LOCATION_HAND+LOCATION_ONFIELD)
end
function s.tgfilter(c,e,tp,el)
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	return c:IsRace(RACE_CYBERSE) and (c:IsAbleToGrave()
		or el==100 and ft>0 and c:IsCanBeSpecialSummoned(e,0,tp,false,false))
end
function s.tgtg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if c:IsPreviousLocation(LOCATION_MZONE) and c:IsSummonType(SUMMON_TYPE_RITUAL) then
		e:SetLabel(100)
	else
		e:SetLabel(0)
	end
	if chk==0 then return Duel.IsExistingMatchingCard(s.tgfilter,tp,LOCATION_DECK,0,1,nil,e,tp,e:GetLabel()) end
	Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)
end
function s.tgop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.tgfilter,tp,LOCATION_DECK,0,1,1,nil,e,tp,e:GetLabel())
	local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
	local tc=g:GetFirst()
	if tc then
		if tc:IsAbleToGrave() and (not tc:IsCanBeSpecialSummoned(e,0,tp,false,false) or ft<=0 or Duel.SelectOption(tp,1191,1152)==0) then
			Duel.SendtoGrave(tc,REASON_EFFECT)
		else
			Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
		end
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e1:SetTargetRange(1,0)
	e1:SetTarget(s.splimit)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.splimit(e,c)
	return not c:IsRace(RACE_CYBERSE)
end