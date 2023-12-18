--究極竜魔導師
function c100212001.initial_effect(c)
	aux.AddMaterialCodeList(c,23995346)
	aux.AddCodeList(c,23995346)
	c:EnableReviveLimit()
	local e0=Effect.CreateEffect(c)
	e0:SetType(EFFECT_TYPE_SINGLE)
	e0:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e0:SetCode(EFFECT_SPSUMMON_CONDITION)
	e0:SetValue(aux.fuslimit)
	c:RegisterEffect(e0)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e1:SetCode(EFFECT_FUSION_MATERIAL)
	e1:SetCondition(c100212001.FShaddollCondition())
	e1:SetOperation(c100212001.FShaddollOperation())
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(100212001,1))
	e2:SetCategory(CATEGORY_NEGATE+CATEGORY_DESTROY)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_CHAINING)
	e2:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCondition(c100212001.discon)
	e2:SetTarget(c100212001.distg)
	e2:SetOperation(c100212001.disop)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(100212001,2))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_LEAVE_FIELD)
	e3:SetProperty(EFFECT_FLAG_DELAY)
	e3:SetCondition(c100212001.spcon)
	e3:SetTarget(c100212001.sptg)
	e3:SetOperation(c100212001.spop)
	c:RegisterEffect(e3)
end
function c100212001.FShaddollFilter(c)
	return c:IsFusionSetCard(0xdd) or c:IsFusionSetCard(0xcf) and c:IsFusionType(TYPE_RITUAL) or c:IsFusionCode(23995346) or c:IsHasEffect(EFFECT_FUSION_SUBSTITUTE)
end
function c100212001.Chaos_FShaddollFilter(c,mg,fe)
	return c:IsFusionSetCard(0xcf) and c:IsFusionType(TYPE_RITUAL) and mg:CheckSubGroup(c100212001.FShaddollSpgcheck,1,3,c,fe)
end
function c100212001.Blue_Eyes_Ultimate_Dragon(c,g,fe)
	return (c:IsFusionCode(23995346)
		or c:IsHasEffect(EFFECT_FUSION_SUBSTITUTE) and not fe:GetHandler():IsCode(71143015))
		and g:FilterCount(Card.IsFusionSetCard,c,0xdd)==0
end
function c100212001.FShaddollSpgcheck(g,c,fe)
	return (g:FilterCount(c100212001.Blue_Eyes_Ultimate_Dragon,c,g,fe)==1
		or g:FilterCount(Card.IsFusionSetCard,c,0xdd)==3)
end
function c100212001.FShaddollCondition()
	return  function(e,g,gc,chkf)
			if g==nil then return aux.MustMaterialCheck(nil,e:GetHandlerPlayer(),EFFECT_MUST_BE_FMATERIAL) end
			local c=e:GetHandler()
			local mg=g:Filter(c100212001.FShaddollFilter,nil)
			return mg:IsExists(c100212001.Chaos_FShaddollFilter,1,nil,mg,e)
		end
end
function c100212001.FShaddollOperation()
	return  function(e,tp,eg,ep,ev,re,r,rp,gc,chkf)
			local c=e:GetHandler()
			local mg=eg:Filter(c100212001.FShaddollFilter,nil)
			local g=nil
			if gc then
				g=Group.FromCards(gc)
				mg:RemoveCard(gc)
			else
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FMATERIAL)
				g=mg:FilterSelect(tp,c100212001.Chaos_FShaddollFilter,1,1,nil,mg,e)
				mg:Sub(g)
			end
			local sg=nil
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FMATERIAL)
			sg=mg:SelectSubGroup(tp,c100212001.FShaddollSpgcheck,true,1,3,g,e)
			while not sg do
				mg:AddCard(g:GetFirst())
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FMATERIAL)
				g=mg:FilterSelect(tp,c100212001.Chaos_FShaddollFilter,1,1,nil,mg,e)
				mg:Sub(g)
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FMATERIAL)
				sg=mg:SelectSubGroup(tp,c100212001.FShaddollSpgcheck,true,1,3,g,e)
			end
			g:Merge(sg)
			Duel.SetFusionMaterial(g)
		end
end
function c100212001.discon(e,tp,eg,ep,ev,re,r,rp)
	return rp==1-tp and not e:GetHandler():IsStatus(STATUS_BATTLE_DESTROYED) and Duel.IsChainNegatable(ev)
		and ((re:IsActiveType(TYPE_MONSTER) and Duel.GetFlagEffect(tp,100212001)==0)
		or (re:IsActiveType(TYPE_SPELL) and Duel.GetFlagEffect(tp,100212101)==0)
		or (re:IsActiveType(TYPE_TRAP) and Duel.GetFlagEffect(tp,100212201)==0))
end
function c100212001.distg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return true end
	Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
	if re:IsActiveType(TYPE_MONSTER) then
		Duel.RegisterFlagEffect(tp,100212001,RESET_PHASE+PHASE_END,EFFECT_FLAG_OATH,1)
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(aux.Stringid(100212001,3))
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
		e1:SetReset(RESET_PHASE+PHASE_END)
		e1:SetTargetRange(1,0)
		Duel.RegisterEffect(e1,tp)
	elseif re:IsActiveType(TYPE_SPELL) then
		Duel.RegisterFlagEffect(tp,100212101,RESET_PHASE+PHASE_END,EFFECT_FLAG_OATH,1)
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(aux.Stringid(100212001,4))
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
		e1:SetReset(RESET_PHASE+PHASE_END)
		e1:SetTargetRange(1,0)
	else re:IsActiveType(TYPE_TRAP)
		Duel.RegisterFlagEffect(tp,100212201,RESET_PHASE+PHASE_END,EFFECT_FLAG_OATH,1)
		local e1=Effect.CreateEffect(c)
		e1:SetDescription(aux.Stringid(100212001,5))
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
		e1:SetReset(RESET_PHASE+PHASE_END)
		e1:SetTargetRange(1,0)
	end
	if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
	end
end
function c100212001.disop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then
		Duel.Destroy(eg,REASON_EFFECT)
	end
end
function c100212001.spcon(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:IsSummonType(SUMMON_TYPE_SPECIAL) and c:IsPreviousLocation(LOCATION_MZONE)
		and c:IsPreviousPosition(POS_FACEUP) and c:IsPreviousControler(tp) and c:GetReasonPlayer()==1-tp
end
function c100212001.spfilter(c,e,tp)
	return (c:IsFusionSetCard(0xdd) and c:IsCanBeSpecialSummoned(e,0,tp,false,false) 
		or c:IsFusionSetCard(0xcf) and c:IsFusionType(TYPE_RITUAL) and c:IsType(TYPE_MONSTER) and c:IsCanBeSpecialSummoned(e,0,tp,true,false))
		and (c:IsLocation(LOCATION_GRAVE) and Duel.GetLocationCount(tp,LOCATION_MZONE)>0
			or c:IsLocation(LOCATION_EXTRA) and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0)
end
function c100212001.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(c100212001.spfilter,tp,LOCATION_GRAVE+LOCATION_EXTRA,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK+LOCATION_EXTRA)
end
function c100212001.spop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(c100212001.spfilter),tp,LOCATION_GRAVE+LOCATION_EXTRA,0,1,1,nil,e,tp)
	if #g>0 then
		Duel.SpecialSummon(g,0,tp,tp,true,false,POS_FACEUP)
	end
end