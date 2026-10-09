---
title: CFL 泵引理
lesson_id: automata/cfl-pumping
prereqs:
  - automata/minimal-dfa
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cfl-pumping-lemma
  - non-cfl-language
applications:
  - compiler-parsing
  - language-hierarchy
exits:
  - research
---

# CFL 泵引理

## 1. 从一个场景开始

本章学过的泵引理帮我们划清了正则语言的边界。现在面对更大的上下文无关语言（CFL），我们自然要问：有没有一把类似的尺子，能区分 CFL 和非 CFL？

答案是有的——而且结构惊人地相似，只是从一维变成了二维。

## 2. 直觉解释

正则泵引理的核心是：DFA 状态有限，长串必然重复访问某状态，重复的那段可以"泵"。

CFL 泵引理的核心类似：PDA 的格局由状态和栈内容组成。当输入串足够长时，格局必然重复。但因为有栈的存在，泵动变得更加灵活——我们可以分别泵动靠近顶端的部分和远离顶端的部分。

想象一根长吸管插入栈顶附近：把吸管周围的材料复制或删除，栈的操作仍然能对齐。这就是"两段同时泵"的几何图像。

## 3. 正式定义

**CFL 泵引理**：若 $L$ 是上下文无关语言，则存在整数 $p\ge1$（泵长），使得任何满足 $w\in L$ 且 $|w|\ge p$ 的字符串都能写成

$$w=uvxyz$$

满足以下三个条件：

| 条件 | 含义 |
| --- | --- |
| $|vxy|\le p$ | 被泵的三段不能太长 |
| $|vy|\ge 1$ | 至少有一段非空（真的有东西可泵） |
| $uv^ixy^iz\in L,\ \forall i\ge 0$ | 泵动后仍在语言中 |

**与正则泵引理的对比**：

| | 正则泵引理 | CFL 泵引理 |
| --- | --- | --- |
| 拆法 | $w=xyz$（三段） | $w=uvxyz$（五段） |
| 限制 | $|xy|\le p$ | $|vxy|\le p$ |
| 泵动 | $xy^iz$ | $uv^ixy^iz$ |
| 直觉 | 一段重复 | 两段同步重复 |

## 4. 分步例题：证明 $L=\lbrace a^nb^nc^n:n\ge0\rbrace$ 不是 CFL

1. 假设 $L$ 是 CFL，设泵长为 $p$；
2. 取坏串 $w=a^pb^pc^p$，显然 $|w|=3p\ge p$ 且 $w\in L$；
3. 由泵引理，$w=uvxyz$ 且 $|vxy|\le p$；
4. 因为 $|vxy|\le p$，这三段最多跨越两种相邻符号（比如只在 $a$ 区和 $b$ 区之间，不可能同时碰到 $a$ 和 $c$）；
5. 考虑 $i=0$（即删除 $v$ 和 $y$）：
   - 若 $v,y$ 只含 $a$：删除后 $a$ 变少，$b,c$ 不变，三种符号数量不再相等；
   - 若 $v,y$ 只含 $b$：同理 $b$ 变少；
   - 若 $v,y$ 含 $a$ 和 $b$：删除后 $a$、$b$ 至少有一个变少，$c$ 却原封不动，三者不可能还相等；
   - 其他情况类似推导；
6. 无论如何，$uv^0xy^0z\notin L$，矛盾；
7. 因此 $L$ 不是 CFL。

关键洞察：**$|vxy|\le p$ 限制了泵动的"触角"范围**，使得 $v$ 和 $y$ 无法同时均匀地影响三种符号。

## 5. 动手实验

### 实验 1（python）：验证泵动后失衡

```python title="五段拆法的泵动效果"
# 演示：取 p=3，w=aaabbbccc
p = 3
w = "a" * p + "b" * p + "c" * p
print(f"原串: {w}，长度 {len(w)}")

# 一种合法拆法：u=a, v=a, x=a, y=b, z=bbccc（vxy 共 3 个字符，没超过泵长 p=3）
u, v, x_val, y, z = "a", "a", "a", "b", "bbccc"

for i in range(4):
    pumped = u + v * i + x_val + y * i + z  # v^i 和 y^i 同步泵动
    count = {}
    for ch in pumped:  # ch：遍历字符串中的每个字符
        count[ch] = count.get(ch, 0) + 1  # dict.get(key, default)：取值，不存在则返回默认值
    equal = (count.get("a", 0) == count.get("b", 0) == count.get("c", 0))
    print(f"i={i}: {pumped}  三种符号相等? {equal}")
```

只有 $i=1$ 时三种符号数量相等。$i=0$ 和 $i\ge2$ 都离开了语言——这就是泵引理证伪的微观证据。

### 实验 2（python）：检查所有跨越边界的拆法

```python title="穷举 |vxy|<=p 的拆法是否都泵坏"
p = 2
w = "a" * p + "b" * p + "c" * p  # aabbcc

def check_split(u, v, x_val, y, z):
    """检查 uv^0xy^0z 是否仍在 a^nb^nc^n 中"""
    pumped = u + x_val + z  # i=0 时泵掉 v 和 y
    na = pumped.count("a")  # str.count：统计子串出现次数
    nb = pumped.count("b")
    nc = pumped.count("c")
    return na == nb == nc and na > 0

broken = 0
total = 0
# 穷举所有满足 |vxy|<=p 的拆法
for vx_start in range(len(w)):
    for vx_end in range(vx_start + 1, min(vx_start + p + 1, len(w) + 1)):
        for v_end in range(vx_start, vx_end + 1):
            for x_end in range(v_end, vx_end + 1):
                u_s = w[:vx_start]
                v_s = w[vx_start:v_end]
                x_s = w[v_end:x_end]
                y_s = w[x_end:vx_end]
                z_s = w[vx_end:]
                if len(v_s) + len(y_s) >= 1:
                    total += 1
                    if not check_split(u_s, v_s, x_s, y_s, z_s):
                        broken += 1

print(f"总拆法: {total}")
print(f"泵坏的: {broken}")
print(f"全部泵坏? {broken == total}")
```

所有合法拆法在 $i=0$ 时都泵坏——这正是反证需要的铁证。

### 实验 3：泵引理分解可视化

```viz
{
  "type": "plot",
  "title": "CFL 泵引理分解示意",
  "expr": "sin(pi*x/p)",
  "xmin": 0,
  "xmax": 15,
  "ymin": -1.5,
  "ymax": 1.5,
  "sliders": [
    {"name": "p", "min": 2, "max": 8, "step": 1, "value": 3}
  ]
}
```

图中正弦波在 $x=0,p,2p$ 三处过零，正好落在 $w=a^pb^pc^p$ 的三段接缝上。拖动滑块改变泵长 $p$，接缝整体挪动，而泵动窗口 $|vxy|$ 最长也只有 $p$ 个字符——这就是 $v$ 和 $y$ 最多只能横跨两种相邻符号的原因。

:::warning[常见误区]

**你以为 CFL 泵引理能证明一个语言是 CFL。** 其实它和正则泵引理一样，只是必要条件。满足泵引理不保证是 CFL。

**你以为 $v$ 和 $y$ 必须在同一种符号内。** 条件只限制 $|vxy|\le p$，$v$ 和 $y$ 可以跨越两种相邻符号的边界。

**你以为 $i$ 从 1 开始。** 标准形式包含 $i=0$，即删除重复段。

:::

## 6. 练习

```exercise
# @title: 练习：检查 a^n b^n 是否是 CFL
# @check: 能永远泵在 a^n b^n 里的拆法数: 3
# @check: 泵引理能证伪 a^n b^n 吗? False
# @hint: 坑在循环里那句「v 和 y 必须同一种符号」——泵引理只要求 |vxy| <= p 和 |vy| >= 1，v 可以待在 a 区、y 待在 b 区（v="a"、y="b" 就合法）。删掉那个想当然的条件再数一遍。
# 枚举 w = a^3 b^3 的所有合法拆法，看泵引理能不能证伪 a^n b^n
p = 3
w = "a" * p + "b" * p

def in_anbn(s):
    """串是否形如 a^n b^n：先清一色 a，再清一色 b，且两边一样多"""
    na = s.count("a")
    nb = s.count("b")
    return s == "a" * na + "b" * nb and na == nb

def can_pump_forever(u, v, x, y, z):
    for i in range(5):                  # i = 0..4 都试一遍
        s = u + v * i + x + y * i + z   # v^i 和 y^i 同步泵动
        if not in_anbn(s):
            return False
    return True

good = 0
# 穷举所有满足 |vxy| <= p 且 |vy| >= 1 的拆法
for vx_start in range(len(w)):
    for vx_end in range(vx_start + 1, min(vx_start + p + 1, len(w) + 1)):
        for v_end in range(vx_start, vx_end + 1):
            for x_end in range(v_end, vx_end + 1):
                u_s = w[:vx_start]
                v_s = w[vx_start:v_end]
                x_s = w[v_end:x_end]
                y_s = w[x_end:vx_end]
                z_s = w[vx_end:]
                if len(v_s) + len(y_s) < 1:                # |vy| >= 1
                    continue
                if v_s and y_s and v_s[0] != y_s[0]:       # ← 想当然：v 和 y 得是同一种符号？
                    continue
                if can_pump_forever(u_s, v_s, x_s, y_s, z_s):
                    good += 1

print(f"能永远泵在 a^n b^n 里的拆法数: {good}")
print(f"泵引理能证伪 a^n b^n 吗? {good == 0}")
```

```quiz
CFL 泵引理中，条件 |vxy| <= p 的作用是什么？
- 保证 v 和 y 不为空
- 限制被泵的片段不能太长，从而限制它能跨越的符号种类 [*]
- 保证泵动后的串仍然很长
? |vxy| <= p 确保被泵部分最多跨越两种相邻符号，这是反证的关键：无法同时均匀影响三种或更多符号。
```

```quiz
要证明语言 L 不是 CFL，应该怎么做？
- 找一个 L 中的短串，验证它不满足泵引理
- 假设 L 是 CFL，取一个长坏串，证明所有合法拆法都会泵出 L 外 [*]
- 构造一个 PDA 无法识别的串
? 反证法：假设是 CFL，利用泵引理取坏串，证明不存在满足所有条件的拆法。
```

## 7. 选读：泵引理的证明思路

<details>
<summary>选读 · 为什么五段而非三段</summary>

CFL 泵引理的证明走文法：非终结符只有有限多种，而很长的串对应很高的解析树，于是从根到叶的一条路径上，某个非终结符 $A$ 必然出现两次。

设靠上的那个 $A$ 的整棵子树产出 $vxy$：$x$ 由靠下的那个 $A$ 产出，$v$ 和 $y$ 是它左右两侧的产出（在等价的 PDA 图像里，$v$ 是栈往上长的那段输入，$y$ 是退回来的那段）。$|vxy|\le p$ 说的是重复的两个 $A$ 挨得够近，中间的产出有限；$|vy|\ge1$ 保证树确实高到剪得出东西。

把靠上的 $A$ 直接换成靠下那个 $A$ 的子树（$i=0$，剪掉中间这层），或者把中间这层原样复制两份再接回去（$i=2$），解析树的其余部分纹丝不动，得到的仍是合法树——所以机器照旧接受。

这就是"五段"的来源：$u$ 是上面那个 $A$ 左边的部分，$vxy$ 是它整棵子树的产出，$z$ 是最后剩下的部分。

</details>

## 8. 下一站

尺子能量边界，但构造不了机器：到底什么样的计算模型认得上下文无关语言？下一课请出一条无限长的栈，让机器记住自己走到了哪一层括号。

→ [下推自动机与栈](./70-pda-stack.md)
