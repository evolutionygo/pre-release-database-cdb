--
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=aux.AddRitualProcEqual2(c,aux.TRUE,LOCATION_GRAVE,aux.TRUE,aux.FALSE,false,s.extraop)
	e1:SetCountLimit(1,id)
	c:RegisterEffect(e1)
	--ritual
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetRange(LOCATION_GRAVE)
	e2:SetHintTiming(0,TIMINGS_CHECK_MONSTER)
	e2:SetCost(aux.bfgcost)
	e2:SetOperation(s.rlop)
	c:RegisterEffect(e2)
	if not s.globle_check then
		s.globle_check=true
		rl_ReleaseRitualMaterial=Duel.ReleaseRitualMaterial
		Duel.ReleaseRitualMaterial=function(mat)
			if mat:IsExists(Card.IsLocation,1,nil,LOCATION_GRAVE) then
				Duel.RegisterFlagEffect(tp,id+o,RESET_PHASE+PHASE_END,0,1)
			end
			rl_ReleaseRitualMaterial(mat)
		end
	end
end
function s.extraop(e,tp,eg,ep,ev,re,r,rp,tc,mat)
	if not tc then return end
	local fid=e:GetHandler():GetFieldID()
	tc:RegisterFlagEffect(id,RESET_EVENT+RESETS_STANDARD,0,1,fid)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e1:SetCode(EVENT_PHASE+PHASE_END)
	e1:SetCountLimit(1)
	e1:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
	e1:SetLabel(fid)
	e1:SetLabelObject(tc)
	e1:SetCondition(s.descon)
	e1:SetOperation(s.desop)
	Duel.RegisterEffect(e1,tp)
end
function s.descon(e,tp,eg,ep,ev,re,r,rp)
	local tc=e:GetLabelObject()
	if tc:GetFlagEffectLabel(id)~=e:GetLabel() then
		e:Reset()
		return false
	else return true end
end
function s.desop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Destroy(e:GetLabelObject(),REASON_EFFECT)
end
function s.rlop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetFlagEffect(tp,id)==0 then
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_FIELD)
		e1:SetCode(EFFECT_EXTRA_RITUAL_MATERIAL)
		e1:SetTargetRange(LOCATION_GRAVE,0)
		e1:SetCondition(s.rlcon)
		e1:SetValue(1)
		e1:SetReset(RESET_PHASE+PHASE_END)
		Duel.RegisterEffect(e1,tp)
	end
	Duel.RegisterFlagEffect(tp,id,RESET_PHASE+PHASE_END,0,1)
end
function s.rlcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.GetFlagEffect(tp,id)>Duel.GetFlagEffect(tp,id+o)
end