--原石の皇脈
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCountLimit(1,id)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
	--atk up
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_UPDATE_ATTACK)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(aux.TargetBoolFunction(s.aufilter))
	e2:SetValue(s.atkval)
	c:RegisterEffect(e2)
	--spsummon
	local e3=Effect.CreateEffect(c)
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetRange(LOCATION_SZONE)
	e3:SetCountLimit(1,id+o)
	e3:SetTarget(s.smtg)
	e3:SetOperation(s.smop)
	c:RegisterEffect(e3)
end
function s.thfilter(c)
	return c:IsSetCard(0x2b9) and not c:IsCode(101206058) and c:IsAbleToHand()
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local g=Duel.GetMatchingGroup(s.thfilter,tp,LOCATION_DECK,0,nil)
	if g:GetCount()>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local sg=g:Select(tp,1,1,nil)
		Duel.SendtoHand(sg,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,sg)
	end
end
function s.aufilter(c)
	return c:IsSetCard(0x2b9) or c:IsType(TYPE_NORMAL)
end
function s.atkval(e)
	local g=Duel.GetMatchingGroup(Card.IsType,e:GetHandlerPlayer(),LOCATION_GRAVE,0,nil,TYPE_NORMAL)
	return g:GetClassCount(Card.GetCode)*300
end
function s.smfilter(c,e,tp)
	return bit.band(c:GetOriginalType(),TYPE_NORMAL)~=0 and c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_DEFENSE)
end
function s.smtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.smfilter,tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_DECK,0,1,nil,e,tp) end
	local g=Duel.GetMatchingGroup(s.smfilter,tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_DECK,0,nil,e,tp)
	local sg=Group.CreateGroup()
	for tc in aux.Next(g) do
		if sg:FilterCount(Card.IsCode,nil,tc:GetCode())==0 then
			sg:AddCard(tc)
		end
	end
	local flag=1
	local nt={}
	for tc in aux.Next(sg) do
		table.insert(nt,tc:GetCode())
		table.insert(nt,OPCODE_ISCODE)
		if flag>1 then table.insert(nt,OPCODE_OR) end
		flag=flag+1
	end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CODE)
	local code=Duel.AnnounceCard(tp,table.unpack(nt))
	Duel.SetTargetParam(code)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK+LOCATION_HAND+LOCATION_GRAVE)
end
function s.smop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		local code=Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)
		local og=Duel.GetMatchingGroup(aux.NecroValleyFilter(s.smfilter),tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_DECK,0,nil,e,tp):Filter(Card.IsCode,nil,code)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=og:Select(tp,1,1,nil)
		if g:GetCount()>0 then
			Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP_DEFENSE)
		end
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_ACTIVATE)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetValue(s.aclimit)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.aclimit(e,re,tp)
	local rc=re:GetHandler()
	return re:IsActiveType(TYPE_MONSTER) and rc:IsSummonType(SUMMON_TYPE_SPECIAL) and rc:IsLocation(LOCATION_MZONE)
end