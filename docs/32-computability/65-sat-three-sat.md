---
title: SAT 与 3-SAT
lesson_id: computability/sat-three-sat
prereqs:
  - computability/np-completeness
volume: 3
layer: L4
track:
  - discrete-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cnf-satisfiability
  - three-sat
applications:
  - circuit-verification
  - constraint-solving
exits:
  - engineering
  - research
---

# SAT 与 3-SAT

## 1. 从一个场景开始

一场活动有三个约束：甲来则乙不来；乙不来或丙来；至少一组条件不能同时落空。把这些话写成布尔变量和“或”“非”，就得到一个 satisfiability 实例。

SAT 问的是：是否存在一组真假赋值让整个公式为真？它是 NP 完全性证明的原点，也是许多现实约束系统的最小模型。

## 2. 直觉解释

先认识三种积木：

| 名称 | 例子 | 含义 |
| --- | --- | --- |
| 文字 | $x$ 或 $\neg x$ | 一个变量或它的否定 |
| 子句 | $(x\vee \neg y\vee z)$ | 若干文字用“或”连接 |
| CNF 公式 | 子句用“且”连接 | 所有子句都要满足 |

CNF 就像一张检查清单：每个子句是一道关卡，只要其中有一个文字为真，这道关卡通过；整张清单通过当且仅当每关都过。

3-SAT 只是把每道关卡限制为最多三个文字。限制更整齐，却没有变容易：SAT 可多项式归约到 3-SAT。常用技巧是为长子句引入辅助变量，把一长串“或”拆成一串三文字关卡。

## 3. 正式定义

给定布尔变量集 $X=\lbrace x_1,\dots,x_n\rbrace$ 和 CNF 公式

$$F=C_1\land C_2\land\dots\land C_m$$

其中每个 $C_j$ 是若干文字的析取。**SAT** 判定是否存在赋值 $\alpha:X\to\lbrace0,1\rbrace$ 使 $F(\alpha)=1$。

**3-SAT** 是 SAT 的受限制形式：每个子句恰有至多三个文字。Cook-Levin 定理证明 SAT NP 完全；随后的标准构造进一步证明 3-SAT NP 完全。

一个小例子：

$$F=(x\vee \neg y)\land(\neg x\vee y)\land(y\vee z)$$

取 $x=1,y=1,z=0$：第一关真，第二关真，第三关真，所以 $F$ 可满足。

## 4. 分步例题

暴力检查三个变量的流程如下：

1. 变量只有 $x,y,z$；
2. 每个变量有真、假两种选择；
3. 所有可能赋值共 $2^3=8$ 个；
4. 对每个赋值逐个子句求值；
5. 任一赋值让所有子句为真，立即回答可满足；
6. 八个都失败，回答不可满足。

这只适用于极小实例。一般 $n$ 增大时 $2^n$ 迅速失控；不过本章实验刻意把 $n$ 固定在 3 以内，避免长时间暴力搜索。

## 5. 动手实验

### 实验 1：局部世界里的真假

```viz
{
  "type": "truth-table",
  "title": "条件句的真假分布",
  "formula": "p=>q",
  "showColumns": ["p", "q", "not p", "p=>q"]
}
```

真值表不是完整 SAT 求解器，但它展示了同一组变量在不同世界里的局部值。CNF 求解就是在许多这样的局部判断之间寻找一致世界。

### 实验 2：三变量 CNF 小实验室

```python title="最多八个世界的穷举"
variables = ["x", "y", "z"]       # 固定三个变量，避免大规模搜索
assignments = [
    {"x": True, "y": True, "z": True},
    {"x": True, "y": True, "z": False},
    {"x": True, "y": False, "z": True},
    {"x": True, "y": False, "z": False},
    {"x": False, "y": True, "z": True},
    {"x": False, "y": True, "z": False},
    {"x": False, "y": False, "z": True},
    {"x": False, "y": False, "z": False}
]

def literal(value, wanted):       # wanted=False 表示负文字
    return value == wanted        # 负文字在原变量为假时成立

for world in assignments:
    clause1 = literal(world["x"], True) or literal(world["y"], False)
    clause2 = literal(world["y"], True) or literal(world["z"], False)
    ok = clause1 and clause2      # CNF 要求两关都过
    print(int(world["x"]), int(world["y"]), int(world["z"]), int(ok))
```

输出最后一位是 1 的行就是满足两个子句的世界。试着增加第三个子句要求 $x$ 或 $z$ 为假，观察有多少世界被淘汰。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 3-SAT 的“三”表示三个变量。它限制的是每个子句中的文字数，变量总数仍可很大。

**误区二**：你以为找到一个子句为真就成功。CNF 要求所有子句同时为真。

**误区三**：你以为不可满足公式只能靠检查完所有赋值来理解。现代求解器会用传播、学习子句和结构剪枝提前排除大片空间；小课堂穷举只是教学模型。

:::

## 7. 练习

```exercise
# @title: 练习：修复负文字求值
# @check: 1 1 1 1
# @check: 0 0 0 1
# @hint: 负文字在原变量为假时应为真；or 只要有一边为真就成立。
def lit(value, positive):
    return value and positive

def evaluate(world):
    c1 = lit(world["x"], True) or lit(world["y"], False)
    c2 = lit(world["y"], True) or lit(world["z"], False)
    return c1 and c2

print(1, 1, 1, int(evaluate({"x": True, "y": True, "z": True})))
print(0, 0, 0, int(evaluate({"x": False, "y": False, "z": False})))
```

初始 `lit` 函数把负文字也当成正文字处理，导致全假世界被错误判死。请修正为：正文字看原值，负文字取相反值。

<details>
<summary>点开查看逐步解答</summary>

把函数改成：

```text
if positive:
    return value
return not value
```

全真世界中，两个子句分别为真、假或真，均通过，所以最后一位是 1。全假世界中，第一句的负文字 $\neg y$ 为真，第二句的负文字 $\neg z$ 为真，所以整个合取式也为真，最后一位同样是 1。这个小修正好对应布尔逻辑里“非”的正确语义。

</details>

## 8. 快问快答

```quiz
3-SAT 相比一般 SAT 改变了什么？
- 只允许三个布尔变量
- 每个子句最多包含三个文字 [*]
- 只允许三个子句
? 规模限制落在子句宽度上；变量和子句数量都可以随输入增长。
```

## 9. 选读：长子句如何瘦身

<details>
<summary>选读 · 辅助变量拆分</summary>

设有子句 $(a_1\vee a_2\vee a_3\vee a_4)$。引入辅助变量 $y$，替换为

$$(a_1\vee a_2\vee y)\land(\neg y\vee a_3\vee a_4)$$

若原子句因 $a_1,a_2$ 至少一真而成立，可令 $y=0$；若后半段有真文字，也可选合适 $y$ 保持两关通过。反向地，若两个新子句同真，可推回原子句为真。重复此法即可把任意宽子句拆成宽度不超过三的子句，转换规模线性增长，因此是多项式归约。

</details>

## 10. 下一站

SAT 已经给出枢纽站。下一课把布尔约束翻译成图的结构：着色、团和独立集会互相认亲。

→ [图着色、团与独立集](./70-graph-reductions.md)
