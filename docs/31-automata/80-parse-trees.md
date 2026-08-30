---
title: 解析树与歧义
lesson_id: automata/parse-trees
prereqs:
  - automata/context-free-grammar
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - parse-tree
  - ambiguous-grammar
applications:
  - compiler-parsing
  - natural-language-parsing
exits:
  - engineering
---

# 解析树与歧义

## 1. 从一个场景开始

“我看见了拿着望远镜的人”有两种意思：我用望远镜看人，或者看的人拿着望远镜。程序里的 `1+2*3` 也一样，切法不同，运算结果就可能不同。解析树把切法画出来。

## 2. 直觉解释

推导是一行行替换，解析树是它的形状：

- 根是开始符号；
- 叶子从左到右组成最终字符串；
- 每个内部节点是一次产生式替换；
- 子节点顺序就是右侧符号顺序。

若同一个字符串至少有两棵不同的解析树，文法对该串歧义。

## 3. 正式定义

设 CFG $G=(V,\Sigma,P,S)$。一棵解析树满足：

1. 根标记为 $S$；
2. 每个内部节点标记为某个变量 $A$；
3. 若节点 $A$ 的孩子从左到右标记为 $X_1X_2\cdots X_k$，则 $A\to X_1X_2\cdots X_k\in P$；
4. 叶子标记为终结符或 $\varepsilon$，从左到右读出边缘 $w$。

文法是**歧义的**，当存在 $w\in L(G)$ 有两棵互不相同的解析树。注意这是文法性质；某些语言本身天生固有歧义，换文法也无法消除。

## 4. 分步例题：表达式文法

看简化文法：

$$E\to E+E\mid E\times E\mid id$$

推导 `id+id*id` 至少有两种树。

第一棵把乘法放低：

1. 根 $E\to E+E$；
2. 左 $E\to id$；
3. 右 $E\to E\times E$；
4. 右边计算 $id\times id$；
5. 结果对应 $id+(id\times id)$。

第二棵把加法放低：

1. 根 $E\to E\times E$；
2. 左 $E\to E+E$；
3. 右 $E\to id$；
4. 结果对应 $(id+id)\times id$。

两棵树边缘都是同一个字符串，但运算分组不同。

## 5. 动手实验

### 实验 1（viz）：证明轨迹当树链骨架

```viz
{
  "type": "proof-trail",
  "steps": [
    { "id": "root", "text": "根 E -> E + E" },
    { "id": "left", "text": "左叶 id" },
    { "id": "right", "text": "右子树 E * E" },
    { "id": "edge", "text": "边缘仍是 id+id*id" },
    { "id": "alt", "text": "另一根可为 E -> E * E" }
  ],
  "edges": [["root", "left"], ["root", "right"], ["right", "edge"], ["edge", "alt"]]
}
```

这个组件不是完整树编辑器，但能把关键分支连成证据链。真正的拖拽式 `parse-tree-builder` 需求已写入第 31 章的生产 Unit Guide。

### 实验 2（python）：两种括号化算出两个值

```python title="同一序列，不同解析树"
numbers = [1, 2, 3]            # 代表 id1 id2 id3

def mul_first():               # 先算 2*3：树根是 +
    return numbers[0] + numbers[1] * numbers[2]

def add_first():               # 先算 1+2：树根是 *
    return (numbers[0] + numbers[1]) * numbers[2]

print(f"mul-first tree value={mul_first()}")
print(f"add-first tree value={add_first()}")
```

输出分别是 `7` 和 `9`。值不同只是症状，真正原因是叶子序列被分成了不同的子树。

:::warning[常见误区]

你以为歧义指某个字符串拼错。其实字符串完全相同，只是结构树不同。

你以为消除歧义总能成功。有些上下文无关语言固有歧义，任何 CFG 都至少对一个串有多棵树。

你以为推导顺序不同一定是歧义。最左推导顺序唯一时仍是同一棵树；歧义要求树形状不同。

:::

## 6. 练习

```exercise
# @title: 练习：给表达式选择正确分组
# @check: +
# @check: *
# @check: 9
# @hint: 不加括号时乘法先算，树根是加号；想先算加法要写成 (1 + 2) * 3，此时树根换成乘号，值为 9。
value = 1 + 2 * 3
root_plain = "*"        # ← 无括号版的树根判断反了吗？
root_paren = "+"        # ← 括号版的树根呢？
grouped = value         # ← 想先算加法，这一行该怎么改？

print(root_plain)
print(root_paren)
print(grouped)
```

期望输出依次是 `+`、`*`、`9`：第一行是无括号时的树根（乘法在更深的子树），第二行是加括号后的树根，第三行是括号版的值。初始代码两处树根写反，且 `grouped` 还没有真正"先加后乘"。

```quiz
文法对某个串歧义的准确定义是什么？
- 这个串包含语法错误
- 它至少有两棵不同解析树 [*]
- 它可以用两种顺序推导出同一棵树
? 歧义看树形结构；同一棵树的不同替换顺序不算新结构。
```

## 7. 选读：消歧文法的代价

<details>
<summary>选读 · 优先级与结合性</summary>

常见办法是把表达式分成层次：`Expr -> Expr + Term | Term`，`Term -> Term * Factor | Factor`。这样乘法总在更低子树，加法在更高处；左递归形式还实现左结合。代价是文法变大、错误定位变难，编译器常用优先级表辅助生成。
</details>

## 8. 下一站

小例子可以手画树，真实语法必须交给算法。CYK 用动态规划把所有子串的可能类别一张表算清。

→ [CYK 与 DP 解析选讲](./85-cyk-parsing.md)
