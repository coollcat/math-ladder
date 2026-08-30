---
title: 复杂度类地图
lesson_id: computability/complexity-map
prereqs:
  - computability/approximation-heuristics
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
  - complexity-class-inclusion
applications:
  - theoretical-modeling
exits:
  - research
---

# 复杂度类地图

## 1. 从一个场景开始

旅行时你会问三个问题：能到吗、要多久、要带多少行李。计算问题也一样：可判定吗、时间多少、空间多少。复杂度类就是把这些答案归档的大陆板块。

这一课不求展开所有类，而是给你一张能挂靠后续知识的小地图。

## 2. 直觉解释

几个核心类：

| 类 | 资源限制 | 一句话画像 |
| --- | --- | --- |
| P | 确定性多项式时间 | 能高效求解 |
| NP | 多项式时间可验证 yes 证书 | 答案一旦给出容易查 |
| PSPACE | 多项式空间 | 地盘有限，但时间可以很长 |
| EXPTIME | 指数时间 | 时间预算指数级 |

已知的可靠包含关系是：

$$P\subseteq NP\subseteq PSPACE\subseteq EXPTIME$$

其中 $P\subsetneq EXPTIME$ 已由时间层级定理证明严格包含；也就是说，确实存在需要指数时间的可判定问题。中间箭头是否严格，例如 P 与 NP 是否相等，仍是公开问题。

## 3. 正式定义

**TIME($t(n)$)** 表示可用 $O(t(n))$ 时间判定的语言类。

$$P=\bigcup_{k\ge 1}TIME(n^k)$$

**EXPTIME** 表示所有指数时间可判定语言：

$$EXPTIME=\bigcup_{k\ge 1}TIME(2^{n^k})$$

**PSPACE** 表示确定性图灵机在多项式空间内判定的语言类。空间可以重复使用，时间不行；这是空间类比时间类更宽容的重要原因。

时间层级定理说明：给确定性图灵机足够更多的时间，就能判定更多语言。其推论之一是 $P\subsetneq EXPTIME$。

## 4. 分步例题

例题：把四个假设任务放进地图。

1. 排序 $n$ 个数：已知多项式时间算法，属于 P；
2. 子集和：属于 NP，因为有下标证书；
3. 广义棋类胜负：常涉及长局面链，许多版本属于 PSPACE 或更高；
4. 某些带指数长度计算历史的判定问题：可放入 EXPTIME。

注意第 2 步只能说“属于 NP”。除非有从 NP 完全问题的归约，不能宣称 NP 完全；也不能因为暂无快算法就说不在 P。

## 5. 动手实验

### 实验 1：板块包含图

```viz
{
  "type": "proof-trail",
  "title": "从 P 到 EXPTIME 的可靠通道",
  "steps": [
    { "id": "P", "text": "多项式时间求解" },
    { "id": "NP", "text": "多项式时间验证证书" },
    { "id": "PSPACE", "text": "多项式空间，时间可长" },
    { "id": "EXP", "text": "指数时间足够模拟前者" }
  ],
  "edges": [["P", "NP"], ["NP", "PSPACE"], ["PSPACE", "EXP"]]
}
```

这条链只画包含方向。不要在 P 与 NP 之间画等号，也不要把 NP 到 PSPACE 的箭头误读成严格分层。

### 实验 2：用预算表分类声明

```python title="复杂度声明体检"
claims = [
    {"name": "sorting", "time": "n log n", "certificate": None},
    {"name": "subset_sum", "time": "unknown-fast", "certificate": "indices"},
    {"name": "mystery", "time": "2^n", "certificate": None}
]

def classify_claim(item):             # 只根据给出的证据保守分类
    if item["certificate"] is not None:
        return "in NP if verifier is polynomial"
    if item["time"].startswith("n") or item["time"] == "unknown-fast":  # startswith 检查字符串前缀
        return "not enough evidence for class"
    return "decidable bound only"

for c in claims:
    print(c["name"], classify_claim(c))
```

程序强调证据不足时不硬贴标签。`2^n` 只是某个算法的成本，不代表问题不在 P。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 PSPACE 一定包含指数时间。相反，已知方向是 PSPACE 包含于 EXPTIME；空间省着用时，时间仍可能有界于某个更大函数。

**误区二**：你以为所有包含关系都已知道是否严格。P 与 NP、NP 与 PSPACE 等中间边界仍未解决。

**误区三**：你以为单个慢算法能证明问题属于高类。复杂度类描述最佳算法的存在性与上界，不是某段代码的表现。

:::

## 7. 练习

```exercise
# @title: 练习：修正包含链
# @check: P subset NP
# @check: NP subset PSPACE
# @check: PSPACE subset EXPTIME
# @hint: 方向要从较小资源类指向较大资源类；不要写出尚未证明的严格包含。
chains = {
    "P": "EXPTIME",
    "NP": "P",
    "PSPACE": "NP"
}

def arrow(a, b):
    return a + " subset " + b

print(arrow("P", chains["P"]))
print(arrow("NP", chains["NP"]))
print(arrow("PSPACE", chains["PSPACE"]))
```

初始映射把箭头指反了或跨步太大。请让相邻两跳分别输出 P 到 NP、NP 到 PSPACE、PSPACE 到 EXPTIME。

<details>
<summary>点开查看逐步解答</summary>

把字典改为 `"P": "NP"`, `"NP": "PSPACE"` 和 `"PSPACE": "EXPTIME"`。这些都是标准包含关系；其中只有 P 到 EXPTIME 可进一步由时间层级定理加强为严格包含，但相邻环节是否严格仍需谨慎。复杂度地图上的每一个箭头都要能说出定义层面的理由。

</details>

## 8. 快问快答

```quiz
目前可以断言哪件事？
- P 严格小于 NP
- PSPACE 包含于 EXPTIME [*]
- NP 严格小于 PSPACE
? 只有部分极端分界由层级定理证明；中间关系仍是开放问题。
```

## 9. 选读：补类与对称问题

<details>
<summary>选读 · co-NP 是什么</summary>

若 $L\in NP$，它的补集不一定自动在 NP，因为 NP 的短证书只服务 yes 实例。补集也能用短证书否证的语言组成 co-NP。例如“公式不可满足”的证书并不显然，而“可满足”的证书就是一个赋值。是否 NP 等于 co-NP 也是开放问题。这张补充地图提醒我们：yes 与 no 的证据结构可能非常不对称。

</details>

## 10. 下一站

地图上还有一块值得驻足：多项式空间如何支撑极长的推理链。下一课用小游戏和记忆化直觉看 PSPACE 与指数时间。

→ [PSPACE 与指数时间](./85-pspace-exp-time.md)
