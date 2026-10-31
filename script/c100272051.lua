-- ゴーストリックの妖狐
local s,id,o=GetID()
function s.initial_effect(c)
	local e0=Effect.CreateEffect(c)
	e0:SetDescription(1165)
	e0:SetType(EFFECT_TYPE_FIELD)
	e0:SetCode(EFFECT_SPSUMMON_PROC)
	e0:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
	e0:SetRange(LOCATION_EXTRA)
	e0:SetCondition(s.XyzCondition(s.mfilter,2,2,2,s.smfilter,aux.Stringid(id,0)))
	e0:SetTarget(s.XyzTarget(s.mfilter,2,2,2,s.smfilter,aux.Stringid(id,0)))
	e0:SetOperation(Auxiliary.XyzOperation(s.mfilter,2,2,2,s.smfilter,aux.Stringid(id,0)))
	e0:SetValue(SUMMON_TYPE_XYZ)
	c:RegisterEffect(e0)
	--indes
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e1:SetRange(LOCATION_MZONE)
	e1:SetValue(aux.indoval)
	c:RegisterEffect(e1)
	--special summon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1)
	e2:SetCost(s.spcost)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
	if not s.global_check then
		s.global_check=true
		local ge1=Effect.CreateEffect(c)
		ge1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ge1:SetCode(EVENT_SPSUMMON_SUCCESS)
		ge1:SetOperation(s.checkop)
		Duel.RegisterEffect(ge1,0)
	end
end
function s.cfilter(c,tp)
	return c:GetOriginalCode()==id and c:IsSummonPlayer(tp)
		and c:IsSummonLocation(LOCATION_EXTRA)
end
function s.checkop(e,tp,eg,ep,ev,re,r,rp)
	for p=0,1 do
		if eg:IsExists(s.cfilter,1,nil,p) then
			local e1=Effect.CreateEffect(e:GetHandler())
			e1:SetType(EFFECT_TYPE_FIELD)
			e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
			e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
			e1:SetTargetRange(1,0)
			e1:SetTarget(s.splimit)
			e1:SetReset(RESET_PHASE+PHASE_END)
			Duel.RegisterEffect(e1,p)
		end
	end
end
function s.splimit(e,c)
	return c:IsCode(id) and c:IsLocation(LOCATION_EXTRA)
end
function s.mfilter(c)
	return c:IsSetCard(0x8d)
end
function s.smfilter(c)
	return c:IsSetCard(0x8d) and c:IsFacedown()
end
function s.XyzCondition(f,lv,minct,maxct,alterf,alterdesc,alterop)
  return  function(e,c,og,min,max)
      if c==nil then return true end
      if c:IsType(TYPE_PENDULUM) and c:IsFaceup() then return false end
      local tp=c:GetControler()
      local mg=nil
      if og then
        mg=og
      else
        mg=Duel.GetFieldGroup(tp,LOCATION_MZONE,0)
      end
      if alterf and (not min or min<=1) then
        if mg:IsExists(s.XyzAlterFilter,1,nil,alterf,c,e,tp,alterop) then
          return true
        end
      end
      local minc=minct
      local maxc=maxct
      if min then
        if min>minc then minc=min end
        if max<maxc then maxc=max end
      end
      if minct>=3 and mg:IsExists(s.Xyz2XMaterialEffectFilter,1,nil,c,lv,f,tp) then
        return s.CheckXyz2XMaterial(c,f,lv,minc,maxc,mg)
      else
        if minc>maxc then return false end
        return Duel.CheckXyzMaterial(c,f,lv,minc,maxc,og)
      end
    end
end
function s.Xyz2XMaterialFilter(c,xyzc,lv,f)
  return c:IsFaceupEx() and c:IsCanBeXyzMaterial(xyzc) and c:IsXyzLevel(xyzc,lv) and (not f or f(c,xyzc))
end
function s.Xyz2XMaterialEffectFilter(c,xyzc,lv,f,tp,checked)
  if not checked and not s.Xyz2XMaterialFilter(c,xyzc,lv,f) then return false end
  local e=c:IsHasEffect(EFFECT_DOUBLE_XMATERIAL,tp)
  if not e then return false end
  local tg=e:GetTarget()
  if tg and not tg(e,xyzc,tp) then return false end
  return true
end
function s.Xyz2XMaterialGoal(g,tp,xyzc,minc)
  if Duel.GetLocationCountFromEx(tp,tp,g,xyzc)<=0 then return false end
  local lg=g:Filter(Card.IsHasEffect,nil,EFFECT_XYZ_MIN_COUNT,tp)
  for c in s.Next(lg) do
    local le=c:IsHasEffect(EFFECT_XYZ_MIN_COUNT)
    local ct=le:GetValue()
    if #g<ct then return false end
  end
  local ct2=0
  local limit_table={}
  for c in s.Next(g) do
    local le=c:IsHasEffect(EFFECT_DOUBLE_XMATERIAL,tp)
    if le then
      local tg=le:GetTarget()
      local limit_value=le:GetValue() -- not fully implemented: assuming Hard once per turn effects
      if (not tg or tg(le,xyzc,tp)) and (not limit_value or not limit_table[limit_value]) then
        ct2=ct2+1
        if limit_value then
          limit_table[limit_value]=true
        end
      end
    end
  end
  return #g+ct2>=minc
end
function s.CheckXyz2XMaterial(c,f,lv,minc,maxc,mg)
  local tp=c:GetControler()
  mg=mg:Filter(s.Xyz2XMaterialFilter,nil,c,lv,f)
  local sg=Duel.GetMustMaterial(tp,EFFECT_MUST_BE_XMATERIAL)
  if sg:IsExists(s.MustMaterialCounterFilter,1,nil,mg) then return false end
  Duel.SetSelectedCard(sg)
  s.GCheckAdditional=s.TuneMagicianCheckAdditionalXyz
  local res=mg:CheckSubGroup(s.Xyz2XMaterialGoal,2,maxc,tp,c,minc)
  s.GCheckAdditional=nil
  return res
end
function s.XyzTarget(f,lv,minct,maxct,alterf,alterdesc,alterop)
  return  function(e,tp,eg,ep,ev,re,r,rp,chk,c,og,min,max)
      if og and not min then
        return true
      end
      local minc=minct
      local maxc=maxct
      if min then
        if min>minc then minc=min end
        if max<maxc then maxc=max end
      end
      local b1=true
      local b2=false
      local altg=nil
      local mg=nil
      if og then
        mg=og
      else
        mg=Duel.GetFieldGroup(tp,LOCATION_MZONE,0)
      end
      if alterf and (not min or min<=1) then
        altg=mg:Filter(s.XyzAlterFilter,nil,alterf,c,e,tp,alterop)
        if minct>=3 and mg:IsExists(s.Xyz2XMaterialEffectFilter,1,nil,c,lv,f,tp) then
          b1=s.CheckXyz2XMaterial(c,f,lv,minc,maxc,mg)
        else
          b1=Duel.CheckXyzMaterial(c,f,lv,minc,maxc,og)
        end
        b2=#altg>0
      end
      local g=nil
      if b2 and (not b1 or Duel.SelectYesNo(tp,alterdesc)) then
        e:SetLabel(1)
        local cancel=Duel.IsSummonCancelable()
        Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_XMATERIAL)
        local tc=altg:SelectUnselect(nil,tp,false,cancel,1,1)
        if tc then
          g=Group.FromCards(tc)
          if alterop then alterop(e,tp,1,tc) end
        end
      else
        e:SetLabel(0)
        if minct>=3 and mg:IsExists(s.Xyz2XMaterialEffectFilter,1,nil,c,lv,f,tp) then
          mg=mg:Filter(s.Xyz2XMaterialFilter,nil,c,lv,f)
          local cancel=Duel.IsSummonCancelable()
          local sg=Duel.GetMustMaterial(tp,EFFECT_MUST_BE_XMATERIAL)
          Duel.SetSelectedCard(sg)
          Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_XMATERIAL)
          s.GCheckAdditional=s.TuneMagicianCheckAdditionalXyz
          g=mg:SelectSubGroup(tp,s.Xyz2XMaterialGoal,cancel,2,maxc,tp,c,minc)
          s.GCheckAdditional=nil
        else
          g=Duel.SelectXyzMaterial(tp,c,f,lv,minc,maxc,og)
        end
      end
      if g then
        g:KeepAlive()
        e:SetLabelObject(g)
        return true
      else return false end
    end
end
function s.XyzAlterFilter(c,alterf,xyzc,e,tp,alterop)
	return alterf(c,e,tp,xyzc) and c:IsFacedown()
		and c:IsType(TYPE_MONSTER)
	 	and Duel.GetLocationCountFromEx(tp,tp,c,xyzc)>0
		and not c:IsHasEffect(EFFECT_XYZ_MIN_COUNT)
		and Auxiliary.MustMaterialCheck(c,tp,EFFECT_MUST_BE_XMATERIAL) and (not alterop or alterop(e,tp,0,c))
end
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:GetHandler():CheckRemoveOverlayCard(tp,1,REASON_COST) end
	e:GetHandler():RemoveOverlayCard(tp,1,1,REASON_COST)
end
function s.spfilter(c,e,tp)
	return c:IsSetCard(0x8d) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_DECK,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,s.spfilter,tp,LOCATION_DECK,0,1,1,nil,e,tp)
		if g:GetCount()>0 then
			Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
		end
	end
	local e2=Effect.CreateEffect(e:GetHandler())
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetTargetRange(1,0)
	e2:SetTarget(s.splimit2)
	e2:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e2,tp)
end
function s.splimi2t(e,c,sump,sumtype,sumpos,targetp,se)
	return not c:IsAttribute(ATTRIBUTE_DARK)
end