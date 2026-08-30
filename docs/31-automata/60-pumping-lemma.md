---
title: 泵引理与非正则语言
lesson_id: automata/pumping-lemma
prereqs:
  - automata/regex-to-automata
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
  - pumping-lemma
  - nonregular-language
applications:
  - language-boundaries
  - compiler-design
exits:
  - research
---

# 泵引理与非正则语言

## 1. 从一个场景开始

一台只有五格记忆的机器，却被迫读完一段很长很长的输入。根据鸽笼原理，中途一定会回到某个旧状态。重复的那段路就可以“再走几次”，机器毫无察觉——这就是泵。

## 2. 直觉解释

泵引理不是构造规则，而是所有正则语言都必须满足的体检项目。

若一个足够长的正则串被拆成三段 $xyz$，中间段 $y$ 不为空也不太长，那么反复删除或复制 $y$ 后，机器仍然接受：

$$xy^iz\in L,\quad i=0,1,2,\ldots$$

如果一个语言有某个满足 $w\in L$ 且 $|w|\ge p$ 的长串，使得**每一种合法拆法**都无法承受泵动，它就不是正则语言。

## 3. 正式表述

若 $L$ 是正则语言，则存在整数 $p\ge 1$，使得任何满足

$$w\in L,\ |w|\ge p$$

的字符串都能写成

$$w=xyz,\quad |y|\ge 1,\quad |xy|\le p$$

并且对所有 $i\ge 0$ 都有 $xy^iz\in L$。

注意量词方向：正则语言是“存在 $p$，且对每个长串存在一个好拆法”；反证时要找一个坏串，使“所有合法拆法”都失败。

## 4. 分步例题：证明 $L=\lbrace a^n b^n:n\ge 0\rbrace$ 非正则

1. 假设 $L$ 正则，设泵长为 $p$；
2. 取坏串 $w=a^p b^p$；
3. 条件 $|xy|\le p$ 强制 $y$ 完全落在前段 $a$ 中；
4. 又有 $|y|\ge1$，所以 $y=a^k$，其中 $k\ge1$；
5. 取 $i=2$，泵后变成 $a^{p+k}b^p$；
6. 左边比右边多 $k$ 个 $a$，这个串不在 $L$；
7. 与泵引理矛盾，所以假设错误，$L$ 非正则。

## 5. 动手实验

### 实验 1（viz）：把反证链钉在轨迹上

```viz
{
  "type": "proof-trail",
  "steps": [
    { "id": "assume", "text": "假设 anbn 正则" },
    { "id": "pick", "text": "取 w=a^p b^p" },
    { "id": "split", "text": "y 只能是若干 a" },
    { "id": "pump", "text": "i=2 后 a 变多" },
    { "id": "break", "text": "离开语言，矛盾" }
  ],
  "edges": [["assume", "pick"], ["pick", "split"], ["split", "pump"], ["pump", "break"]]
}
```

点击卡片按顺序连出这条链。任何一步断裂，证明都不成立；尤其是“$y$ 只能落在 $a$ 区”由 $|xy|\le p$ 保证。

### 实验 2（python）：看见泵动后的失衡

```python title="对一种拆法执行 i=0 和 i=2"
p = 3                       # 为了肉眼可读，把泵长缩小成演示值
x = "a"                     # x=a^1
y = "aa"                    # y=a^2，非空
z = "b" * p                 # * 对字符串表示重复次数

for i in [0, 1, 2]:
    pumped = x + y * i + z   # y*i 表示 y 重复 i 次
    count_a = 0
    count_b = 0
    for ch in pumped:
        if ch == "a":
            count_a = count_a + 1
        elif ch == "b":
            count_b = count_b + 1
    print(f"i={i}: {pumped}, a={count_a}, b={count_b}")
```

当 $i=1$ 时数量相等；$i=0$ 少两个 $a$，$i=2$ 多两个 $a$。真实证明要对所有合法拆法找失败值，这里是其中一个失败样本的放大镜。

:::warning[常见误区]

你以为满足泵引理就正则。其实泵引理是必要条件，不是充分条件；有些非正则语言也能伪装过关。

你以为可以随便选 $x,y,z$。反证中你选坏串，但拆法是对手/引理给的；必须排除所有合法拆法。

你以为 $i$ 只能是正数。标准形式包含 $i=0$，删除重复段也是泵动。

:::

## 6. 练习

```exercise
# @title: 练习：检查一次泵动是否符合形状
# @check: aaaabb
# @check: aaabb
# @check: False
# @hint: 泵动两次就是把 y 写成 y * 2；再用计数器比较 i2 串里 a 与 b 的数量是否相等——不相等说明它已离开语言。
x = "aa"
y = "a"
z = "bb"

i2 = x + y + z           # ← 想泵动两次，这里 y 该重复几份？
i1 = x + y + z           # i=1 就是原串本身

count_a = 0
count_b = 0
for ch in i2:
    if ch == "a":
        count_a = count_a + 1
    elif ch == "b":
        count_b = count_b + 1

print(i2)
print(i1)
print(count_a == count_b)
```

期望输出是 `aaaabb`、`aaabb`、`False`：泵动两次后 a 多出一个，数量不再相等。初始代码把 `i2` 也写成了原串，先把它改成真正的两次泵动。

```quiz
用泵引理证明语言非正则时，应该怎样选串？
- 选一个很短的例子
- 选一个长度至少为 p 的坏串 [*]
- 让对手随便选任何短串
? 泵引理只约束长度达到 p 的语言成员；反证者要挑出一个无论怎样合法拆分都会泵坏的串。
```

## 7. 选读：泵引理不能做什么

<details>
<summary>选读 · 为什么它是单向体检</summary>

泵引理只利用了有限状态的重复性，没有刻画全部正则结构。因此存在非正则语言，其所有成员都有某种可泵分解，却不满足 DFA 的整体识别要求。判断非正则时常结合封闭性：例如已知 $\lbrace a^n b^n\rbrace$ 非正则，再用交运算推出它的变形也非正则。
</details>

## 8. 下一站

在离开正则边界前，还要回答另一个工程问题：同一语言可能被许多 DFA 识别，哪一台最小？下一课用不可区分性合并多余状态。

→ [最小 DFA 直觉](./65-minimal-dfa.md)
