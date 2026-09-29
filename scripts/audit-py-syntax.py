# -*- coding: utf-8 -*-
"""把 docs 下所有 ```python 代码块抽出来，逐个 compile() 做语法检查。

只做语法，不执行——执行需要 numpy/sympy 等第三方库，且课程代码里有的会跑很久。
"""
import json
import os
import re
import sys

DOCS = sys.argv[1] if len(sys.argv) > 1 else 'docs'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'py_blocks.json'

# python / python3 / exercise 三种围栏里装的都是要跑的 Python。
# 注意：```py 是**片段**（解答区里只展示改对的那一两行，不能独立跑），不纳入检查。
BLOCK = re.compile(r'```(?:python3?|exercise)\b[^\n]*\n(.*?)```', re.S)

blocks = []
bad = []
total = 0

for root, dirs, files in os.walk(DOCS):
    dirs.sort()
    for fn in sorted(files):
        if not fn.endswith('.md'):
            continue
        p = os.path.join(root, fn)
        try:
            src = open(p, encoding='utf-8').read()
        except Exception as e:
            bad.append({'file': p, 'err': 'read: %s' % e})
            continue
        for i, m in enumerate(BLOCK.finditer(src)):
            total += 1
            code = m.group(1)
            line_no = src[: m.start()].count('\n') + 1
            rec = {
                'file': p.replace('\\', '/'),
                'idx': i,
                'line': line_no,
                'code': code,
            }
            try:
                compile(code, '<block>', 'exec')
                rec['ok'] = True
            except SyntaxError as e:
                rec['ok'] = False
                rec['err'] = 'SyntaxError: %s (line %s)' % (e.msg, e.lineno)
                bad.append(rec)
            except ValueError as e:
                # 含空字节等
                rec['ok'] = False
                rec['err'] = 'ValueError: %s' % e
                bad.append(rec)
            except Exception as e:
                rec['ok'] = False
                rec['err'] = '%s: %s' % (type(e).__name__, e)
                bad.append(rec)
            blocks.append(rec)

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(blocks, f, ensure_ascii=False)

print('文件数        :', len({b['file'] for b in blocks}))
print('代码块总数    :', total)
print('语法通过      :', sum(1 for b in blocks if b['ok']))
print('语法失败      :', len(bad))
for b in bad[:25]:
    print('  %s:%d  %s' % (b['file'], b['line'], b['err']))
