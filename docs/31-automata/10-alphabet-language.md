---
title: 语言、字母表与字符串
lesson_id: automata/alphabet-language
prereqs:
  - math-language/sets-relations-functions
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - alphabet
  - formal-string
  - formal-language
applications:
  - text-search
  - programming-languages
exits:
  - research
---

# 语言、字母表与字符串

## 1. 从一个场景开始

密码锁只认一串按键：`7-3-7-3` 能开门，`3-7-3-7` 可能报警。两串符号看起来用了同样的数字，顺序不同就成了不同的“词”。形式语言先把“符号”和“合法序列”分开，才谈得上识别规则。

## 2. 直觉解释

**字母表**是允许出现的原子符号，就像钥匙板上有限的按键。**字符串**是把符号从左到右排成的有限序列；**语言**是从所有可能字符串里挑出来的一个集合。

空串记作 $\varepsilon$。它没有字符，但确实是一个字符串，就像空盒子仍然是一个盒子。

## 3. 正式定义

一个字母表是有限非空集合，例如 $\Sigma=\lbrace a,b\rbrace$。$\Sigma^*$ 表示由这些符号组成的全部有限字符串，包括 $\varepsilon$。一个语言是 $\Sigma^*$ 的子集：

$$L \subseteq \Sigma^*$$

| 记号 | 名字 | 例子 |
| --- | --- | --- |
| $\Sigma$ | 字母表 | $\lbrace a,b\rbrace$ |
| $|w|$ | 字符串长度 | $|abba|=4$ |
| $\varepsilon$ | 空串 | $|\varepsilon|=0$ |
| $xy$ | 连接 | 若 $x=ab,y=ba$，则 $xy=abba$ |
| $L$ | 语言 | 所有偶数长度的串 |

注意：$\lbrace ab\rbrace$ 是只含一个字符串的语言；$ab$ 本身是字符串。花括号内外是两个层级。

## 4. 分步例题

设 $\Sigma=\lbrace a,b\rbrace$。

1. 字符串 $w=abba$ 的长度是 $4$；
2. 它的逆序是 $abba$ 自身；
3. 若 $L_1=\lbrace a,ab\rbrace$，$L_2=\lbrace b\rbrace$，逐个连接得 $L_1L_2=\lbrace ab,abb\rbrace$；
4. “长度为偶数的所有串”也是一个语言，只是无法把无穷多个成员全列出来，所以要用规则描述。

## 5. 动手实验

### 实验 1（python）：把连接规则跑起来

```python title="字母、字符串与连接"
a = "a"                 # a 变量保存单个字符组成的字符串
b = "b"                 # b 也是符号，不是数学未知数
x = a + b               # + 对字符串表示连接：把右边接到左边末尾
y = b + a               # 顺序不同，结果通常不同
w = x + y               # 先连成 ab，再连成 abba

print(x)
print(y)
print(w)
print(len(w))           # len(w)：返回字符串 w 的字符个数
```

把 `y` 改成 `a + b` 再运行。总字符数不变，但第三个输出会从 `abba` 变成 `abab`——这正是“序列有方向”的最小实验。

### 实验 2（viz）：用集合映射看“规则挑出字符串”

```viz
{
  "type": "set-mapper",
  "left": ["aa", "ab", "ba", "bb"],
  "right": ["收下", "拒绝"],
  "arrows": [[0, 0], [1, 1], [2, 1], [3, 0]]
}
```

这里左侧是四个候选串，右侧是判定结果。“收下”的那些串组成一个语言。点击圆点改变箭头时，你其实是在改定义，而不只是改一次答案。

:::warning[常见误区]

你以为 $\Sigma$ 可以无限大。其实形式语言的字母表必须有限；无穷的是由它拼出的字符串数量。

你以为 $\varepsilon$ 就是“什么都没有”。其实它是长度为零的合法字符串，参与连接时像乘法里的 $1$。

你以为字符串能随便交换。其实 $ab$ 和 $ba$ 通常不同，除非某个具体语言恰好同时收下它们。

:::

## 6. 练习

```exercise
# @title: 练习：按正确方向连接
# @check: ab
# @check: ba
# @check: abba
# @hint: 先让 x 是 a 后接 b，再让 y 是 b 后接 a；最后 w = x + y。
x = "ba"
y = "ab"
print(x)
print(y)
print(x + y)
```

初始代码把两个串的位置放反了。修正后三行应分别输出 `ab`、`ba` 和 `abba`。

```quiz
下列哪一项最适合看作一个“语言”？
- 一个单独的字母 a
- 由 a 和 b 组成的所有有限字符串的集合 [*]
- 无穷长的字符流
? 语言是全体有限字符串集合的一个子集；单靠一个字符还不是这个集合。
```

<details>
<summary>点开查看逐步解答</summary>

先固定 $\Sigma=\lbrace a,b\rbrace$，得到全集 $\Sigma^*$。题目中的第二个选项正是 $\Sigma^*$ 自己；它是最大的语言。第一个选项只是符号或长度为一的字符串，第三个选项违反“有限字符串”的定义。
</details>

## 7. 选读：为什么要有空串

<details>
<summary>选读 · $\varepsilon$ 的三个用处</summary>

第一，递归定义字符串时需要起点：任何串可由 $\varepsilon$ 逐步追加符号得到。第二，描述可选部分很方便：“出现零次或一次 $a$”就是 $\varepsilon$ 或 $a$。第三，连接单位元让公式更整齐：对任意 $w$，都有 $\varepsilon w=w\varepsilon=w$。
</details>

## 8. 下一站

有了“合法序列”这个对象，下一步要造一台只看眼前符号就能决定动作的小机器。闸机和旋转门已经等在门口。

→ [有限状态机直觉](./20-fsm-intuition.md)
