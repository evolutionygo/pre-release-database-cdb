#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
效果标记一致性检查：script 的 aux.Stringid(id, n) 编号 与 cdb texts.str{n+1} 文案

为什么要有这个检查：客户端把通讯里的 desc（= code*16 + n）低 4 位 n 直接当作
「卡面效果段落的文档序」，命中第 n 段后打可发动呼吸高亮 / 已发动绿红勾。
所以 n 写错 = 标记打错段落；str{n+1} 缺失 = 客户端显示 unknown 文案。

规则来源：AGENTS.md「编写脚本流程」规则 7、规则 8 + 以下三条定案约定：
  · n 必须等于该效果在卡面上的段落文档序（不能按「带描述效果」从 0 顺序编号）；
  · 一个发动段只能由一个发动效果占有（同一时点复制/Clone 除外），多余的改用让位编号 ≥ 段落数；
  · 永不进链的适用型判定与本家发动不该占用段落编号槽（同理让位）。

用法：
  python3 ci/effect_mark_check.py                       # 检查本次改动涉及的卡（CI 用）
  python3 ci/effect_mark_check.py --all                 # 检查全部卡池
  python3 ci/effect_mark_check.py IMPH.cdb:101307001    # 指定 cdb 与卡号
  python3 ci/effect_mark_check.py --base <ref> --format md --report mark-consistency.md

退出码：0 通过；1 存在 error 级问题；2 环境/用法错误。
"""
import argparse
import collections
import io
import os
import re
import sqlite3
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT_DIR = os.path.join(ROOT, "script")
STRMAX = 16
ACT_KW = re.compile(r"发动|発動|발동")
# 强发动句：卡面该段确实描述一个可发动的效果（而不是「不受对方发动的效果影响」这类叙述）
ACT_STRONG = re.compile(
    r"才能发动|可以发动|能发动|时发动|场合发动|结束时发动|把以下效果发动|以下效果发动"
    r"|选择1个发动|把这个效果发动|可以发动以下效果|能进行1次|才能进行"
    r"|発動できる|発動するものができる|할 수 있다")
SELF_ACT = re.compile(r"把这张卡发动|这张卡的发动|作为这张卡的发动|才能把这张卡发动")
ACTIVE_TOK = ("EFFECT_TYPE_IGNITION", "EFFECT_TYPE_TRIGGER_O", "EFFECT_TYPE_TRIGGER_F",
              "EFFECT_TYPE_QUICK_O", "EFFECT_TYPE_QUICK_F")
APPLICATOR_TOK = ("EFFECT_TYPE_FIELD", "EFFECT_TYPE_CONTINUOUS", "EFFECT_TYPE_EQUIP",
                  "EFFECT_TYPE_TARGET")
DIVIDERS = "-—–─━═=_~〜·*"
BULLETS = "●○◦・–—▪‣•◆◇■"

RULE_DOC = [
    ("E1", "发动型效果（IGNITION / TRIGGER_O / TRIGGER_F / QUICK_O / QUICK_F）必须有 SetDescription"),
    ("E2", "SetDescription 的编号 n 必须等于该效果在卡面上的段落文档序，不能落在非发动段"),
    ("E3", "同一发动段号只能由一个发动效果占有（同一时点复制/Clone 除外），多余的改用让位编号"),
    ("E4", "发动效果编号落在段落数以外、而卡面还有没被占用的发动段 → 漏标"),
    ("E5", "编号不得超过 15（cdb 只有 str1..str16）"),
    ("E6", "用到 aux.Stringid(id,n) 时 texts.str{n+1} 不能为空，否则客户端显示 unknown"),
    ("E7", "str{k+1} 里装着别的段落 d 的文案 → 编号与文案必须对齐"),
    ("W1", "适用型判定 / 本家发动不该占用段落编号槽，应让位到 ≥ 段落数 的空闲号"),
    ("W2", "选项、确认提示等非描述 Stringid 不该与发动段争用同一个 str 槽"),
    ("N1", "卡面没有 ①②③ 圈序号时客户端分段不可靠，标记无法显示（仅提示）"),
]

# ─────────────────────────────── 分段（与客户端 EffectParagraphs 一致） ───────────────────────────────


def circled(t):
    if not t:
        return -1
    c = ord(t[0])
    return c - 0x2460 if 0x2460 <= c <= 0x2473 else -1


def is_divider(t):
    return bool(t) and all(c in DIVIDERS for c in t)


def is_frame_title(t):
    return circled(t) < 0 and ("【" in t or "[" in t)


def paragraphs(desc):
    """返回 (段落列表, 框标题数, 是否带圈序号)。段落 = {doc,anchor,frame,first,text,activation}"""
    lines = (desc or "").replace("\r\n", "\n").split("\n")
    numbered = any(circled(l.strip()) >= 0 for l in lines)
    paras = []
    doc = para = -1
    seq = frame = 0
    first_title = pending = -1
    for i, raw in enumerate(lines):
        t = raw.strip()
        if is_divider(t):
            if para >= 0 and pending < 0:
                pending = i
            continue
        ci = circled(t)
        if ci < 0 and is_frame_title(t):
            frame += 1
            if frame == 1:
                first_title = i
            if frame >= 2:
                para = -1
            pending = -1
            continue
        if pending >= 0:
            if frame >= 2 and pending > first_title:
                para = -1
            pending = -1
        anchor = -1
        if ci >= 0:
            anchor, seq = ci, ci + 1
        elif not numbered and t and t[0] in BULLETS:
            anchor = seq
            seq += 1
        if anchor >= 0:
            doc += 1
            para = doc
            paras.append({"doc": doc, "anchor": anchor, "frame": frame,
                          "first": t, "text": t})
        elif para >= 0:
            paras[doc]["text"] += t
    for p in paras:
        p["activation"] = bool(ACT_KW.search(p["text"]))
        p["strong"] = bool(ACT_STRONG.search(p["text"]))
    return paras, frame, numbered


def norm(s):
    return re.sub(r"[\s，。、；：（）()「」『』·…\-—~～_＝=＊*＃#]+", "", s or "").lower()


# ─────────────────────────────── 脚本解析 ───────────────────────────────

RE_INIT = re.compile(r"function\s+[\w:]+\.initial_effect\s*\(\s*c\s*\)")
RE_CREATE = re.compile(r"local\s+(\w+)\s*=\s*(?:Effect\.CreateEffect\s*\(|(\w+)\s*:\s*Clone\s*\()")
RE_SID_SD = re.compile(r"(\w+)\s*:SetDescription\(\s*aux\.Stringid\s*\(\s*([\w.]+)\s*,\s*(\d+)\s*\)")
RE_SID_ANY = re.compile(r"aux\.Stringid\s*\(\s*([\w.]+)\s*,\s*(\d+)\s*\)")


def line_of(src, idx):
    return src[:idx].count("\n") + 1


def parse_script(src):
    m = RE_INIT.search(src)
    start = m.end() if m else 0
    marks = [(mm.group(1), mm.start(), bool(mm.group(2)))
             for mm in RE_CREATE.finditer(src) if mm.start() >= start]
    effects = []
    for i, (var, st, cloned) in enumerate(marks):
        en = marks[i + 1][1] if i + 1 < len(marks) else len(src)
        seg = src[st:en]

        def field(name):
            x = re.search(var + r"\s*:Set" + name + r"\s*\(\s*([^\r\n)]+)", seg)
            return x.group(1).strip() if x else ""

        d = re.search(var + r"\s*:SetDescription\(\s*aux\.Stringid\s*\(\s*([\w.]+)\s*,\s*(\d+)\s*\)", seg)
        cm = ""
        for ln in reversed(src[:st].rstrip().split("\n")[-3:]):
            ln = ln.strip()
            if ln.startswith("--"):
                cm = ln[2:].strip()
                break
            if ln:
                break
        effects.append({
            "var": var, "order": i, "cloned": cloned,
            "offset": int(d.group(2)) if d else None,
            "offset_line": line_of(src, st + d.start(2)) if d else 0,
            "line": line_of(src, st),
            "type": field("Type"),
            "range": field("Range"),
            "category": field("Category"),
            "code": field("Code"),
            "comment": cm,
            "has_ct": bool(re.search(var + r"\s*:Set(Cost|Target)\s*\(", seg)),
            "dyn_desc": bool(re.search(var + r"\s*:SetDescription\s*\(", seg)) and not d,
        })
    sites = []
    for mm in RE_SID_SD.finditer(src):
        sites.append({"offset": int(mm.group(3)), "sd": True,
                      "line": line_of(src, mm.start()), "var": mm.group(1)})
    for mm in RE_SID_ANY.finditer(src):
        ln = line_of(src, mm.start())
        if any(s["sd"] and s["line"] == ln for s in sites):
            continue
        sites.append({"offset": int(mm.group(2)), "sd": False, "line": ln, "var": None})
    return effects, sites


def is_active(e):
    return any(tok in e["type"] for tok in ACTIVE_TOK)


def is_self_activate(e):
    return "EFFECT_TYPE_ACTIVATE" in e["type"]


def is_applicator(e):
    """适用型判定：不是发动型也不是本家发动，且 SetCode 是持续适用的 EFFECT_ 码
    （不是 EVENT_ 事件码）。EVENT_ + CONTINUOUS 这类“每次…放置指示物”的登记适用
    不进链、也不能被标记，报让位只是噪声，所以不归进来。"""
    if is_active(e) or is_self_activate(e):
        return False
    cod = e["code"] or ""
    if not cod.startswith("EFFECT_"):
        return False
    return not any(x in cod for x in ("SPSUMMON_PROC", "SUMMON_PROC",
                                      "EXTRA_SUMMON_COUNT", "SPSUMMON_OPTIMIZE"))


# ─────────────────────────────── 关键字证据 ───────────────────────────────

CAT_TERMS = [
    ("CATEGORY_SPECIAL_SUMMON", [("特殊召唤", 3)]),
    ("CATEGORY_SUMMON", [("召唤", 2)]),
    ("CATEGORY_TOHAND", [("加入手卡", 3), ("手卡", 1)]),
    ("CATEGORY_DRAW", [("抽", 3)]),
    ("CATEGORY_DESTROY", [("破坏", 3)]),
    ("CATEGORY_NEGATE", [("无效", 3)]),
    ("CATEGORY_TOGRAVE", [("送去墓地", 2), ("墓地", 2)]),
    ("CATEGORY_REMOVE", [("除外", 3)]),
    ("CATEGORY_TODECK", [("回到", 2), ("卡组", 2)]),
    ("CATEGORY_DECKDES", [("卡组", 3)]),
    ("CATEGORY_DECKSHUFFLE", [("洗切", 3)]),
    ("CATEGORY_DAMAGE", [("伤害", 3)]),
    ("CATEGORY_RECOVER", [("回复", 3), ("基本分", 1)]),
    ("CATEGORY_CONTROL", [("控制权", 3)]),
    ("CATEGORY_EQUIP", [("装备", 3)]),
    ("CATEGORY_TOKEN", [("衍生物", 3)]),
    ("CATEGORY_SSET", [("盖放", 3), ("覆盖", 2)]),
    ("CATEGORY_POSITION", [("表示形式", 3), ("守备表示", 2), ("攻击表示", 2), ("里侧", 2)]),
    ("CATEGORY_ATKCHANGE", [("攻击力", 3)]),
    ("CATEGORY_DEFCHANGE", [("守备力", 3)]),
    ("CATEGORY_COUNTER", [("指示物", 3)]),
    ("CATEGORY_FLIP", [("反转", 3)]),
    ("CATEGORY_SEARCH", [("卡组", 2)]),
    ("CATEGORY_TOEXTRA", [("额外卡组", 3)]),
    ("CATEGORY_HANDES", [("丢弃", 3)]),
    ("CATEGORY_FUSION_SUMMON", [("融合", 3)]),
    ("CATEGORY_SYNCHRO_SUMMON", [("同调", 3)]),
    ("CATEGORY_XYZ_SUMMON", [("超量", 3)]),
    ("CATEGORY_RITUAL_SUMMON", [("仪式", 3)]),
]
CODE_TERMS = [
    ("PHASE_END", [("结束阶段", 3)]),
    ("PHASE_STANDBY", [("准备阶段", 3)]),
    ("PHASE_BATTLE", [("战斗阶段", 3)]),
    ("PHASE_MAIN1", [("主要阶段1", 2)]),
    ("PHASE_MAIN2", [("主要阶段2", 2)]),
    ("EVENT_ATTACK_ANNOUNCE", [("攻击宣言", 3)]),
    ("EVENT_BATTLE_DESTROY", [("战斗破坏", 3)]),
    ("EVENT_DESTROYED", [("破坏", 3)]),
    ("EVENT_TO_GRAVE", [("墓地", 2)]),
    ("EVENT_LEAVE_FIELD", [("从场上离开", 3), ("离开", 1)]),
    ("EVENT_SPSUMMON_SUCCESS", [("特殊召唤", 3)]),
    ("EVENT_SUMMON_SUCCESS", [("召唤成功", 3)]),
    ("EVENT_FLIP", [("反转", 3)]),
    ("EVENT_CHAINING", [("发动", 2), ("连锁", 2)]),
    ("MATERIAL_CUSTOM", [("素材", 3)]),
    ("DOUBLE_XMATERIAL", [("素材", 3)]),
    ("ADD_EXTRA_TRIBUTE", [("解放", 3)]),
]
LOC_TERMS = [
    ("LOCATION_HAND", [("手卡", 2)]),
    ("LOCATION_GRAVE", [("墓地", 2)]),
    ("LOCATION_DECK", [("卡组", 2)]),
    ("LOCATION_REMOVED", [("除外", 2)]),
    ("LOCATION_EXTRA", [("额外卡组", 2)]),
    ("LOCATION_PZONE", [("灵摆区域", 3)]),
    ("LOCATION_SZONE", [("魔法与陷阱区域", 2)]),
    ("LOCATION_FZONE", [("场地区域", 2), ("场地魔法", 2)]),
]
CMT_TERMS = dict([
    ("spsummon", ("特殊召唤", 3)), ("special", ("特殊召唤", 3)),
    ("summon", ("召唤", 2)), ("search", ("卡组", 2)),
    ("tohand", ("加入手卡", 3)), ("hand", ("手卡", 2)),
    ("draw", ("抽", 3)), ("destroy", ("破坏", 3)),
    ("negate", ("无效", 3)), ("disable", ("无效", 3)),
    ("banish", ("除外", 3)), ("remove", ("除外", 3)),
    ("tograve", ("墓地", 2)), ("grave", ("墓地", 2)),
    ("todeck", ("卡组", 3)), ("deck", ("卡组", 2)),
    ("equip", ("装备", 3)), ("token", ("衍生物", 3)),
    ("set", ("盖放", 3)), ("counter", ("指示物", 3)),
    ("lv", ("等级", 3)), ("level", ("等级", 3)),
    ("atk", ("攻击力", 3)), ("def", ("守备力", 3)),
    ("flip", ("反转", 3)), ("pos", ("表示形式", 3)),
    ("position", ("表示形式", 3)), ("material", ("素材", 3)),
    ("return", ("回到", 2)), ("move", ("移动", 3)),
    ("scale", ("刻度", 3)), ("name", ("卡名", 3)),
    ("immune", ("不受", 3)), ("indes", ("不会被", 3)),
    ("tribute", ("解放", 3)), ("handes", ("丢弃", 3)),
    ("discard", ("丢弃", 3)), ("recover", ("回复", 3)),
    ("damage", ("伤害", 3)), ("control", ("控制权", 3)),
    ("fusion", ("融合", 3)), ("synchro", ("同调", 3)),
    ("xyz", ("超量", 3)), ("link", ("连接", 3)), ("ritual", ("仪式", 3)),
])


def terms_of(e):
    out = {}
    blob = " ".join([e["category"], e["type"], e["code"], e["range"]])

    def add(lst):
        for t, w in lst:
            out[t] = max(out.get(t, 0), w)

    for tok, lst in CAT_TERMS:
        if tok in e["category"]:
            add(lst)
    for tok, lst in CODE_TERMS:
        if tok in ((e["code"] or "") + " " + (e["type"] or "")):
            add(lst)
    for tok, lst in LOC_TERMS:
        if tok in blob:
            add(lst)
    for w in re.split(r"[^a-z0-9]+", (e["comment"] or "").lower()):
        if w in CMT_TERMS:
            add([CMT_TERMS[w]])
    return out


def para_score(e, p):
    return sum(w for t, w in terms_of(e).items() if t and t in p["text"])


def frame_of_effect(e, framed):
    if not framed:
        return 0
    s = ((e["range"] or "") + " " + (e["type"] or "") + " " + (e["code"] or "")).upper()
    return 1 if "PZONE" in s else 2


def pick_paragraph(e, paras, cands, taken):
    """在候选段里挑：未被占用的发动段优先，再按关键字命中、强发动句、文档序"""
    pool = [d for d in cands if d not in taken] or list(cands)
    ranked = sorted(pool, key=lambda d: (-para_score(e, paras[d]),
                                          0 if paras[d]["strong"] else 1,
                                          0 if paras[d]["activation"] else 1, d))
    if not ranked:
        return None, 0
    return ranked[0], para_score(e, paras[ranked[0]])


# ─────────────────────────────── 单卡检查 ───────────────────────────────


def check_card(code, row, src, cdb_name):
    issues = []
    paras, frame_cnt, numbered = paragraphs(row["desc"])
    n = len(paras)
    effects, sites = parse_script(src)
    if not (row["desc"] or "").strip():
        return issues          # 无效果文本行（衍生物等），没得可校

    def add(level, tag, msg, fix, e=None, line=None, slot=None):
        issues.append({
            "level": level, "tag": tag, "card": code, "name": row["name"], "cdb": cdb_name,
            "effect": e["var"] if e else None, "offset": e["offset"] if e else None,
            "line": line if line is not None else (e["offset_line"] if e else 0),
            "msg": msg, "fix": fix, "str_slot": slot,
        })

    act = [e for e in effects if (is_active(e) or is_self_activate(e)) and not e["cloned"]]
    cloned_act = [e for e in effects if e["cloned"] and (is_active(e) or is_self_activate(e))]

    if not numbered:
        add("info", "N1",
            ("卡面没有 ①②③ 圈序号（按 ● 分段不可靠），客户端的效果标记位置不肯定"
             if paras else
             "卡面既没有 ①②③ 圈序号也没有 ● 分行，客户端分不出段，效果标记不会显示"),
            "新卡建议按官方规范写成「①：…\\n②：…」；老文本可忽略本提示", None, 1)
        for s in sites:
            if s["offset"] < STRMAX and not (row["strs"][s["offset"]] or "").strip():
                add("error", "E6",
                    "aux.Stringid(id,%d) 没有对应文案，客户端会显示 unknown" % s["offset"],
                    "在 %s 的 texts.str%d 写入该效果/选项的提示文字" % (cdb_name, s["offset"] + 1),
                    None, s["line"], s["offset"] + 1)
        return issues
    if n > STRMAX:
        add("error", "E5", "卡面效果段落 %d 段，超过 str1..str16 上限，编号无法全部落地" % n,
            "确认段落划分是否过细；编号只能用到 15", None, 1)
        return issues

    framed = frame_cnt >= 2
    by_frame = collections.defaultdict(list)
    for p in paras:
        by_frame[p["frame"] if framed else 0].append(p["doc"])
    A = set(d for d in range(n) if paras[d]["activation"])
    used_offset = collections.Counter(e["offset"] for e in effects
                                       if e["offset"] is not None)
    # movers：注定要搬走的发动型效果（现号落在非发动段）；occupied：不需搬走的效果已占的段号
    movers = set()
    for e in effects:
        o = e["offset"]
        if o is None or o >= n or is_self_activate(e):
            continue
        if (is_active(e)) and not paras[o]["activation"]:
            movers.add(id(e))
    occupied = set()
    for e in effects:
        if id(e) in movers:
            continue
        o = e["offset"]
        if o is not None and o < n:
            occupied.add(o)

    # 预跑一遗：先给每个 mover 挑目标段，得到的 wanted 集合用于判断
    # 「本家发动占用某段」是否真的抢了别的效果的位置
    mover_target = {}
    for e in effects:
        if id(e) not in movers:
            continue
        fr = frame_of_effect(e, framed)
        docs = by_frame.get(fr) or list(range(n))
        cands = [d for d in docs if paras[d]["activation"] and d != e["offset"]]
        t, sc = pick_paragraph(e, paras, cands, occupied - {e["offset"]})
        mover_target[id(e)] = (t, sc)
    wanted = set(t for t, sc in mover_target.values() if t is not None and sc > 0)
    self_no_desc = [e for e in effects if is_self_activate(e) and e["offset"] is None]

    # 发动段互斥预处理：同一个发动段号被多条语义不同的效果共用时，
    # 只报 1 条 error：关键字证据最强的一条留下，其余给出应改的去向
    conflict = {}
    for o in sorted(set(e["offset"] for e in act + cloned_act
                        if e["offset"] is not None and e["offset"] < n)):
        grp = [e for e in act + cloned_act if e["offset"] == o]
        if len(grp) < 2 or not paras[o]["activation"]:
            continue
        # 同一时点复制（Clone 且事件码相同）就是同一编号效果，合法共享
        if all(g["cloned"] for g in grp[1:]) and all(
                (g["code"] or "") == (grp[0]["code"] or "") for g in grp[1:]):
            continue
        # 谁留在本段：用「本段得分 - 其他发动段最高得分」最大的那条（即只有它最能归这一段）
        scored = []
        for g in grp:
            here = para_score(g, paras[o])
            others = [d for d in (by_frame.get(frame_of_effect(g, framed)) or list(range(n)))
                      if d in A and d != o]
            best_other = max([para_score(g, paras[d]) for d in others] or [0])
            scored.append((here - best_other, here, g, others))
        scored.sort(key=lambda x: (-x[0], -x[1], x[2]["order"]))
        keep = scored[0][2]
        hi0 = next((k for k in range(n, STRMAX) if k not in used_offset), None)
        placed = {o}
        for _margin, _here, g, others in scored:
            if g is keep:
                continue
            t, sc = pick_paragraph(g, paras, [d for d in others if d not in placed], set())
            if t is not None:
                placed.add(t)
            hi = next((k for k in range(n, STRMAX)
                       if k not in used_offset and k not in placed), hi0)
            conflict[id(g)] = (keep, o, t, sc, hi)

    # 规则 7：发动型必须有 SetDescription
    for e in effects:
        if is_active(e) and not e["cloned"] and e["offset"] is None and not e["dyn_desc"]:
            fr = frame_of_effect(e, framed)
            cands = by_frame.get(fr) or list(range(n))
            t, sc = pick_paragraph(e, paras, [d for d in cands if d in A], occupied)
            add("error", "E1", "发动型效果 %s 没有 SetDescription（规则 7），标记与连锁文案都取不到段落"
                % e["var"],
                "加一行 %s:SetDescription(aux.Stringid(id,%s))%s" % (
                    e["var"], t if t is not None else "N",
                    "   # 对应「%s」" % paras[t]["first"][:26] if t is not None else ""),
                e, e["line"])

    for e in act + cloned_act:
        o = e["offset"]
        if o is None:
            continue
        fr = frame_of_effect(e, framed)
        docs = by_frame.get(fr) or list(range(n))
        A_here = [d for d in docs if d in A]
        self_act = is_self_activate(e)
        if o >= STRMAX:
            add("error", "E5", "%s 的编号 %d 超出 str16 槽上限" % (e["var"], o),
                "改用 0..15 的编号", e)
            continue
        if o < n:
            p = paras[o]
            if self_act:
                if SELF_ACT.search(p["text"]) or p["strong"] or o not in wanted:
                    # ① 就是本卡发动的写法（通常魔法/速攻魔法/反击陷阱），或没人跟它抢 → 正解
                    continue
                hi = next((k for k in range(n, STRMAX) if k not in used_offset), None)
                who = [x["var"] for x in effects if id(x) in movers
                       and mover_target.get(id(x), (None, 0))[0] == o]
                add("warn", "W1",
                    "%s 是本家发动，但编号 %d 占的是第%d段「%s」，而该段其实是 %s 的效果"
                    % (e["var"], o, o, p["first"][:24], "/".join(who)),
                    ("让位：%s:SetDescription(aux.Stringid(id,%d))，并把 %s 的 texts.str%d 搬到 str%d"
                     % (e["var"], hi, cdb_name, o + 1, hi + 1)) if hi is not None
                    else "str 槽已用满，需人工安排", e, slot=o + 1)
                continue
            if not p["activation"]:
                t, sc = mover_target.get(id(e), (None, 0))
                alt = sorted({d for d in A_here if d != t and para_score(e, paras[d]) > 0},
                             key=lambda d: -para_score(e, paras[d]))[:2]
                if t is not None and sc > 0:
                    add("error", "E2",
                        "%s 的编号 %d 指向「%s」，该段没有发动语义（召唤方法/适用效果），"
                        "标记会打在错误段落上（关键字命中 %d）" % (e["var"], o, p["first"][:28], sc),
                        "改为 %s:SetDescription(aux.Stringid(id,%d))   # 第%d段「%s」；"
                        "并把 %s 的 texts.str%d 文案搬到 str%d%s"
                        % (e["var"], t, t, paras[t]["first"][:26], cdb_name, o + 1, t + 1,
                           "（次选：%s）" % "、".join("第%d段「%s」" % (d, paras[d]["first"][:14])
                                                     for d in alt) if alt else ""), e)
                elif t is not None:
                    hi = next((k for k in range(n, STRMAX) if k not in used_offset), None)
                    add("error", "E2",
                        "%s 的编号 %d 指向「%s」，该段没有发动语义，"
                        "且本框只有候选发动段%s，证据不足" % (e["var"], o, p["first"][:28], A_here),
                        "需人工确认该效果属于哪一段（候选：%s）；若它不属于任何编号效果，"
                        "改为让位编号 SetDescription(aux.Stringid(id,%s)) 并搬 str%d→str%d"
                        % ("、".join("第%d段「%s」" % (d, paras[d]["first"][:14]) for d in A_here),
                           hi, o + 1, hi + 1) if hi is not None else "需人工确认", e)
                else:
                    hi = next((k for k in range(n, STRMAX) if k not in used_offset), None)
                    add("error", "E2",
                        "%s 的编号 %d 指向「%s」，该段没有发动语义，本框已无可用发动段"
                        % (e["var"], o, p["first"][:28]),
                        "改为让位编号 %s:SetDescription(aux.Stringid(id,%s))，并搬 str%d→str%d"
                        % (e["var"], hi, o + 1, hi + 1) if hi is not None else "str 槽已用满", e)
                continue
            continue
        # 让位号（≥n）
        if self_act:
            continue
        free_a = [d for d in A_here if used_offset[d] == 0]
        if free_a:
            t, sc = pick_paragraph(e, paras, free_a, set())
            if t is not None and sc >= 3:
                if t == 0 and len(free_a) == 1 and self_no_desc:
                    add("warn", "E4",
                        "%s 的编号 %d 落在段落数以外，而第0段「%s」没有任何效果指向它"
                        % (e["var"], o, paras[0]["first"][:26]),
                        "第0段是本卡发动处理：建议给本家发动补描述 %s:SetDescription("
                        "aux.Stringid(id,0))，而不是把 %s 拉回第0段（否则两段会用同一 str 槽）"
                        % (self_no_desc[0]["var"], e["var"]), self_no_desc[0],
                        self_no_desc[0]["line"])
                else:
                    add("warn", "E4",
                        "%s 的编号 %d 落在段落数以外（不会有任何标记），但第 %d 段「%s」没被任何发动效果指向"
                        % (e["var"], o, t, paras[t]["first"][:26]),
                        "建议 %s:SetDescription(aux.Stringid(id,%d))，并把 %s 的 texts.str%d 搬到 str%d"
                        % (e["var"], t, cdb_name, o + 1, t + 1), e)

    # 发动段互斥（每冲突只报一条，指出谁留下、谁搬家）
    for e in act + cloned_act:
        if id(e) not in conflict:
            continue
        keep, o, t, sc, hi = conflict[id(e)]
        p = paras[o]
        if t is not None and t < n:
            fix = ("第 %d 段号归 %s（这一段只有它能对上）；%s 应改用第 %d 段号「%s」："
                   "SetDescription(aux.Stringid(id,%d))，并把 %s 的 texts.str%d 搬到 str%d"
                   % (o, keep["var"], e["var"], t, paras[t]["first"][:22], t, cdb_name,
                      o + 1, t + 1))
        elif hi is not None:
            fix = ("第 %d 段号归 %s（关键字更吻合）；%s 没有对应的发动段，"
                   "改用让位号 SetDescription(aux.Stringid(id,%d))，并把 texts.str%d 搬到 str%d"
                   % (o, keep["var"], e["var"], hi, o + 1, hi + 1))
        else:
            fix = "第 %d 段号归 %s；%s 需重新安排编号（str 槽已满）" % (o, keep["var"], e["var"])
        add("error", "E3",
            "%s 与 %s 共用编号 %d（第%d段「%s」）：两段不同效果会被标到同一段"
            % (keep["var"], e["var"], o, o, p["first"][:24]), fix, e,
            line=e["offset_line"], slot=o + 1)

    # 适用型不占段落号：它们永不进链，却把段号握着（与真效果争用时另由 E3 报 error）。
    # 召唤规程类（SPSUMMON_PROC / EXTRA_SUMMON_COUNT）例外：它们就是卡面那行特殊召唤
    # 方法的实现，需要描述才能在命令选项上高亮，已在 is_applicator 里排除。
    for e in effects:
        if e["offset"] is None or e["offset"] >= n:
            continue
        if not is_applicator(e):
            continue
        hi = next((k for k in range(n, STRMAX) if k not in used_offset), None)
        who = [x["var"] for x in effects if id(x) in movers
               and mover_target.get(id(x), (None, 0))[0] == e["offset"]]
        add("warn", "W1",
            "%s 是适用型判定（%s），永不进链，却占用第 %d 段编号%s" % (
                e["var"], (e["code"] or e["type"])[:30], e["offset"],
                "，而该段其实是 %s 的效果" % "/".join(who) if who else ""),
            "让位：%s:SetDescription(aux.Stringid(id,%s))，并把 %s 的 texts.str%d 搬到 str%s"
            % (e["var"], hi, cdb_name, e["offset"] + 1, hi + 1) if hi is not None
            else "str 槽已用满，需人工安排", e, slot=e["offset"] + 1)

    # 规则 8：str 非空 + 文案归属
    for s in sites:
        o = s["offset"]
        if o >= STRMAX:
            add("error", "E5", "aux.Stringid(id,%d) 超出 str1..str16" % o,
                "改用 ≤15 的编号", None, s["line"])
            continue
        val = (row["strs"][o] or "").strip()
        if not val:
            who = "（第 %d 段：%s）" % (o, paras[o]["first"][:24]) if o < n else ""
            add("error", "E6",
                "aux.Stringid(id,%d) 的 texts.str%d 为空，客户端显示 unknown%s" % (o, o + 1, who),
                "在 %s 的 texts.str%d 写入%s" % (
                    cdb_name, o + 1,
                    "「%s」或该效果的动作摘要" % paras[o]["first"][:28] if o < n else "对应提示文字"),
                    None, s["line"], o + 1)
            continue
        if o < n and len(norm(val)) >= 6 and norm(val) not in norm(paras[o]["text"]):
            hits = [d for d in range(n) if d != o and norm(val) in norm(paras[d]["text"])]
            if len(hits) == 1:
                d = hits[0]
                add("error", "E7",
                    "texts.str%d 的文案「%s」其实是第 %d 段「%s」的内容"
                    % (o + 1, val[:24], d, paras[d]["first"][:24]),
                    "把 str%d 文案搬到 str%d；若是编号写错，则把对应效果的编号由 %d 改为 %d"
                    % (o + 1, d + 1, o, d), None, None, o + 1)
    # 提示位点与发动段争用同一个 str 槽
    for s in sites:
        if s["sd"] or s["offset"] >= n:
            continue
        o = s["offset"]
        if used_offset[o] and (row["strs"][o] or "").strip():
            if norm(row["strs"][o]) in norm(paras[o]["text"]):
                continue
            hi = next((k for k in range(n, STRMAX) if k not in used_offset), None)
            add("warn", "W2",
                "第 %d 行 aux.Stringid(id,%d) 与发动效果的描述争用同一个 texts.str%d 槽" % (
                    s["line"], o, o + 1),
                "把该提示编号迁到 ≥%d 的空闲号（%s），并同步搬运文案" % (n, hi)
                if hi is not None else "str 槽已满，需人工安排", None, s["line"], o + 1)
    return issues


# ─────────────────────────────── cdb / git ───────────────────────────────


def read_cards(path, ids=None):
    db = sqlite3.connect(path)
    q = ("select d.id, t.name, t.\"desc\", " +
         ", ".join("t.str%d" % i for i in range(1, STRMAX + 1)) +
         ", d.type, d.alias from datas d left join texts t on t.id=d.id")
    try:
        rows = db.execute(q).fetchall()
    finally:
        db.close()
    out = {}
    for r in rows:
        if ids and r[0] not in ids:
            continue
        out[r[0]] = {"name": r[1] or "", "desc": r[2] or "",
                     "strs": [x if x is not None else "" for x in r[3:3 + STRMAX]],
                     "type": r[3 + STRMAX], "alias": r[4 + STRMAX] or 0}
    return out


def read_cards_blob(blob):
    tmp = os.path.join(tempfile.gettempdir(), "cdb_base_%d.cdb" % os.getpid())
    with open(tmp, "wb") as f:
        f.write(blob)
    try:
        return read_cards(tmp)
    finally:
        sqlite3.connect(tmp).close()
        os.remove(tmp)


def git_out(*args):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    return (r.stdout or "").strip() if r.returncode == 0 else None


def git_blob(*args):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def base_ref(cli_base):
    if cli_base:
        return cli_base
    for k in ("CI_MERGE_REQUEST_DIFF_BASE_SHA", "CI_COMMIT_BEFORE_SHA"):
        v = os.environ.get(k, "")
        if v and set(v) != {"0"}:
            return v
    return "HEAD~1"


def changed_targets(base):
    """({根目录 cdb 文件名: [变更卡号] 或 None}, {改了脚本的卡号})；base 取不到时返回 (None, None)

    CI 上 HEAD 就是被检查的提交；本地开发时常有未提交的修改，所以 base..HEAD 空时再补
    一次工作区 diff，避免本地跑「无改动」而误绿。
    """
    if git_blob("cat-file", "-e", "%s^{commit}" % base) is None:
        return None, None
    names = (git_out("diff", "--name-only", "--diff-filter=ACMR", "%s..HEAD" % base)
             or "").split("\n")
    names = [x.strip() for x in names if x.strip()]
    if not names:
        names = (git_out("diff", "--name-only", "--diff-filter=ACMR", base)
                 or "").split("\n")
        names += [x.strip() for x in (git_out("ls-files", "--others", "--exclude-standard")
                                      or "").split("\n") if x.strip().endswith(".cdb")]
        names = [x for x in names if x.strip()]
    cdbs, codes = [], set()
    for nm in [x.strip() for x in names if x.strip()]:
        if nm.endswith(".cdb") and "/" not in nm:
            cdbs.append(nm)
        m = re.match(r"^script/c(\d+)\.lua$", nm)
        if m:
            codes.add(int(m.group(1)))
    per = {}
    for nm in cdbs:
        cur = read_cards(os.path.join(ROOT, nm))
        blob = git_blob("show", "%s:%s" % (base, nm))
        if blob is None:
            per[nm] = None            # 新增卡池：整包都算改动
            continue
        old = read_cards_blob(blob)
        diff = set(cur) - set(old)
        diff |= set(k for k in cur if k in old and cur[k] != old[k])
        per[nm] = sorted(diff)
    return per, codes


# ─────────────────────────────── 输出 ───────────────────────────────

ORDER = {"error": 0, "warn": 1, "info": 2}


def sorted_issues(issues):
    return sorted(issues, key=lambda i: (ORDER[i["level"]], i["card"], i["line"] or 0))


def fmt_text(issues, checked, note):
    errs = [i for i in issues if i["level"] == "error"]
    warns = [i for i in issues if i["level"] == "warn"]
    infos = [i for i in issues if i["level"] == "info"]
    out = ["效果标记一致性检查：共检查 %d 张卡" % checked]
    if note:
        out.append("范围：%s" % note)
    if not issues:
        out.append("✅ 通过：SetDescription 编号 == 卡面段落文档序，"
                   "texts.str{n+1} 文案齐全且归属正确")
        return "\n".join(out)
    out.append("❌ 不符合 %d 项：error %d / warn %d / info %d"
               % (len(issues), len(errs), len(warns), len(infos)))
    for i in sorted_issues(issues):
        loc = "script/c%d.lua" % i["card"] + (":%d" % i["line"] if i["line"] else "")
        out += ["", "[%s][%s] %s (%d) @ %s" % (i["level"].upper(), i["tag"], i["name"],
                                               i["card"], loc),
                "  问题：%s" % i["msg"],
                "  建议：%s" % i["fix"]]
        if i["cdb"] and i["str_slot"]:
            out.append("  涉及：%s → texts.str%d" % (i["cdb"], i["str_slot"]))
    return "\n".join(out)


def md_table(rows):
    out = ["| 规则 | 卡号 | 卡名 | 位置 | 问题 | 建议 |", "| --- | --- | --- | --- | --- | --- |"]
    for i in rows:
        clean = lambda s: (s or "").replace("|", "/").replace("\n", " ")
        out.append("| %s | %d | %s | c%d.lua:%s | %s | %s |" % (
            i["tag"], i["card"], clean(i["name"]), i["card"], i["line"] or "-",
            clean(i["msg"]), clean(i["fix"])))
    return out


def fmt_md(issues, checked, note):
    errs = [i for i in issues if i["level"] == "error"]
    warns = [i for i in issues if i["level"] == "warn"]
    infos = [i for i in issues if i["level"] == "info"]
    md = ["## 效果标记一致性检查", "",
          "检查卡片数 **%d**；问题 **%d**（error %d / warn %d / info %d）" % (
              checked, len(issues), len(errs), len(warns), len(infos))]
    if note:
        md.append("")
        md.append("范围：%s" % note)
    md.append("")
    if not errs:
        md.append("✅ **通过**：本次改动的 `script/` 里 `aux.Stringid(id,n)` 编号与卡面效果段落"
                  "文档序一致，`.cdb` 的 `texts.str{n+1}` 文案齐全且归属正确。")
    else:
        md += ["### 必须修复（阻断合并）", ""] + md_table(errs)
    if warns:
        md += ["", "### 建议改进（不阻断）", ""] + md_table(warns)
    for i in infos:
        md += ["", "> **%s** %s(%d)：%s → %s" % (i["tag"], i["name"], i["card"],
                                                 i["msg"], i["fix"])]
    md += ["", "### 规则", ""] + ["- **%s**：%s" % (t, d) for t, d in RULE_DOC]
    return "\n".join(md)


# ─────────────────────────────── 自检 ───────────────────────────────
# 用内置卡面文本+脚本验证每条规则都能报出来，并含一个「全部正解不得报错」的对照组。
# CI 在任何实检查前先跑一次（--selftest 也可单独跑），防止规则引擎空转或被改环。

SELF_CASES = [
    ("E2-编号下移", [
        "①：对方场上的怪兽数量比自己场上的怪兽多的场合，这张卡可以从手卡特殊召唤。",
        "②：自己·对方的主要阶段，把这张卡解放才能发动。从手卡·卡组把1只「○○」怪兽特殊召唤。",
        "③：这个回合有融合怪兽被送去自己墓地的场合，结束阶段才能发动。墓地的这张卡加入手卡。",
     ], '''
function c90000001.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetRange(LOCATION_HAND)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetCost(c90000001.cost)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,2))
	e3:SetCategory(CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_PHASE+PHASE_END)
	c:RegisterEffect(e3)
end
''', ["E2"], ["e2", "1"]),
    ("E3-同段互斥", [
        "①：自己主要阶段才能发动。从卡组把1只怪兽加入手卡。",
        "②：这张卡被破坏的场合才能发动。这张卡从墓地特殊召唤。",
     ], '''
function c90000002.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,1))
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_TO_GRAVE)
	c:RegisterEffect(e2)
end
''', ["E3"], ["e1", "第 0 段号", "e2"]),
    ("E1-缺描述", [
        "①：自己主要阶段才能发动。从手卡把1只怪兽特殊召唤。",
        "②：对方把怪兽的效果发动时才能发动。那个发动无效并破坏。",
     ], '''
function c90000003.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
end
''', ["E1"], ["e1", "0"]),
    ("E6-str为空", [
        "①：以场上1只怪兽为对象才能发动。那只怪兽破坏。",
     ], '''
function c90000004.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
end
''', ["E6"], ["str1"]),
    ("E7-文案错位", [
        "①：自己主要阶段才能发动。从卡组把1只怪兽加入手卡。",
        "②：这张卡的攻击宣言时才能发动。对方场上的卡全部破坏。",
     ], '''
function c90000005.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
end
''', ["E7"], ["str2", "str1"]),
    ("E5-超出 str 上限", [
        "①：自己主要阶段才能发动。自己抽1张。",
     ], '''
function c90000006.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,20))
	e1:SetCategory(CATEGORY_DRAW)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
end
''', ["E5"], ["16"]),
    ("W1-适用型争段号", [
        "①：这张卡可以从手卡特殊召唤。",
        "②：这张卡特殊召唤的场合才能发动。从卡组把1张卡加入手卡。",
     ], '''
function c90000007.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,1))
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetCode(EFFECT_ATTACK_COST)
	e1:SetTarget(c90000007.tg)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_TOHAND)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	c:RegisterEffect(e2)
end
''', ["W1"], ["e1", "让位"]),
    ("N1-无圈序号", [
        "这张卡召唤成功时：可以从以下效果选择1个发动。",
    ], '''
function c90000008.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DRAW)
	e1:SetType(EFFECT_TYPE_IGNITION)
	c:RegisterEffect(e1)
end
''', ["N1"], ["str1"]),
    ("正解-不应报错", [
        "①：对方场上的怪兽数量比自己场上的怪兽多的场合，这张卡可以从手卡特殊召唤。",
        "②：自己·对方的主要阶段，把这张卡解放才能发动。从手卡·卡组把1只怪兽特殊召唤。",
        "③：这个回合有融合怪兽被送去自己墓地的场合，结束阶段才能发动。墓地的这张卡加入手卡。",
     ], '''
function c90000009.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetRange(LOCATION_HAND)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,2))
	e3:SetCategory(CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_PHASE+PHASE_END)
	e3:SetRange(LOCATION_GRAVE)
	c:RegisterEffect(e3)
end
''', [], []),
]


def selftest():
    """跑内置用例：用例必须能报出预期规则（正解组必须零 error）"""
    ok = True
    for idx, (title, lines, src, expect_tags, expect_words) in enumerate(SELF_CASES):
        desc = "\n".join(lines)
        row = {"name": title, "desc": desc,
               "strs": [""] * STRMAX, "type": 0x21, "alias": 0}
        paras, _fc, numbered = paragraphs(desc)
        # 默认把每段首行当文案填上（正解组、E2 组等应无 E6/E7）
        for p in paras:
            if p["doc"] < STRMAX:
                row["strs"][p["doc"]] = p["first"]
        if title.startswith("E6") or title.startswith("N1"):
            row["strs"] = [""] * STRMAX          # 规则 8 违规：str 全空
        if title.startswith("E7"):
            row["strs"] = [""] * STRMAX
            row["strs"][0] = paras[1]["first"]   # 第1段槽里装着第2段的文案
        issues = check_card(90000001 + idx, row, src, "selftest.cdb")
        tags = set(i["tag"] for i in issues)
        text = " ".join(i["msg"] + i["fix"] for i in issues)
        if title.startswith("正解"):
            bad = [i for i in issues if i["level"] == "error"]
            if bad:
                ok = False
                print("FAIL %s：正解组不应报 error，实际 %s" % (
                    title, [(i["tag"], i["msg"][:40]) for i in bad]))
            else:
                print("PASS %s：无 error%s" % (title,
                                              "（warn: %s）" % sorted(tags) if tags else ""))
            continue
        miss = [t for t in expect_tags if t not in tags]
        mword = [w for w in expect_words if w not in text]
        if miss or mword:
            ok = False
            print("FAIL %s：未命中 %s 关键词未命中 %s；实际 %s" % (title, miss, mword, sorted(tags)))
        else:
            print("PASS %s：%s" % (title, sorted(tags)))
    print("自检结果：", "全部通过" if ok else "有用例失败")
    return 0 if ok else 1


# ─────────────────────────────── 入口 ───────────────────────────────


def collect_jobs(args):
    """返回 (jobs=[(cdb 路径, 限定卡号集合或 None)], extra_codes=set(), note)"""
    jobs, codes, note = [], set(), ""
    if args.targets:
        for t in args.targets:
            nm, want = (t.split(":", 1)[0],
                        set(int(x) for x in t.split(":", 1)[1].split(",") if x.strip())) \
                if ":" in t else (t, None)
            path = os.path.join(ROOT, nm)
            if not os.path.isfile(path):
                raise SystemExit("找不到 cdb：%s" % path)
            jobs.append((path, want))
        return jobs, codes, "指定卡池"
    if args.all:
        for nm in sorted(os.listdir(ROOT)):
            if nm.endswith(".cdb") and not nm.startswith("test-"):
                jobs.append((os.path.join(ROOT, nm), None))
        return jobs, codes, "--all：全部卡池"
    base = base_ref(args.base)
    per, codes = changed_targets(base)
    if per is None:
        raise SystemExit("取不到基准 %s 的历史（浅克隆？CI 请把 GIT_DEPTH 设为 0）" % base)
    for nm, ids in per.items():
        jobs.append((os.path.join(ROOT, nm), set(ids) if ids is not None else None))
    note = "对比基准 %s；改动卡池 %d 个，改动脚本 %d 个" % (base, len(per), len(codes))
    return jobs, codes, note


def main():
    ap = argparse.ArgumentParser(description="cdb str / SetDescription 编号一致性检查")
    ap.add_argument("targets", nargs="*", help="IMPH.cdb[:id,id...]；缺省=本次改动")
    ap.add_argument("--all", action="store_true", help="检查仓库根目录全部卡池")
    ap.add_argument("--base", help="比较基准 ref")
    ap.add_argument("--format", choices=["text", "md"], default="text")
    ap.add_argument("--report", help="报告另存文件")
    ap.add_argument("--fail-on", choices=["error", "warn", "never"], default="error")
    ap.add_argument("--selftest", action="store_true", help="只跑内置规则用例")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not os.path.isdir(SCRIPT_DIR):
        print("找不到 script/（请在仓库根目录运行）", file=sys.stderr)
        return 2
    jobs, codes, note = collect_jobs(args)

    all_rows = {}
    for path, want in jobs:
        if not want:
            want = None
        for c, r in read_cards(path, want).items():
            all_rows[c] = (path, r)
    # 只改了脚本、cdb 没动的卡：回到各卡池找它的文本
    if codes:
        pool = [os.path.join(ROOT, nm) for nm in sorted(os.listdir(ROOT))
                if nm.endswith(".cdb") and not nm.startswith("test-")]
        for c in codes - set(all_rows):
            for p in pool:
                rows = read_cards(p, {c})
                if rows:
                    all_rows[c] = (p, rows[c])
                    break

    issues, checked = [], 0
    for code in sorted(all_rows):
        path, row = all_rows[code]
        sp = os.path.join(SCRIPT_DIR, "c%d.lua" % code)
        if not os.path.isfile(sp):
            sp2 = os.path.join(SCRIPT_DIR, "c%d.lua" % (row["alias"] or 0))
            if not row["alias"] or not os.path.isfile(sp2):
                continue
            sp = sp2
        with io.open(sp, encoding="utf-8", errors="replace") as f:
            src = f.read()
        checked += 1
        issues.extend(check_card(code, row, src, os.path.basename(path)))

    text = fmt_md(issues, checked, note) if args.format == "md" else \
        fmt_text(issues, checked, note)
    print(text)
    if args.report:
        with io.open(args.report, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    if args.fail_on == "never":
        return 0
    lvl = ("error", "warn") if args.fail_on == "warn" else ("error",)
    return 1 if any(i["level"] in lvl for i in issues) else 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())
