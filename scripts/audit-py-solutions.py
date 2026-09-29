# -*- coding: utf-8 -*-
"""抽 ```exercise 的参考答案并**真跑一遍**，验证 @check 期望值本身可达。

为什么需要这个：
  audit-py-syntax.py 只证明「代码能编译」，audit-py-checks.py 只统计期望值形态。
  两者都证明不了最关键的一件事——**期望值是不是真的能被跑出来**。
  如果某个练习的 @check 写错了（多一位小数、算错和、单位写反），
  学生就算写出完全正确的代码也永远通不过，而且他会以为是自己的错。

比对逻辑是 src/pyrunner/enhancer.js 的**忠实移植**（normalizeOut + sameOutput），
不是另写一套近似规则——否则审计结论不能代表线上判题行为。

配对规则：解答区必须是**紧跟**在 ```exercise 之后（中间只有空白）。
  早期的松散版用「后面第一个 <details>」，在 docs/00-python-tools/10-conventions.md
  上就配错了：练习 2「只加偶数」没有解答区，脚本却把练习 3「countdown」的解答
  配给了它，于是 checks=["2550"] 配上了 print(countdown(5)) 的代码——
  这种错配会让审计报告凭空多出一堆假问题。

用法：
  python scripts/audit-py-solutions.py [docs] [--json out.json] [--run] [--limit N]
  --run 才真执行；不加只做静态抽取统计。
"""
import io
import json
import os
import re
import subprocess
import sys
import contextlib

DOCS = 'docs'
OUT_JSON = ''
DO_RUN = False
LIMIT = 0
for a in sys.argv[1:]:
    if a == '--run':
        DO_RUN = True
    elif a.startswith('--json'):
        OUT_JSON = a.split('=', 1)[1] if '=' in a else 'py_sol.json'
    elif a.startswith('--limit'):
        LIMIT = int(a.split('=', 1)[1]) if '=' in a else 0
    elif not a.startswith('--'):
        DOCS = a

# ---- 与 enhancer.js 对应的正则 -------------------------------------------
# 收尾围栏必须容忍 CRLF —— docs/*.md 是 CRLF，写成 `^```[ \t]*$` 时
# `$` 前面那个 \r 匹配不上，整块会一路吞到下一个 LF 结尾的围栏，
# 把紧跟的 <details> 解答区一起吃掉（表现：618 个练习里 490 个「无解答区」）。
FENCE = re.compile(r'^```([A-Za-z0-9_+-]*)[^\n]*\n(.*?)^```[ \t]*\r?$', re.S | re.M)
DETAILS = re.compile(r'<details[^>]*>(.*?)</details>', re.S)
CHECK = re.compile(r'^#\s*@check:\s*(.*)$', re.M)
TITLE = re.compile(r'^#\s*@title:\s*(.*)$', re.M)
# 解答区里**可运行**的 python 块（不含 py —— py 按约定是片段，不保证能跑）
RUNNABLE = {'python', 'python3', 'exercise'}
THIRD = re.compile(r'\b(import\s+(numpy|sympy|scipy|pandas|matplotlib|sklearn|torch)|from\s+(numpy|sympy|scipy|pandas|matplotlib|sklearn|torch)\b|\bnp\.|\bplt\.)')
NEEDS_INPUT = re.compile(r'(^|[^\w.])input\s*\(')

# ---- 判题语义移植 ---------------------------------------------------------
NUM_SPLIT = re.compile(r'(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)')
NUM_ONLY = re.compile(r'^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$')
# 与 enhancer.js 的 BIG_INT 同步：16 位以上的纯整数走字符串比，
# 免得超过 2^53 的两个不同整数在 double 里变成同一个数、错答案被判对。
BIG_INT = re.compile(r'^-?\d{16,}$')
REL_TOL = 1e-9


def normalize_out(text):
    lines = [l.strip() for l in str(text).replace('\r', '').split('\n')]
    out = []
    prev_empty = False
    for l in lines:
        empty = l == ''
        if empty and prev_empty:
            continue
        out.append(l)
        prev_empty = empty
    return '\n'.join(out).strip()


def tokenize_out(s):
    return [x for x in NUM_SPLIT.split(str(s)) if x != '']


def same_output(got, want):
    if got == want:
        return True
    g, w = tokenize_out(got), tokenize_out(want)
    if len(g) != len(w):
        return False
    for a, b in zip(g, w):
        if NUM_ONLY.match(a) and NUM_ONLY.match(b):
            if BIG_INT.match(a) or BIG_INT.match(b):
                # 大整数：去前导零后精确相等（与 enhancer.js 同口径）
                if re.sub(r'^(-?)0+(?=\d)', r'\1', a) != re.sub(r'^(-?)0+(?=\d)', r'\1', b):
                    return False
                continue
            try:
                fa, fb = float(a), float(b)
            except ValueError:
                return False
            if fb != fb or fa != fa:          # NaN
                return False
            if abs(fa - fb) > abs(fb) * REL_TOL:
                return False
        elif a != b:
            return False
    return True


# ---- 抽取 ----------------------------------------------------------------
def collect():
    rows = []
    total_ex = 0
    for root, dirs, files in os.walk(DOCS):
        dirs.sort()
        for fn in sorted(files):
            if not fn.endswith('.md'):
                continue
            p = os.path.join(root, fn).replace('\\', '/')
            src = open(p, encoding='utf-8', newline='').read()
            fences = [(m.start(), m.end(), (m.group(1) or '').lower(), m.group(2))
                      for m in FENCE.finditer(src)]
            dets = [(m.start(), m.end(), m.group(1)) for m in DETAILS.finditer(src)]
            for st, en, lang, body in fences:
                if lang != 'exercise':
                    continue
                total_ex += 1
                checks = [c.strip() for c in CHECK.findall(body) if c.strip()]
                # 紧跟其后的 <details> 才算它的解答区
                nxt = next((d for d in dets if d[0] >= en), None)
                if not nxt or src[en:nxt[0]].strip() != '':
                    continue
                sols = [(l, b) for s2, e2, l, b in
                        [(m.start(), m.end(), (m.group(1) or '').lower(), m.group(2))
                         for m in FENCE.finditer(nxt[2])] if l in RUNNABLE]
                if not sols:
                    continue
                sol = max(sols, key=lambda t: len(t[1]))[1]
                tm = TITLE.search(body)
                rows.append({
                    'file': p,
                    'line': src[:st].count('\n') + 1,
                    'title': tm.group(1).strip() if tm else '',
                    'checks': checks,
                    'sol': sol,
                    # 题干脚手架：练习给学生的初始代码（含 @title/@check 注释行，
                    # 都是 # 注释，执行时无害）
                    'scaffold': body,
                    'n_blocks': len(sols),
                    'third_party': bool(THIRD.search(sol)),
                    'needs_input': bool(NEEDS_INPUT.search(sol)),
                })
    return total_ex, rows


def run_one(code, timeout=8):
    """用子进程跑，避免死循环/崩溃带走审计进程。返回 (stdout, stderr, timed_out)。

    `-X utf8` 不能省：Windows 上子进程 stdout 默认走本地 ANSI 代码页（GBK），
    解答里的中文输出会被编成 GBK 字节，再用 utf-8 解码就是一堆 `��`，
    于是**每一条带中文输出的练习都会假报 MISMATCH**。
    （浏览器里没有这一层——Pyodide 的 stdout 是 Unicode 原生字符串，
    所以这只是审计工具的缺陷，不是产品缺陷。）
    注意 `-I` 隐含 `-E`，会忽略 PYTHONIOENCODING 环境变量，只能靠 `-X utf8` 命令行开关。
    """
    try:
        r = subprocess.run([sys.executable, '-I', '-X', 'utf8', '-'],
                           input=code.encode('utf-8'),
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
        return (r.stdout.decode('utf-8', 'replace'),
                r.stderr.decode('utf-8', 'replace'), False)
    except subprocess.TimeoutExpired:
        return '', '', True


ASSIGN = re.compile(r'^([A-Za-z_]\w*)\s*(?:\[[^\]]*\]|\.\w+)*\s*(?:=(?!=)|[-+*/%@|&^]=|//=|\*\*=|>>=|<<=)')


def key_of(line):
    """给一行代码取一个「身份」：赋值取变量名，其余取语句头。"""
    s = line.strip()
    if not s or s.startswith('#'):
        return None
    m = ASSIGN.match(s)
    if m:
        return ('assign', m.group(1))
    m = re.match(r'^([A-Za-z_]\w*)\b', s)
    return ('stmt', m.group(1)) if m else None


def apply_patch(scaffold, patch):
    """把解答区的补丁片段打到题干脚手架上（模拟学生的改法）。

    只做**保守替换**：补丁里 `x = ...` 这类赋值，若脚手架里已有同名赋值行，
    就把那一行的内容换掉（保留缩进）；补丁里的其他行（注释、print、def…）不动。
    这是启发式，宁可漏打（→ 报 MISMATCH 交人工）也不乱打，
    因为错打的补丁会造出「假通过」，那比漏报危险得多。
    """
    lines = scaffold.split('\n')
    index = {}
    for i, l in enumerate(lines):
        k = key_of(l)
        if k and k[0] == 'assign' and k not in index:
            index[k] = i
    hits = 0
    for pl in patch.split('\n'):
        k = key_of(pl)
        if not k or k[0] != 'assign' or k not in index:
            continue
        i = index[k]
        indent = re.match(r'^[ \t]*', lines[i]).group(0)
        lines[i] = indent + pl.strip()
        hits += 1
    return '\n'.join(lines), hits


def main():
    total_ex, rows = collect()
    runnable = [r for r in rows if not r['third_party'] and not r['needs_input']]
    print('=' * 72)
    print('抽取阶段')
    print('  exercise 总数              :', total_ex)
    print('  紧跟解答区且有 python 块    :', len(rows))
    print('    ├ 只用标准库、不读输入    :', len(runnable))
    print('    ├ 需要第三方库            :', sum(1 for r in rows if r['third_party']))
    print('    └ 需要 input()（跳过）    :', sum(1 for r in rows if r['needs_input']))
    print('  无解答区（仅提示/无解）     :', total_ex - len(rows))

    if OUT_JSON:
        with open(OUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False)
        print('  明细已写入                :', OUT_JSON)

    if not DO_RUN:
        return 0

    print()
    print('=' * 72)
    print('执行阶段（逐条跑参考解，按线上判题规则比对 @check）')
    if LIMIT:
        runnable = runnable[:LIMIT]
    ok = fail = err = tmo = 0
    by_way = {'standalone': 0, 'patch': 0}
    bad = []
    for i, r in enumerate(runnable, 1):
        want = normalize_out('\n'.join(r['checks']))
        # 路 A：解答块本身就是完整程序
        out, errtext, timed_out = run_one(r['sol'])
        if not timed_out and not errtext.strip() and same_output(normalize_out(out), want):
            ok += 1
            by_way['standalone'] += 1
            continue
        # 路 B：解答块是补丁，打到题干脚手架上再跑（学生实际改法）
        patched, hits = apply_patch(r['scaffold'], r['sol'])
        out2, err2, tmo2 = run_one(patched)
        if hits and not tmo2 and not err2.strip() and same_output(normalize_out(out2), want):
            ok += 1
            by_way['patch'] += 1
            continue
        # 两条路都不通：归类归档
        if timed_out and tmo2:
            tmo += 1
            bad.append((r, 'TIMEOUT', '', ''))
        elif errtext.strip() and err2.strip():
            err += 1
            bad.append((r, 'ERROR', err2.strip().split('\n')[-1][:120], ''))
        else:
            fail += 1
            bad.append((r, 'MISMATCH', normalize_out(out), want))
        if i % 50 == 0:
            print('  … %d/%d' % (i, len(runnable)))

    print()
    print('  通过（可达 @check）         :', ok)
    print('    ├ 解答块可独立运行        :', by_way['standalone'])
    print('    └ 补丁打到题干脚手架上    :', by_way['patch'])
    print('  不符（期望值可能写错）      :', fail)
    print('  参考解本身报错              :', err)
    print('  超时（疑似死循环）          :', tmo)
    print('  --- 合计                   :', ok + fail + err + tmo, '/', len(runnable))

    if bad:
        print()
        print('-' * 72)
        print('需要人工看的条目：')
        for r, kind, a, b in bad[:60]:
            print('  [%s] %s:%d  %s' % (kind, r['file'], r['line'], r['title'][:38]))
            print('        checks=%s' % json.dumps(r['checks'], ensure_ascii=False)[:160])
            if kind == 'MISMATCH':
                print('        got   =%s' % json.dumps(a, ensure_ascii=False)[:160])
                print('        want  =%s' % json.dumps(b, ensure_ascii=False)[:160])
            else:
                print('        %s' % a)
        if len(bad) > 60:
            print('  …还有 %d 条' % (len(bad) - 60))
    return 0 if not (fail or err or tmo) else 1


if __name__ == '__main__':
    sys.exit(main())
