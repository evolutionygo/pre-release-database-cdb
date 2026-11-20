--高速詠唱
local s,id,o=GetID()
function s.initial_effect(c)
	--activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_FUSION_SUMMON+EFFECT_FLAG_CARD_TARGET)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.spfilter(c,e,tp)
	return c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spcheck(e,tp)
	return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingTarget(s.spfilter,tp,LOCATION_GRAVE,LOCATION_GRAVE,1,nil,e,tp)
end
function s.fmatfilter(c,e)
	return not c:IsImmuneToEffect(e)
end
function s.fusfilter(c,e,tp,m,f,chkf)
	return c:IsType(TYPE_FUSION) and (not f or f(c))
		and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_FUSION,tp,false,false)
		and c:CheckFusionMaterial(m,nil,chkf)
end
function s.fusionmat(tp,e,exc)
	local mg=Duel.GetFusionMaterial(tp):Filter(s.fmatfilter,nil,e)
	if exc then mg:RemoveCard(exc) end
	return mg
end
function s.fuscheck(e,tp,exc)
	local chkf=tp
	local mg=s.fusionmat(tp,e,exc)
	local res=Duel.IsExistingMatchingCard(s.fusfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp,mg,nil,chkf)
	if not res then
		local ce=Duel.GetChainMaterial(tp)
		if ce~=nil then
			local fgroup=ce:GetTarget()
			local mg2=fgroup(ce,e,tp)
			local mf=ce:GetValue()
			res=Duel.IsExistingMatchingCard(s.fusfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp,mg2,mf,chkf)
		end
	end
	return res
end
function s.ritcheck(e,tp,exc)
	local mg=Duel.GetRitualMaterial(tp)
	if exc then mg:RemoveCard(exc) end
	return Duel.IsExistingMatchingCard(aux.RitualUltimateFilter,tp,LOCATION_HAND,0,1,exc,aux.TRUE,e,tp,mg,nil,Card.GetLevel,"Greater")
end
function s.costfilter(c,e,tp)
	return c:IsDiscardable()
end
function s.fcostfilter(c,e,tp)
	return c:IsDiscardable() and s.fuscheck(e,tp,c)
end
function s.rcostfilter(c,e,tp)
	return c:IsDiscardable() and s.ritcheck(e,tp,c)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_GRAVE) and s.spfilter(chkc,e,tp) end
	local b1=s.spcheck(e,tp)
	local b2=false
	local b3=false
	if e:IsCostChecked() then
		b1=b1 and Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
		b2=Duel.IsExistingMatchingCard(s.fcostfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
		b3=Duel.IsExistingMatchingCard(s.rcostfilter,tp,LOCATION_HAND,0,1,nil,e,tp)
	else
		b2=s.fuscheck(e,tp,nil)
		b3=s.ritcheck(e,tp,nil)
	end
	if chk==0 then return b1 or b2 or b3 end
	local op=aux.SelectFromOptions(tp,
		{b1,aux.Stringid(id,1),1},
		{b2,aux.Stringid(id,2),2},
		{b3,aux.Stringid(id,3),3})
	e:SetLabel(op)
	if op==1 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON)
			Duel.DiscardHand(tp,s.costfilter,1,1,REASON_COST,nil,e,tp)
		end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectTarget(tp,s.spfilter,tp,LOCATION_GRAVE,LOCATION_GRAVE,1,1,nil,e,tp)
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
	elseif op==2 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_FUSION_SUMMON)
			Duel.DiscardHand(tp,s.fcostfilter,1,1,REASON_COST,nil,e,tp)
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
	else
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON)
			Duel.DiscardHand(tp,s.rcostfilter,1,1,REASON_COST,nil,e,tp)
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND)
	end
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	if e:GetLabel()==1 then
		s.spop(e,tp)
	elseif e:GetLabel()==2 then
		s.fusionop(e,tp)
	elseif e:GetLabel()==3 then
		s.ritualop(e,tp)
	end
end
function s.spop(e,tp)
	local tc=Duel.GetFirstTarget()
	if tc and tc:IsRelateToChain() and aux.NecroValleyFilter()(tc) then
		Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
	end
end
function s.fusionop(e,tp)
	local chkf=tp
	local mg1=s.fusionmat(tp,e,nil)
	local sg1=Duel.GetMatchingGroup(s.fusfilter,tp,LOCATION_EXTRA,0,nil,e,tp,mg1,nil,chkf)
	local mg2=nil
	local sg2=nil
	local ce=Duel.GetChainMaterial(tp)
	if ce~=nil then
		local fgroup=ce:GetTarget()
		mg2=fgroup(ce,e,tp)
		local mf=ce:GetValue()
		sg2=Duel.GetMatchingGroup(s.fusfilter,tp,LOCATION_EXTRA,0,nil,e,tp,mg2,mf,chkf)
	end
	if #sg1>0 or (sg2~=nil and #sg2>0) then
		local sg=sg1:Clone()
		if sg2 then sg:Merge(sg2) end
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local tg=sg:Select(tp,1,1,nil)
		local tc=tg:GetFirst()
		if sg1:IsContains(tc) and (sg2==nil or not sg2:IsContains(tc) or ce and not Duel.SelectYesNo(tp,ce:GetDescription())) then
			local mat=Duel.SelectFusionMaterial(tp,tc,mg1,nil,chkf)
			tc:SetMaterial(mat)
			Duel.SendtoGrave(mat,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION)
			Duel.BreakEffect()
			Duel.SpecialSummon(tc,SUMMON_TYPE_FUSION,tp,tp,false,false,POS_FACEUP)
		elseif ce and mg2 then
			local mat2=Duel.SelectFusionMaterial(tp,tc,mg2,nil,chkf)
			local fop=ce:GetOperation()
			fop(ce,e,tp,tc,mat2)
		end
		tc:CompleteProcedure()
	end
end
function s.ritualop(e,tp)
	::rcancel::
	local mg=Duel.GetRitualMaterial(tp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local tg=Duel.SelectMatchingCard(tp,aux.RitualUltimateFilter,tp,LOCATION_HAND,0,1,1,nil,aux.TRUE,e,tp,mg,nil,Card.GetLevel,"Greater")
	local tc=tg:GetFirst()
	if not tc then return end
	mg=mg:Filter(Card.IsCanBeRitualMaterial,tc,tc)
	if tc.mat_filter then
		mg=mg:Filter(tc.mat_filter,tc,tp)
	else
		mg:RemoveCard(tc)
	end
	local lv=tc:GetLevel()
	aux.GCheckAdditional=aux.RitualCheckAdditional(tc,lv,"Greater")
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RELEASE)
	local mat=mg:SelectSubGroup(tp,aux.RitualCheck,true,1,lv,tp,tc,lv,"Greater")
	aux.GCheckAdditional=nil
	if not mat then goto rcancel end
	tc:SetMaterial(mat)
	Duel.ReleaseRitualMaterial(mat)
	Duel.BreakEffect()
	Duel.SpecialSummon(tc,SUMMON_TYPE_RITUAL,tp,tp,false,true,POS_FACEUP)
	tc:CompleteProcedure()
end
