# -*- coding: utf-8 -*-
"""扫描所有 ```exercise 块，统计 @check 期望值的形态，找出「浮点精确比较」的风险面。

判题当前是 normalizeOut(got) === normalizeOut(want) 的**精确字符串相等**，
没有任何浮点容差。这里量化有多少练习落在风险区。
"""
import json
import os
import re
import sys

DOCS = sys.argv[1] if len(sys.argv) > 1 else 'docs'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'py_ex.json'

EX = re.compile(r'```exercise\b[^\n]*\n(.*?)```', re.S)
CHECK = re.compile(r'^#\s*@check:\s*(.*)$', re.M)
TITLE = re.compile(r'^#\s*@title:\s*(.*)$', re.M)
NUM = re.compile(r'-?\d+\.\d+')

exs = []
for root, dirs, files in os.walk(DOCS):
    dirs.sort()
    for fn in sorted(files):
        if not fn.endswith('.md'):
            continue
        p = os.path.join(root, fn).replace('\\', '/')
        src = open(p, encoding='utf-8').read()
        for m in EX.finditer(src):
            body = m.group(1)
            checks = [c.group(1).strip() for c in CHECK.finditer(body)]
            t = TITLE.search(body)
            exs.append({
                'file': p,
                'line': src[: m.start()].count('\n') + 1,
                'title': (t.group(1).strip() if t else ''),
                'checks': checks,
                'body': body,
            })

print('exercise 块总数      :', len(exs))
print('有 @check 的         :', sum(1 for e in exs if e['checks']))
print('无 @check 的         :', sum(1 for e in exs if not e['checks']))

float_ex = []
for e in exs:
    hits = []
    for c in e['checks']:
        for m in NUM.finditer(c):
            s = m.group(0)
            frac = s.split('.')[1]
            hits.append((s, len(frac)))
    if hits:
        float_ex.append({'file': e['file'], 'line': e['line'], 'title': e['title'],
                         'checks': e['checks'], 'nums': hits})

print('期望值含小数的 exercise:', len(float_ex))
print()
print('--- 小数位数最多的 20 个（位数越多越脆）---')
rows = sorted(float_ex, key=lambda e: -max(n[1] for n in e['nums']))[:20]
for e in rows:
    mx = max(n[1] for n in e['nums'])
    print('  [%-2d位] %s:%d  %s' % (mx, e['file'], e['line'], e['title'][:38]))
    print('         checks=%s' % json.dumps(e['checks'], ensure_ascii=False))

print()
print('--- 小数位数分布 ---')
from collections import Counter
c = Counter(max(n[1] for n in e['nums']) for e in float_ex)
for k in sorted(c):
    print('  %2d 位: %d 个' % (k, c[k]))

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(exs, f, ensure_ascii=False)
