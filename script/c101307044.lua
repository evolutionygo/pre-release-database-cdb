--高嶺の天仙カリン
if not CATEGORY_DECK_SPSUMMON then
	CATEGORY_DECK_SPSUMMON=0x800000000
end
local s,id,o=GetID()
function s.initial_effect(c)	--xyz summon
	aux.AddXyzProcedure(c,nil,7,2)
	c:EnableReviveLimit()
	--disable
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,1))
	e1:SetCategory(CATEGORY_DISABLE+CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_QUICK_O)
	e1:SetCode(EVENT_CHAINING)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCountLimit(1,id)
	e1:SetCondition(s.discon)
	e1:SetCost(s.discost)
	e1:SetTarget(s.distg)
	e1:SetOperation(s.disop)
	c:RegisterEffect(e1)
	--to deck
	local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_TOEXTRA+CATEGORY_TOHAND)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.tdcon)
	e2:SetTarget(s.tdtg)
	e2:SetOperation(s.tdop)
	c:RegisterEffect(e2)
	if not s.global_check then
		s.global_check=true
		local SST_IsCanBeSpecialSummoned=Card.IsCanBeSpecialSummoned
		function Card.IsCanBeSpecialSummoned(card,e,sum,tp,bool1,bool2,pos,sp,zone)
			if card:IsLocation(LOCATION_DECK) then
				e:GetHandler():RegisterFlagEffect(id,RESET_CHAIN,0,1)
			end
			if not zone then
				if not sp then
					if not pos then
						return SST_IsCanBeSpecialSummoned(card,e,sum,tp,bool1,bool2)
					else
						return SST_IsCanBeSpecialSummoned(card,e,sum,tp,bool1,bool2,pos)
					end
				else
					return SST_IsCanBeSpecialSummoned(card,e,sum,tp,bool1,bool2,pos,sp)
				end
			else
				return SST_IsCanBeSpecialSummoned(card,e,sum,tp,bool1,bool2,pos,sp,zone)
			end
		end
		local SST_IsExistingMatchingCard=Duel.IsExistingMatchingCard
		function Duel.IsExistingMatchingCard(f,tp,s,o,ct,cg,...)
			if s&LOCATION_DECK==LOCATION_DECK then
				local res=SST_IsExistingMatchingCard(f,tp,LOCATION_DECK,o,ct,cg,...)
				if res then return res end
			end
			SST_IsExistingMatchingCard(f,tp,s,o,ct,cg,...)
		end
	end
end
function s.discon(e,tp,eg,ep,ev,re,r,rp)
	local ex=re:IsHasCategory(CATEGORY_DECK_SPSUMMON)
	return not e:GetHandler():IsStatus(STATUS_BATTLE_DESTROYED)
		and ep~=tp and Duel.IsChainDisablable(ev)
		and (ex or re:GetHandler():GetFlagEffect(id)>0)
end
function s.discost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:GetHandler():CheckRemoveOverlayCard(tp,1,REASON_COST) end
	e:GetHandler():RemoveOverlayCard(tp,1,1,REASON_COST)
end
function s.distg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsPlayerCanDraw(1-tp,1) end
	Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
end
function s.disop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.Draw(1-tp,1,REASON_EFFECT)==1
		and Duel.NegateEffect(ev) and re:GetHandler():IsRelateToChain(ev) then
		Duel.Destroy(eg,REASON_EFFECT)
	end
end
function s.tdcon(e,c,tp,st)
	if bit.band(st,SUMMON_TYPE_LINK)~=SUMMON_TYPE_LINK then return true end
	return Duel.GetCurrentPhase()==PHASE_MAIN2
end
function s.tdfilter(c)
	return c:IsLevel(7) and not c:IsAttack(0) and c:IsAbleToHand()
end
function s.tdtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	local c=e:GetHandler()
	if chkc then return chkc:IsLocation(LOCATION_GRAVE) and chkc:IsControler(tp) and s.tdfilter(chkc) end
	if chk==0 then return Duel.IsExistingTarget(s.tdfilter,tp,LOCATION_GRAVE,0,1,e:GetHandler()) and c:IsAbleToHand() end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
	local g=Duel.SelectTarget(tp,s.tdfilter,tp,LOCATION_GRAVE,0,1,1,nil)
	local tc=g:GetFirst()
	g:AddCard(c)
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,g,2,0,0)
	Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,tc:GetBaseAttack())
end
function s.tdop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToChain()
		and Duel.Damage(tp,tc:GetBaseAttack(),REASON_EFFECT)~=0
		and c:IsRelateToChain() and c:IsLocation(LOCATION_ONFIELD) and aux.NecroValleyFilter()(tc) then
		local g=Group.FromCards(c,tc)
		Duel.SendtoHand(g,nil,REASON_EFFECT)
	end
end