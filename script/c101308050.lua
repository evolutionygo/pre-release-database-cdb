--ネオ・カオス・フォーム
local s,id,o=GetID()
function s.initial_effect(c)
	aux.AddCodeList(c,101308049,89631139)
	--activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_FUSION_SUMMON)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
end
function s.filter1(c,e)
	return c:IsFaceupEx() and c:IsType(TYPE_MONSTER) and c:IsCanBeFusionMaterial() and c:IsAbleToDeck() and not c:IsImmuneToEffect(e)
end
function s.filter2(c,e,tp,m,f,chkf)
	return c:IsType(TYPE_FUSION) and c:IsSetCard(0xdd) and (not f or f(c))
		and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_FUSION,tp,false,false) and c:CheckFusionMaterial(m,nil,chkf)
end
function s.rfilter(c)
	return (c:IsType(TYPE_MONSTER) and aux.IsCodeListed(c,101308049) or c:IsCode(89631139)) and c:IsAbleToRemove()
end
function s.rsfilter(c)
	return c:IsType(TYPE_MONSTER) and c:IsSetCard(0xcf)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local chkf=tp
	local mg=Duel.GetMatchingGroup(s.filter1,tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_REMOVED,0,nil,e)
	local res1=Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_EXTRA,0,1,nil,e,tp,mg,nil,chkf)
		and (not e:IsCostChecked() or Duel.GetFlagEffect(tp,id)==0)
	if not res1 then
		local ce=Duel.GetChainMaterial(tp)
		if ce~=nil then
			local fgroup=ce:GetTarget()
			local mg3=fgroup(ce,e,tp)
			local mf=ce:GetValue()
			res1=Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_EXTRA,0,1,nil,e,tp,mg3,mf,chkf)
				and (not e:IsCostChecked() or Duel.GetFlagEffect(tp,id)==0)
		end
	end
	local mg1=Duel.GetMatchingGroup(s.rfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,nil)
	local mg2=Duel.GetMatchingGroup(s.rfilter,tp,LOCATION_GRAVE,0,nil)
	local res2=Duel.IsExistingMatchingCard(aux.RitualUltimateFilter,tp,LOCATION_HAND+LOCATION_REMOVED,0,1,nil,s.rsfilter,e,tp,mg1,mg2,Card.GetLevel,"Greater")
		and (not e:IsCostChecked() or Duel.GetFlagEffect(tp,id+o)==0)
	if chk==0 then return res1 and Duel.GetFlagEffect(tp,id)==0 or res2 and Duel.GetFlagEffect(tp,id+o)==0 end
	local op=aux.SelectFromOptions(tp,
		{res1,aux.Stringid(id,1),1},
		{res2,aux.Stringid(id,2),2})
	e:SetLabel(op)
	if op==1 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_FUSION_SUMMON+CATEGORY_TODECK)
			Duel.RegisterFlagEffect(tp,id,RESET_PHASE+PHASE_END,0,1)
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
		Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_REMOVED)
	end
	if op==2 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_REMOVE)
			Duel.RegisterFlagEffect(tp,id+o,RESET_PHASE+PHASE_END,0,1)
		end
		Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND+LOCATION_REMOVED)
		Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,tp,LOCATION_HAND+LOCATION_MZONE+LOCATION_GRAVE)
	end
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	if e:GetLabel()==1 then
		local chkf=tp
		local mg=Duel.GetMatchingGroup(aux.NecroValleyFilter(s.filter1),tp,LOCATION_HAND+LOCATION_GRAVE+LOCATION_REMOVED,0,nil,e)
		local sg1=Duel.GetMatchingGroup(s.filter2,tp,LOCATION_EXTRA,0,nil,e,tp,mg,nil,chkf)
		local mg3=nil
		local sg2=nil
		local ce=Duel.GetChainMaterial(tp)
		if ce~=nil then
			local fgroup=ce:GetTarget()
			mg3=fgroup(ce,e,tp)
			local mf=ce:GetValue()
			sg2=Duel.GetMatchingGroup(s.filter2,tp,LOCATION_EXTRA,0,nil,e,tp,mg3,mf,chkf)
		end
		if sg1:GetCount()>0 or (sg2~=nil and sg2:GetCount()>0) then
			local sg=sg1:Clone()
			if sg2 then sg:Merge(sg2) end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
			local tg=sg:Select(tp,1,1,nil)
			local tc=tg:GetFirst()
			if sg1:IsContains(tc) and (sg2==nil or not sg2:IsContains(tc) or ce and not Duel.SelectYesNo(tp,ce:GetDescription())) then
				local mat=Duel.SelectFusionMaterial(tp,tc,mg,nil,chkf)
				tc:SetMaterial(mat)
				if mat:IsExists(Card.IsLocation,1,nil,LOCATION_HAND) then
					local cg=mat:Filter(Card.IsLocation,nil,LOCATION_HAND)
					Duel.ConfirmCards(1-tp,cg)
				end
				if mat:Filter(Card.IsLocation,nil,LOCATION_GRAVE+LOCATION_REMOVED):GetCount()>0 then
					local cg=mat:Filter(Card.IsLocation,nil,LOCATION_GRAVE+LOCATION_REMOVED)
					Duel.HintSelection(cg)
				end
				Duel.SendtoDeck(mat,nil,SEQ_DECKSHUFFLE,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION)
				Duel.BreakEffect()
				Duel.SpecialSummon(tc,SUMMON_TYPE_FUSION,tp,tp,false,false,POS_FACEUP)
			elseif ce then
				local mat2=Duel.SelectFusionMaterial(tp,tc,mg3,nil,chkf)
				local fop=ce:GetOperation()
				fop(ce,e,tp,tc,mat2)
			end
			tc:CompleteProcedure()
		end
	elseif e:GetLabel()==2 then
		::rcancel::
		local mg1=Duel.GetMatchingGroup(s.rfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,nil)
		local mg2=Duel.GetMatchingGroup(aux.NecroValleyFilter(s.rfilter),tp,LOCATION_GRAVE,0,nil)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local tg=Duel.SelectMatchingCard(tp,aux.RitualUltimateFilter,tp,LOCATION_HAND+LOCATION_REMOVED,0,1,1,nil,s.rsfilter,e,tp,mg1,mg2,Card.GetLevel,"Greater")
		local tc=tg:GetFirst()
		if tc then
			local mg=mg1:Filter(Card.IsCanBeRitualMaterial,tc,tc)
			mg:Merge(mg2)
			if tc.mat_filter then
				mg=mg:Filter(tc.mat_filter,tc,tp)
			else
				mg:RemoveCard(tc)
			end
			aux.GCheckAdditional=aux.RitualCheckAdditional(tc,tc:GetLevel(),"Greater")
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
			local mat=mg:SelectSubGroup(tp,aux.RitualCheck,true,1,tc:GetLevel(),tp,tc,tc:GetLevel(),"Greater")
			aux.GCheckAdditional=nil
			if not mat then
				goto rcancel
			end
			tc:SetMaterial(mat)
			Duel.Remove(mat,POS_FACEUP,REASON_EFFECT+REASON_MATERIAL+REASON_RITUAL)
			Duel.BreakEffect()
			Duel.SpecialSummon(tc,SUMMON_TYPE_RITUAL,tp,tp,false,true,POS_FACEUP)
			tc:CompleteProcedure()
		end
	end
end
