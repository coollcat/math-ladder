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

上一章的泵引理帮我们划清了正则语言的边界。现在面对更大的上下文无关语言（CFL），我们自然要问：有没有一把类似的尺子，能区分 CFL 和非 CFL？

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
| $\|vxy\|\le p$ | 被泵的三段不能太长 |
| $\|vy\|\ge 1$ | 至少有一段非空（真的有东西可泵） |
| $uv^ixy^iz\in L,\ \forall i\ge 0$ | 泵动后仍在语言中 |

**与正则泵引理的对比**：

| | 正则泵引理 | CFL 泵引理 |
| --- | --- | --- |
| 拆法 | $w=xyz$（三段） | $w=uvxyz$（五段） |
| 限制 | $\|xy\|\le p$ | $\|vxy\|\le p$ |
| 泵动 | $xy^iz$ | $uv^ixy^iz$ |
| 直觉 | 一段重复 | 两段同步重复 |

## 4. 分步例题：证明 $L=\{a^nb^nc^n:n\ge0\}$ 不是 CFL

1. 假设 $L$ 是 CFL，设泵长为 $p$；
2. 取坏串 $w=a^pb^pc^p$，显然 $|w|=3p\ge p$ 且 $w\in L$；
3. 由泵引理，$w=uvxyz$ 且 $|vxy|\le p$；
4. 因为 $|vxy|\le p$，这三段最多跨越两种相邻符号（比如只在 $a$ 区和 $b$ 区之间，不可能同时碰到 $a$ 和 $c$）；
5. 考虑 $i=0$（即删除 $v$ 和 $y$）：
   - 若 $v,y$ 只含 $a$：删除后 $a$ 变少，$b,c$ 不变，三种符号数量不再相等；
   - 若 $v,y$ 只含 $b$：同理 $b$ 变少；
   - 若 $v,y$ 含 $a$ 和 $b$：删除后 $a$ 和 $b$ 都减少，但减少的数目可能不同，仍然不相等；
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

# 一种可能的拆法：u=a, v=aa, x=b, y=bb, z=ccc
u, v, x_val, y, z = "a", "aa", "b", "bb", "ccc" * 1  # 变量名避免与内置 x 冲突

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

:::warning[常见误区]

**你以为 CFL 泵引理能证明一个语言是 CFL。** 其实它和正则泵引理一样，只是必要条件。满足泵引理不保证是 CFL。

**你以为 $v$ 和 $y$ 必须在同一种符号内。** 条件只限制 $|vxy|\le p$，$v$ 和 $y$ 可以跨越两种相邻符号的边界。

**你以为 $i$ 从 1 开始。** 标准形式包含 $i=0$，即删除重复段。

:::

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

图中每个整数点代表 w=a^p b^p c^p 中的一个字符。泵长 p 限制了 |vxy| 的范围（绿色区域），拖动滑块 p 改变泵长，观察 v 和 y 的"触角"如何被限制在最多跨越两种相邻符号。

## 6. 练习

```exercise
# @title: 练习：检查 a^n b^n 是否是 CFL
# @check: True
# @hint: L = {a^n b^n} 是经典 CFL——用 CFG S -> aSb | ε 即可生成。泵引理无法证伪它，因为存在合法拆法能泵。
# 用 CFG 生成 a^n b^n，检查前几个 n
def generate_anbn(n):
    """用 CFG 规则 S -> aSb | ε 生成 a^n b^n"""
    return "a" * n + "b" * n  # 直接构造：n 个 a 后接 n 个 b

# 检查是否所有生成的串都满足 a 和 b 数量相等
all_ok = True
for n in range(6):
    s = generate_anbn(n)
    count_a = s.count("a")  # 统计 a 的个数
    count_b = s.count("b")
    if count_a != count_b:
        all_ok = False
    print(f"n={n}: '{s}'  a={count_a}, b={count_b}")

print(all_ok)
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

CFL 泵引理的证明依赖 PDA 的格局分析。一个 PDA 的格局是 (状态, 栈内容, 剩余输入) 三元组。当输入很长时，格局在"栈深度"这个维度上必然出现重复。

设某个格局在栈深度 $d$ 处重复，两次出现之间的操作构成 $v$ 和 $y$（分别对应栈增长部分的输入消耗和栈减少部分的输入消耗）。因为 $|vxy|\le p$，这段区间不会太长；而 $|vy|\ge1$ 保证至少消耗了一些输入。

取 $i=0$ 时删除 $vy$，PDA 的栈操作仍然对齐（因为重复格局处栈深度相同），所以机器仍然接受。取 $i=2$ 时多走一遍，同样对齐。

这就是"五段"的来源：$u$ 是到达第一个重复格局之前的输入，$vxy$ 是两次出现之间消耗的输入，$z$ 是最后的剩余。

</details>

## 8. 下一站

知道了 CFL 对补、交不封闭之后，工程上更关心：给定两个 CFL，它们的并和连接还是 CFL 吗？下一课系统整理 CFL 的封闭性质。

→ [CFL 的封闭性](./72-cfl-closure.md)
