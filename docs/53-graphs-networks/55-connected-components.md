---
title: 连通分量与代数判据
lesson_id: graphs-networks/connected-components
prereqs:
  - graphs-networks/spectral-layout
volume: 5
layer: L11
track:
  - discrete-computing
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - algebraic-connectivity
applications:
  - network-reliability
  - protein-complex-analysis
exits:
  - engineering
  - data-ai
---

# 连通分量与代数判据

## 1. 开场钩子

光缆断开后，网络可能没有消失，而是裂成几块互不相通的区域。肉眼能看小图，程序需要判据：Laplacian 零特征值出现几次，图就分成几个连通分量。

这一课把遍历计数和特征值计数放在一起验证。

## 2. 直觉解释

连通分量是“能互相到达”的最大节点组。两个三角形之间没有桥时，就是两个分量；加一座桥后变成一个分量。

Laplacian 的能量公式说明：在每个分量内取同一个常数、不同分量取不同常数，所有相邻差异仍为 0。这样的独立常数有几个，零特征值就有几个。

## 3. 正式定义

对无向图 $G$，其 Laplacian $L$ 的零特征值重数等于连通分量数 $c$：

$$\text{nullity}(L)=c.$$

$\lambda_2$ 也叫代数连通度：

- 若图不连通，则 $\lambda_2=0$；
- 若图连通，则 $\lambda_2>0$；
- $\lambda_2$ 越大，通常越难用少量边把图切开。

## 4. 分步例题

五个节点分成两组：三角形 A-B-C 和一条边 D-E。

1. 第一组内部互相可达；
2. 第二组 D 与 E 互相可达；
3. 两组之间没有任何边；
4. 分量大小是 `[3, 2]`；
5. Laplacian 有两个零特征值，代数判据同样给出 2。

## 5. 动手实验

下面代码用两种方法数同一张图。删除或增加跨组桥，观察两种结果同步变化。

```python title="遍历计数与零特征值对照"
import numpy as np # NumPy 已在上一课正式引入，这里用于求特征值

n = 5
edges = [(0, 1), (1, 2), (0, 2), (3, 4)]
A = [[0 for c in range(n)] for r in range(n)]
for u, v in edges:
    A[u][v] = A[v][u] = 1

unvisited = set(range(n))       # 未访问节点的编号集合
sizes = []
while unvisited:                # 每轮处理一个新的连通分量；集合会变小，不会死循环
    start = sorted(unvisited)[0] # 取最小未访问编号，避免引入新的内置函数
    stack = [start]
    unvisited.remove(start)
    size = 0
    while stack:                # 栈为空时结束当前分量搜索
        node = stack.pop()      # pop 取出栈顶并访问
        size += 1
        for neighbor in range(n):
            if A[node][neighbor] == 1 and neighbor in unvisited:
                unvisited.remove(neighbor)
                stack.append(neighbor)
    sizes.append(size)

degree = [sum(row) for row in A]
L = np.diag(degree) - np.array(A) # np.array 把嵌套列表变成数组
eigenvalues = np.linalg.eigvalsh(L) # 只求实对称矩阵特征值并升序返回
zero_count = int(np.sum(np.abs(eigenvalues) < 1e-10)) # 用小阈值判断数值零

print(sizes)
print(zero_count)
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为没有边等于不存在结构。“缺失桥”本身就是脆弱性信息。

**误区二**：你以为有向图可直接套这个判据。强连通分量需要不同的代数和算法工具。

**误区三**：你以为浮点特征值会精确为零。实际要用合理误差阈值。

以上三条在蛋白质网这类未观测边很多的真实数据里最容易翻车。

:::

## 7. 练习

```exercise
# @title: 练习：找出所有连通分量大小
# @check: [3, 2]
# @hint: 从未访问点出发，沿无向边扩散；每个起点产生一个分量。
n = 5
edges = [(0, 1), (1, 2), (3, 4)]

graph = {i: [] for i in range(n)}
for u, v in edges:
    graph[u].append(v)

unvisited = set(range(n))
sizes = []
while unvisited:
    start = sorted(unvisited)[0]
    stack = [start]
    unvisited.remove(start)
    size = 0
    while stack:
        node = stack.pop()
        size += 2
        for neighbor in graph[node]:
            if neighbor in unvisited:
                unvisited.remove(neighbor)
                stack.append(neighbor)
    sizes.append(size)

print(sizes)
```

<details>
<summary>点开查看逐步解答</summary>

从 0 出发可到 1、2，得到大小 3。剩下从未访问的 3 出发可到 4，得到大小 2。

所以输出 `[3, 2]`。

</details>

```quiz
无向图 Laplacian 有几个足够接近零的特征值，最稳妥的解释是什么？
- 连通分量个数等于近零特征值个数 [*]
- 图里一定有几个孤立节点
- 所有节点的度都接近零
? 近零阈值要结合数值误差选择；分量可以是很大的连通子图，不一定包含孤立节点。
```

## 8. 判据边界

代数判据优雅，但不免费：大图求全部特征值代价高，加权图要先定义权重，噪声会把接近零的小特征值伪装成分裂证据。工程上常把遍历算法和谱证据配合使用。

## 9. 下一站

既然 Fiedler 向量能指出裂缝，就可以把它变成聚类器：正数一组，负数一组。

→ [谱聚类直觉](./60-spectral-clustering.md)
