---
title: 近似与启发式出口
lesson_id: computability/approximation-heuristics
prereqs:
  - computability/graph-reductions
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
  - approximation-ratio
  - heuristic-exit
applications:
  - operations-research
  - large-scale-search
exits:
  - engineering
  - research
---

# 近似与启发式出口

## 1. 从一个场景开始

快递员要访问一百个地址，旅行商问题没有已知的多项式最优算法。但现实包裹明天还是要送。工程不会等复杂度理论解决 P 与 NP，它需要另一种承诺：多快、多近、何时失败。

近似算法给出可证明的差距上界；启发式方法给出经验性捷径。两者都不假装找到最优，却常常足够好用。

## 2. 直觉解释

面对 NP 难问题，至少有四种出口：

| 出口 | 承诺 | 适用场景 |
| --- | --- | --- |
| 精确搜索 | 最优解，但可能慢 | 小规模或强结构实例 |
| 近似算法 | 解值距离最优不超过固定倍率或加法项 | 需要理论保证 |
| 启发式 | 通常快，通常不错 | 大规模实时决策 |
| 参数化 | 某个关键参数小时很快 | 图宽度、冲突数等参数受限 |

**近似比**常写作 $\rho$：若最小化问题的最优值是 $OPT$，算法输出 $ALG$，则要求 $ALG\le \rho\cdot OPT$。最大化问题方向反过来，要求 $OPT\le \rho\cdot ALG$。

启发式没有这个保证。贪心、局部搜索、模拟退火和遗传算法都属于这一族；它们的价值要用基准集、消融实验和失败案例来检验。

## 3. 正式定义

对一个最小化问题，算法 $A$ 是 $\rho$ 近似算法，若：

1. $A$ 对每个输入都在多项式时间停机；
2. 输出是可行解；
3. 对所有实例都有 $cost(A(I))\le \rho\cdot cost^*(I)$。

其中 $\rho$ 可以是常数，也可以是输入规模或对数的函数。

顶点覆盖有一个经典二近似思路：反复选一条尚未覆盖的边，把它的两个端点都放进解里，然后删去所有已被覆盖的边。每个被选边都需要一个端点出现在任何最优解中，因此当前解最多是最优的两倍。

## 4. 分步例题

给定图，边为 AB、BC、CD、DA。

1. 选第一条未覆盖边 AB，把 A、B 放入候选覆盖；
2. 删除 AB；
3. 剩余边 BC 已被 B 覆盖，DA 已被 A 覆盖，但 CD 没有；
4. 再选 CD，把 C、D 放入；
5. 得到覆盖 A、B、C、D，大小 4。

这个四边形的最优覆盖其实是 A 和 C：A 覆盖 AB、DA，C 覆盖 BC、CD，确实可行且大小为 2。二近似保证不差于 4，本例正好达到 4，说明保证可能保守。

## 5. 动手实验

### 实验 1：从证明到工程出口

```viz
{
  "type": "proof-trail",
  "title": "NP 完全之后的三条路",
  "steps": [
    { "id": "标签", "text": "确认问题是 NP 难" },
    { "id": "预算", "text": "确定时间、误差和规模上限" },
    { "id": "保证", "text": "近似算法给最坏差距" },
    { "id": "实验", "text": "启发式用基准检验表现" }
  ],
  "edges": [["标签", "预算"], ["预算", "保证"], ["预算", "实验"]]
}
```

路线选择不是技术高低问题，而是承诺类型不同。不能拿启发式的平均成绩冒充近似比。

### 实验 2：贪心顶点覆盖小实验

```python title="按度数贪心的顶点覆盖"
edges = [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A")]

def degree(vertex, remaining):        # 计算某个点在剩余边中的度数
    total = 0
    for left, right in remaining:
        if left == vertex or right == vertex:
            total += 1
    return total

def greedy_cover(all_edges):
    remaining = all_edges[:]          # 切片复制：得到新列表，避免改动原表
    cover = []
    while remaining:                  # 每轮至少删一条边，必然结束
        best = None                    # None 表示还没有选出任何点
        best_score = -1
        for v in ["A", "B", "C", "D"]: # 依次取出四个候选顶点
            score = degree(v, remaining)
            print("check", v, score)
            if score > best_score:
                best_score = score
                best = v
        cover.append(best)
        remaining = [e for e in remaining if best not in e]  # 推导式保留不含 best 的边
    return cover

print(greedy_cover(edges))
```

第一轮四个点度数都是 2，代码会选 A 并删去 AB、DA；第二轮 C 度数为 2，B、D 为 1，于是选 C。最终得到 A、C，恰好是这个四边形的最优覆盖。换一张图后同一策略就可能失去最优性。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为近似比是平均值。它约束所有实例，包括构造出来专门打击算法的坏例。

**误区二**：你以为启发式结果好就等于近似算法。缺少对所有实例的证明，就只能报告经验性能。

**误区三**：你以为 NP 完全意味着必须放弃精确解。许多真实实例规模小或有特殊结构，精确方法仍然可行。

:::

## 7. 练习

```exercise
# @title: 练习：修复可行覆盖检查器
# @check: False
# @check: True
# @hint: 每条边至少要有一个端点在覆盖中；发现漏边应立即返回 False。
edges = [(0, 1), (1, 2), (2, 3)]

def is_cover(selected):
    covered = 0                        # 计数器：记录已被覆盖的边数
    for left, right in edges:
        if left in selected or right in selected:
            covered += 1               # 只要一端入选，这条边就被覆盖
    return covered > 0                 # ← 这个判定条件太宽松

print(is_cover([0]))
print(is_cover([0, 2]))
```

初始代码只检查“是否覆盖了至少一条边”，所以 `[0]` 会被误判为可行。请把返回条件改成“覆盖数量等于全部边数”，让每条边都必须有端点入选。

<details>
<summary>点开查看逐步解答</summary>

把最后一行改成 `return covered == len(edges)`。`[0]` 只覆盖一条边，会漏掉 `(1,2)` 和 `(2,3)`，所以不可行；`[0,2]` 覆盖三条边，可行。若还要比较质量，可在可行后再检查 `len(selected)` 是否小于已知最优值；近似分析的关键正是把这个“可行性”与“离最优多远”分开处理。

</details>

## 8. 快问快答

```quiz
近似算法和普通启发式最重要的区别是什么？
- 近似算法一定更复杂
- 近似算法对所有实例给出可证明的差距上界 [*]
- 启发式永远找不到最优解
? 两者的分界是承诺强度：一个是定理，另一个通常是经验结论。
```

## 9. 选读：有些 NP 难问题很难近似

<details>
<summary>选读 · 困难也有梯度</summary>

并非所有 NP 难问题都能接受任意好的多项式近似。某些优化问题在常见复杂性假设下不存在固定比率近似；另一些则有多项式对数近似甚至更好的方案。研究这些边界需要 PCP 定理等工具。本章只建立直觉：NP 完全性回答“找精确解难吗”，近似复杂性继续追问“找接近精确的解也难吗”。

</details>

## 10. 下一站

近似解决了交付压力，但没有画出完整资源地图。下一课把 P、NP、PSPACE 和指数时间放在同一张图上看包含关系。

→ [复杂度类地图](./80-complexity-map.md)
