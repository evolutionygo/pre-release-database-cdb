--クリスタルクリアウィング・オーバー・シンクロ・ドラゴン
local s,id,o=GetID()
function s.initial_effect(c)
	--synchro summon
	local e0=Effect.CreateEffect(c)
	e0:SetDescription(1164)
	e0:SetType(EFFECT_TYPE_FIELD)
	e0:SetCode(EFFECT_SPSUMMON_PROC)
	e0:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e0:SetRange(LOCATION_EXTRA)
	e0:SetCondition(s.SynMixCondition(nil,nil,nil,aux.Tuner(nil),1,99,gc))
	e0:SetTarget(s.SynMixTarget(nil,nil,nil,aux.Tuner(nil),1,99,gc))
	e0:SetOperation(s.SynMixOperation(nil,nil,nil,aux.Tuner(nil),1,99,gc))
	e0:SetValue(SUMMON_TYPE_SYNCHRO)
	c:RegisterEffect(e0)
	--cannot special summon
	local e1=Effect.CreateEffect(c)
	e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetCode(EFFECT_SPSUMMON_CONDITION)
	e1:SetValue(aux.synlimit)
	c:RegisterEffect(e1)
	--negate
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_NEGATE+CATEGORY_DESTROY)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_CHAINING)
	e2:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1)
	e2:SetCondition(s.negcon)
	e2:SetTarget(s.negtg)
	e2:SetOperation(s.negop)
	c:RegisterEffect(e2)
	--special summon
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_LEAVE_FIELD)
	e3:SetProperty(EFFECT_FLAG_DELAY)
	e3:SetCondition(s.spcon)
	e3:SetTarget(s.sptg)
	e3:SetOperation(s.spop)
	c:RegisterEffect(e3)
end
function s.SynMaterialFilter(c,syncard)
	return c:IsFaceupEx() and c:IsCanBeSynchroMaterial(syncard)
end
function s.GetSynMaterials(tp,syncard)
	local mg=Duel.GetSynchroMaterial(tp):Filter(s.SynMaterialFilter,nil,syncard)
	if mg:IsExists(Card.GetHandSynchro,1,nil) then
		local mg2=Duel.GetMatchingGroup(Card.IsCanBeSynchroMaterial,tp,LOCATION_HAND,0,nil,syncard)
		if mg2:GetCount()>0 then mg:Merge(mg2) end
	end
	return mg
end
function s.SynMixCondition(f1,f2,f3,f4,minct,maxct,gc)
	return  function(e,c,smat,mg1,min,max)
				if c==nil then return true end
				if c:IsType(TYPE_PENDULUM) and c:IsFaceup() then return false end
				local minc=minct
				local maxc=maxct
				if min then
					local exct=0
					if min-exct>minc then minc=min-exct end
					if max-exct<maxc then maxc=max-exct end
					if minc>maxc then return false end
				end
				local tp=c:GetControler()
				if Duel.IsPlayerAffectedByEffect(tp,8173184) then
					Duel.RegisterFlagEffect(tp,8173184+1,0,0,1)
				end
				if smat and not smat:IsCanBeSynchroMaterial(c) then
					Duel.ResetFlagEffect(tp,8173184+1)
					return false
				end
				local mg
				local mgchk=false
				if mg1 then
					mg=mg1:Filter(Card.IsCanBeSynchroMaterial,nil,c)
					mgchk=true
				else
					mg=s.GetSynMaterials(tp,c)
				end
				if smat~=nil then mg:AddCard(smat) end
				local res=mg:IsExists(s.SynMixFilter1,1,nil,minc,maxc,c,mg,smat,gc,mgchk)
				Duel.ResetFlagEffect(tp,8173184+1)
				return res
			end
end
function s.SynMixTarget(f1,f2,f3,f4,minct,maxct,gc)
	return  function(e,tp,eg,ep,ev,re,r,rp,chk,c,smat,mg1,min,max)
				local minc=minct
				local maxc=maxct
				if min then
					local exct=0
					if min-exct>minc then minc=min-exct end
					if max-exct<maxc then maxc=max-exct end
					if minc>maxc then return false end
				end
				::SynMixTargetSelectStart::
				if Duel.IsPlayerAffectedByEffect(tp,8173184) then
					Duel.RegisterFlagEffect(tp,8173184+1,0,0,1)
				end
				local g=Group.CreateGroup()
				local mg
				local mgchk=false
				if mg1 then
					mg=mg1:Filter(Card.IsCanBeSynchroMaterial,nil,c)
					mgchk=true
				else
					mg=s.GetSynMaterials(tp,c)
				end
				if smat~=nil then mg:AddCard(smat) end
				local c1
				local g4=Group.CreateGroup()
				local cancel=Duel.IsSummonCancelable()
				Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SMATERIAL)
				c1=mg:Filter(s.SynMixFilter1,nil,minc,maxc,c,mg,smat,gc,mgchk):SelectUnselect(g,tp,false,cancel,1,1)
				if not c1 then goto SynMixTargetSelectCancel end
				g:AddCard(c1)
				for i=0,maxc-1 do
					local mg2=mg:Clone()
					if f4 then
						mg2=mg2:Filter(f4,g,c,c1,c2,c3)
					else
						mg2:Sub(g)
					end
					g4=mg2:SelectSubGroup(tp,s.gcheck,true,1,99,tp,c1,gc,c1:GetLevel())
					break
				end
				g:Merge(g4)
				if g4:GetCount()>0 then
					g:KeepAlive()
					e:SetLabelObject(g)
					Duel.ResetFlagEffect(tp,8173184+1)
					return true
				end
				::SynMixTargetSelectCancel::
				Duel.ResetFlagEffect(tp,8173184+1)
				return false
			end
end
function s.SynMixOperation(f1,f2,f3,f4,minct,maxct,gc)
	return  function(e,tp,eg,ep,ev,re,r,rp,c,smat,mg,min,max)
				local g=e:GetLabelObject()
				c:SetMaterial(g)
				Duel.SendtoGrave(g,REASON_MATERIAL+REASON_SYNCHRO)
				g:DeleteGroup()
			end
end
function s.SynMixFilter1(c,minc,maxc,syncard,mg,smat,gc,mgchk)
	if not c:IsCode(82044279) then return false end
	if c:IsLevel(12) then return false end
	local sg=mg
	local g=Group.CreateGroup()
	g:AddCard(c)
	sg:Sub(g)
	return sg:CheckSubGroup(s.gcheck,1,99,tp,c,gc,c:GetLevel())
end
function s.gcheck(g,tp,sc,gc,lv)
	if not (g:GetSum(Card.GetLevel)==12-lv) then return false end
	return (g:GetCount()==1 and bit.band(g:GetFirst():GetType(),TYPE_SYNCHRO+TYPE_TUNER)==TYPE_SYNCHRO+TYPE_TUNER
		or g:GetCount()>=2 and g:GetCount()==g:FilterCount(Card.IsType,nil,TYPE_TUNER)) and (not gc or (sc==gc or g:IsContains(gs)))
end
function s.SynMixFilter2(c,minc,maxc,syncard,mg,smat,c1,gc,mgchk)
	if f2 then
		return f2(c,syncard,c1)
			and (mg:IsExists(Auxiliary.SynMixFilter3,1,Group.FromCards(c1,c),f3,f4,minc,maxc,syncard,mg,smat,c1,c,gc,mgchk)
				or minc==0 and Auxiliary.SynMixFilter4(c,nil,1,1,syncard,mg,smat,c1,nil,nil,gc,mgchk))
	else
		return mg:IsExists(Auxiliary.SynMixFilter4,1,c1,f4,minc,maxc,syncard,mg,smat,c1,nil,nil,gc,mgchk)
	end
end
function s.negcon(e,tp,eg,ep,ev,re,r,rp)
	return not e:GetHandler():IsStatus(STATUS_BATTLE_DESTROYED) and Duel.IsChainNegatable(ev)
end
function s.negtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	e:GetHandler():RegisterFlagEffect(0,RESET_EVENT+RESETS_STANDARD,EFFECT_FLAG_CLIENT_HINT,1,0,aux.Stringid(84815190,3))
	Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
	if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then
		Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
	end
end
function s.negop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local rc=re:GetHandler()
	if Duel.NegateActivation(ev) and rc:IsRelateToEffect(re) and Duel.Destroy(rc,REASON_EFFECT)~=0 and rc:GetBaseAttack()>=0
		and c:IsRelateToEffect(e) and c:IsFaceup() then
		local e1=Effect.CreateEffect(c)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_DISABLE+RESET_PHASE+PHASE_END)
		e1:SetValue(rc:GetBaseAttack())
		c:RegisterEffect(e1)
	end
end
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:IsSummonType(SUMMON_TYPE_SYNCHRO) and c:IsPreviousLocation(LOCATION_MZONE)
		and c:IsPreviousPosition(POS_FACEUP) and c:IsPreviousControler(tp) and c:GetReasonPlayer()==1-tp
end
function s.spfilter(c,e,tp)
	return c:IsSetCard(0xff) and c:IsCanBeSpecialSummoned(e,0,tp,true,false)
		and Duel.GetLocationCountFromEx(tp,tp,nil,c)>0
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,s.spfilter,tp,LOCATION_EXTRA,0,1,1,nil,e,tp)
	if #g>0 then
		Duel.SpecialSummon(g,0,tp,tp,true,false,POS_FACEUP)
	end
end