---
title: 度、握手定理与序列
lesson_id: graph-theory/degree-handshake
prereqs:
  - graph-theory/graph-definition
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - degree
  - handshaking-lemma
  - degree-sequence
applications:
  - network-audit
  - party-problem
exits:
  - exam
  - research
---
# 度、握手定理与序列

## 1. 开场钩子

派对结束时每人报出握手次数；所有数相加一定是偶数，因为每条握手被两个人各记一次。

## 2. 直觉解释

度是顶点伸出的手柄数。每条边有两个端点，所以按点计数时每条边被算两次。

## 3. 正式定义

$d(v)$ 是与 $v$ 相关联的边数。若图有 $m$ 条边，则 $$\sum_{v\in V}d(v)=2m.$$ 度序列是把所有度按非减顺序排列；奇度点个数为偶数。

## 4. 分步例题

边 AB,BC,CD,DA,BD 的度为 2,3,2,3；度和 10 恰是边数 5 的两倍，奇度点是 B 和 D。

## 5. 动手实验

### 实验 0（viz）：度徽标与奇度配对，随手拖

```viz
{
  "type": "degree-lab",
  "title": "4 点 5 边小图：握手定理现场",
  "nodes": ["A", "B", "C", "D"],
  "edges": [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"], ["B", "D"]],
  "selectedId": "B"
}
```

怎么玩：每个点右上角的蓝色徽标就是它的度，拖动任何点、账本都实时重算——`Σ度 = 2m` 这根红线怎么拖都断不了。点一下 $B$（或任意奇度点），与它相连的边会加亮：奇度点总是成对出现，右侧面板给出了配对方案。把这台账和下面的 Python 账本对一对。

```viz
{
  "type": "datachart",
  "labels": [
    "A",
    "B",
    "C",
    "D"
  ],
  "values": [
    2,
    3,
    2,
    3
  ]
}
```

```python title="检查度和是否等于两倍边数"
edges=[["A","B"],["B","C"],["C","D"],["D","A"],["B","D"]]
degrees={}
for name in ["A","B","C","D"]:
    degrees[name]=0          # 计数器清零
for u,v in edges:
    degrees[u]+=1            # 边的一个端点记一次
    degrees[v]+=1            # 另一个端点也记一次
print(degrees)
print(sum(degrees.values()),2*len(edges))
```

:::warning[常见误区]

**误区一**：度和等于边数两倍，不是边数本身。

**误区二**：不是任意非负整数串都是度序列。

**误区三**：奇度点成对出现，但它们的度不必相同。

:::

## 6. 练习与定理快问

```exercise
# @title: 找出错误度序列
# @check: bad
# @check: good
# @hint: 先看奇数度的个数。
sequences=[[3,3,3],[3,3,2,2]]
for sequence in sequences:
    odd_count=1
    for value in sequence:
        if value%2==1:
            odd_count+=1
    print("bad" if odd_count%2 else "good")
```

```quiz
一个图有 6 条边，度和是多少？
- 6
- 12 [*]
- 可能是任意偶数
? 握手定理给出确定值 2m=12。
```

<details>
<summary>选读 · 为什么这个结论可靠</summary>

每条边向两端各发一张票，票总数为 $2m$；顶点收到的票恰好是各度之和，所以度和必为偶数。
</details>

## 7. 方法边界

通过必要检验不代表度序列可实现。下一课从局部统计转向全局可达性。

## 8. 下一站

度数描述局部热闹程度；连通性回答能否抵达。

→ [路径、回路与连通性](./30-paths-connectivity.md)
