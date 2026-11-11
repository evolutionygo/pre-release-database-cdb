--強化反撃
local s,id,o=GetID()
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
	e1:SetHintTiming(TIMING_DAMAGE+TIMING_DAMAGE_CAL,TIMING_DAMAGE+TIMING_DAMAGE_CAL)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
	--the same activation when you take damage in the Damage Step, where free chains are not offered after the first chain
	local e2=e1:Clone()
	e2:SetCode(EVENT_DAMAGE)
	c:RegisterEffect(e2)
	if not s.global_check then
		s.global_check=true
		--each damage also as an event of its own player: Duel.CheckEvent returns only the first EVENT_DAMAGE
		local ge1=Effect.CreateEffect(c)
		ge1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
		ge1:SetCode(EVENT_DAMAGE)
		ge1:SetOperation(s.checkop)
		Duel.RegisterEffect(ge1,0)
	end
end
function s.checkop(e,tp,eg,ep,ev,re,r,rp)
	Duel.RaiseEvent(e:GetHandler(),EVENT_CUSTOM+id+ep*o,re,r,rp,ep,ev)
end
function s.damagestep()
	local ph=Duel.GetCurrentPhase()
	return ph==PHASE_DAMAGE or ph==PHASE_DAMAGE_CAL
end
--an effect that inflicts damage to you is activated: the chain link of it
function s.chk1(e,tp)
	if s.damagestep() then return false end
	local res,teg,tep,tev=Duel.CheckEvent(EVENT_CHAINING,true)
	return res and aux.damcon1(e,tp,teg,tep,tev)
end
--damage calculation of a battle between your monster and an opponent's monster
function s.chk2(tp)
	if not Duel.CheckEvent(EVENT_PRE_DAMAGE_CALCULATE) then return false end
	local a,d=Duel.GetBattleMonster(tp)
	return a and d and a:IsFaceup() and d:IsFaceup() and d:GetAttack()>0
end
--the battle or effect damage you took, 0 for none. In the Damage Step the EVENT_DAMAGE activation answers each damage
--itself; elsewhere the free chain one reads the event raised for your damage alone
function s.dam3(e,tp,ep,ev)
	if e:GetCode()==EVENT_DAMAGE then
		if s.damagestep() and ep==tp then return ev end
		return 0
	end
	if s.damagestep() then return 0 end
	local res,teg,tep,tev=Duel.CheckEvent(EVENT_CUSTOM+id+tp*o,true)
	if res then return tev end
	return 0
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
	local free=e:GetCode()~=EVENT_DAMAGE
	local b1=free and s.chk1(e,tp)
	local b2=free and s.chk2(tp)
	local dam=s.dam3(e,tp,ep,ev)
	local b3=dam>0
	if chk==0 then return b1 or b2 or b3 end
	local op=aux.SelectFromOptions(tp,
		{b1,aux.Stringid(id,1),1},
		{b2,aux.Stringid(id,2),2},
		{b3,aux.Stringid(id,3),3})
	e:SetLabel(op)
	if op==1 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_ATKCHANGE)
			e:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
		end
		local res,teg,tep,tev=Duel.CheckEvent(EVENT_CHAINING,true)
		Duel.SetTargetParam(Duel.GetChainInfo(tev,CHAININFO_CHAIN_ID))
	elseif op==2 then
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_ATKCHANGE)
			e:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
		end
	else
		if e:IsCostChecked() then
			e:SetCategory(CATEGORY_DAMAGE)
			e:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL+EFFECT_FLAG_PLAYER_TARGET)
		end
		Duel.SetTargetPlayer(1-tp)
		Duel.SetTargetParam(dam)
		Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,dam)
	end
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local op=e:GetLabel()
	if op==1 then
		s.activate1(e,tp)
	elseif op==2 then
		s.activate2(e,tp)
	elseif op==3 then
		local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
		Duel.Damage(p,d,REASON_EFFECT)
	end
end
function s.activate1(e,tp)
	local c=e:GetHandler()
	--labels: the chain id of that effect, and the damage it would have dealt
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CHANGE_DAMAGE)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetLabel(Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM),0)
	e1:SetValue(s.damval)
	e1:SetReset(RESET_CHAIN)
	Duel.RegisterEffect(e1,tp)
	--the number is the damage before the effects that change it: becoming 0 comes before halving
	--or "you take no damage of X or less", and after the damage is reversed or reflected
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_REFLECT_DAMAGE)
	e3:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e3:SetTargetRange(1,0)
	e3:SetLabelObject(e1)
	e3:SetValue(s.amountval)
	e3:SetReset(RESET_CHAIN)
	Duel.RegisterEffect(e3,tp)
	--after that effect resolves, that damage becomes atk
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
	e2:SetCode(EVENT_CHAIN_SOLVED)
	e2:SetLabelObject(e1)
	e2:SetCondition(s.atkcon1)
	e2:SetOperation(s.atkop1)
	e2:SetReset(RESET_CHAIN)
	Duel.RegisterEffect(e2,tp)
end
function s.byit(cid,r)
	return Duel.GetCurrentChain()>0 and r&REASON_EFFECT>0 and Duel.GetChainInfo(0,CHAININFO_CHAIN_ID)==cid
end
--never reflects; counts the damage
function s.amountval(e,re,val,r,rp,rc)
	local le=e:GetLabelObject()
	local cid,sum=le:GetLabel()
	if s.byit(cid,r) then le:SetLabel(cid,sum+val) end
	return false
end
function s.damval(e,re,val,r,rp,rc)
	local cid=e:GetLabel()
	if not s.byit(cid,r) then return val end
	return 0
end
function s.atkcon1(e,tp,eg,ep,ev,re,r,rp)
	local cid,sum=e:GetLabelObject():GetLabel()
	return Duel.GetChainInfo(ev,CHAININFO_CHAIN_ID)==cid and sum>0
end
function s.atkop1(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local _,val=e:GetLabelObject():GetLabel()
	local g=Duel.GetMatchingGroup(Card.IsFaceup,tp,LOCATION_MZONE,0,nil)
	if #g==0 then return end
	Duel.Hint(HINT_CARD,0,id)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
	local tc=g:Select(tp,1,1,nil):GetFirst()
	Duel.HintSelection(Group.FromCards(tc))
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetCode(EFFECT_UPDATE_ATTACK)
	e1:SetValue(val)
	e1:SetReset(RESET_EVENT+RESETS_STANDARD)
	tc:RegisterEffect(e1)
end
function s.activate2(e,tp)
	local a,d=Duel.GetBattleMonster(tp)
	if a and d and a:IsFaceup() and a:IsRelateToBattle() and d:IsFaceup() and d:IsRelateToBattle() then
		local e1=Effect.CreateEffect(e:GetHandler())
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_ATTACK)
		e1:SetValue(d:GetAttack())
		e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_DAMAGE_CAL)
		a:RegisterEffect(e1)
	end
end
