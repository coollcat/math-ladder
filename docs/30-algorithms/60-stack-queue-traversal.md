---
title: 栈、队列、堆与图遍历
lesson_id: algorithms/traversal-structures
prereqs:
  - graph-theory/paths-connectivity
  - graph-theory/shortest-path
  - algorithms/asymptotic-growth
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
  - lifo-stack
  - fifo-queue
  - binary-heap
  - priority-queue
applications:
  - task-scheduling
  - undo-history
  - event-driven-simulation
exits:
  - engineering
---

# 栈、队列、堆与图遍历

## 1. 从一个场景开始

同一条地铁线路，两种逛法：**深度优先**——沿一条线坐到头再折返换线；**广度优先**——把相邻站点一圈圈铺开。图论卷（第 29 章）已经见过它们；本课回答一个更底层的问题：**是什么在决定"下一个访问谁"？**

答案是三个容器：栈说"后来者先走"，队列说"先来者先走"，堆说"优先级最高者先走"。换容器，遍历性格立刻改变。

## 2. 直觉解释

- **栈（Stack）**：食堂里叠盘子。放新盘压顶上，取也只从顶上取——**后进先出**（LIFO）。浏览器"后退"按钮、编辑器的撤销历史，都是栈在打工。
- **队列（Queue）**：奶茶店排队。新来的排尾，取餐从队头叫号——**先进先出**（FIFO）。打印机任务、客服排队，天生的公平主义。
- **堆（Heap）**：急诊分诊台。不看先来后到，**病重的先看**——按优先级出场的队列。它用一棵"父不大于子"的二叉树守住承诺，每次出场只花 $O(\log n)$。

放进图遍历：待访问的候选点装进容器——用栈就是 DFS，用队列就是 BFS，用堆就是 Dijkstra 的优先队列版本。第 29 章的"水位上涨"直觉，此刻露出机械细节。

## 3. 正式定义

三种抽象数据类型的核心操作与时间承诺：

| 容器 | 出场规则 | 核心操作 | 数组实现代价 |
| --- | --- | --- | --- |
| 栈 | 后进先出 | push / pop（均在顶端） | $O(1)$ |
| 队列 | 先进先出 | 入队 / 出队（两端） | $O(1)$（环形数组） |
| 二叉堆 | 最小者先出 | 插入 / 取最小 | $O(\log n)$ |

**二叉堆性质**：数组 $a$ 从下标 0 开始存，节点 $i$ 的两个孩子位于 $2i+1$ 与 $2i+2$，且每个父亲 $\le$ 它的孩子（小根堆）。于是最小值永远住在根——下标 0。插入时把新元素放到末尾再**上浮**（与父亲比、逆序就交换），取出时拿走根、把末尾元素搬到根再**下沉**。树高 $\log_2 n$ 决定了上浮/下沉最多走这么多步。

## 4. 分步例题

**例**：依次把 a, b, c 推入容器再全部弹出，比较三种容器：

1. **栈**：a 进、b 压住 a、c 压顶；弹出顺序 c → b → a，恰好倒序；
2. **队列**：a 头、b 中、c 尾；出队顺序 a → b → c，原序保真；
3. **小根堆**（设字母表顺序即优先级）：插入时 c 上不去顶，根始终是 a；三次取最小给出 a → b → c——但若混入大写字母等"权重"，出场次序立刻由权重改写。
4. 观察：栈倒转时间，队列保存时间，堆无视时间只认权重。同一批输入，三张出场名单。

## 5. 动手实验

### 实验 1：同一个列表，两种弹法

```python title="栈与队列：只差 pop 括号里的一个数"
letters = ["a", "b", "c", "d"]

work = letters.copy()            # copy：复制一份列表，免得两个实验互相污染
stack_out = []
while len(work) > 0:
    stack_out.append(work.pop()) # pop() 不带参数：从末尾弹出——栈的脾气

work = letters.copy()
queue_out = []
while len(work) > 0:
    queue_out.append(work.pop(0)) # 队列从"头"出队：pop(0) 取走最先进来的元素

print(f"栈弹出: {''.join(stack_out)}")
print(f"队列出队: {''.join(queue_out)}")
```

修好第二处后观察：栈输出 `dcba`（时间倒流），队列输出 `abcd`（原样重演）。一个下标之差，性格天壤之别。

### 实验 2：亲手搭一个小根堆

```python title="数组版二叉堆：插入与上浮"
heap = []                        # 用普通列表当堆：父子关系全靠下标算

def sift_up(heap, idx):
    # 上浮：只要比父亲小就和父亲换位置，直到顶或不再更小
    while idx > 0:
        parent = (idx - 1) // 2          # 父亲的下标公式
        if heap[idx] < heap[parent]:
            heap[idx], heap[parent] = heap[parent], heap[idx]
            idx = parent
        else:
            break

for value in [7, 3, 9, 1, 5]:
    heap.append(value)           # 新元素先排在末尾
    sift_up(heap, len(heap) - 1)
    print(f"插入 {value} 后数组 = {heap}")

print(f"根节点（最小值）= {heap[0]}")
print(f"孩子公式验证：0 号的两个孩子在 1 和 2 -> {heap[1]}, {heap[2]}")
```

每一步打印都能看到"末尾出生、逐级上浮"的过程；最终数组满足"父 ≤ 子"，但兄弟之间不排序——堆只承诺一件事：最小值在最上面。

### 实验 3：把堆画成柱状图

```viz
{
  "type": "datachart",
  "labels": [
    "0根",
    "1",
    "2",
    "3",
    "4"
  ],
  "values": [
    1,
    3,
    9,
    7,
    5
  ]
}
```

对照实验 2 最终数组 `[1, 3, 9, 7, 5]`：最小值 1 稳坐 0 号根位，但整列柱子并不是一条上升的坡——1 号格（3）和它的兄弟 2 号格（9）谁高谁矮毫无约束。堆只承诺"父 ≤ 子"，从不承诺兄弟有序。

### 快问快答

```quiz
把 BFS 的队列换成栈，得到的是？
- 仍然是 BFS，只是更快
- DFS 式的遍历：总是钻最新发现的那条岔路 [*]
- 既不是 BFS 也不是 DFS 的随机游走
? 容器的出场规则决定遍历性格：栈后进先出，于是每次都深入最新发现的分支——这正是 DFS 的定义。
```

:::warning[常见误区]

**误区一**："堆是完全排序的数组。" 堆只保证父 ≤ 子，兄弟无序、跨枝更无序；要完整有序得连续 pop n 次。

**误区二**："pop(0) 是免费的。" 对 Python 列表它是 $O(n)$（后面全体左移）；生产代码用双端队列 deque 或环形数组才兑现 $O(1)$ 承诺。

**误区三**："Dijkstra 就是 BFS。" 只有当所有边权相等时两者才重合；加权图上队列必须升级成堆，让"当前距离最近"的点先出场。

:::

## 6. 练习

**练习 1**：序列 1,2,3 依次 push 进栈，中途穿插 pop：push1、push2、pop、push3、pop、pop。写出三次 pop 各弹出什么。

<details>
<summary>点开查看逐步解答</summary>

第一次 pop 弹 2（2 在顶），第二次弹 3（刚 push 完它在顶），第三次弹 1。输出序列 2,3,1 是"合法的栈弹出序列"大家族的一员；不是所有排列都合法——比如 3,1,2 就做不到。
</details>

**练习 2**：修复实验 1 的队列一行后，把 letters 改成 `["x", "y"]` 心算两行输出，再运行核对。

<details>
<summary>点开查看逐步解答</summary>

栈：`yx`；队列：`xy`。两个元素的迷你世界已经足够暴露 LIFO 与 FIFO 的分野——长度不是理解容器的门槛。
</details>

**练习 3**：往空堆依次插入 [6, 4, 8, 2]，写出每次插入后的数组快照。下面的 sift_up 藏了两处初学者笔误——先跑一遍，看看它搭出来的到底是什么形状，再把它修成小根堆。

```exercise
# @title: 练习：堆的上浮追踪
# @check: [6]
# @check: [4, 6]
# @check: [4, 6, 8]
# @check: [2, 4, 8, 6]
# @hint: 小根堆的承诺是"父亲 ≤ 孩子"。盯住 sift_up 里交换的那个条件：现在的写法会把更大的数换上去，还是更小的数换上去？另外，每交换一次还要让 idx 移到父亲的位置，才能一层层继续上浮。
heap = []

def sift_up(h, idx):
    while idx > 0:
        parent = (idx - 1) // 2          # 父亲的下标公式
        if h[idx] > h[parent]:           # ← 这一行藏着本课最经典的笔误：比较方向对吗？
            h[idx], h[parent] = h[parent], h[idx]
        else:
            break

for value in [6, 4, 8, 2]:
    heap.append(value)           # 新元素先排在末尾
    sift_up(heap, len(heap) - 1)
    print(heap)
```

<details>
<summary>点开查看逐步解答</summary>

问题出在交换条件：写成 `h[idx] > h[parent]` 会把**更大**的元素换到上面，实际搭出的是"父亲 ≥ 孩子"的大根堆形状——初始码输出 `[6]`、`[6, 4]`、`[8, 4, 6]`、`[8, 4, 6, 2]`。把比较符改回 `<`：只有比父亲小，才配往上走。此外每次交换后还要执行 `idx = parent`、挪到父亲的位置，否则没法一层层继续上浮。

```python
heap = []

def sift_up(h, idx):
    while idx > 0:
        parent = (idx - 1) // 2
        if h[idx] < h[parent]:       # 只有比父亲小才交换上浮
            h[idx], h[parent] = h[parent], h[idx]
            idx = parent
        else:
            break

for value in [6, 4, 8, 2]:
    heap.append(value)
    sift_up(heap, len(heap) - 1)
    print(heap)
```

四次快照依次为 `[6]` → `[4, 6]` → `[4, 6, 8]` → `[2, 4, 8, 6]`：最后的 2 从末尾连跳两级坐上根位。注意最终数组并非完全有序（8 排在 6 前面）——这正是"堆只承诺父 ≤ 子"的活例子。
</details>

**练习 4**：为什么堆取最小是 $O(\log n)$ 而普通无序列表取最小是 $O(n)$？

<details>
<summary>点开查看逐步解答</summary>

无序列表没有结构承诺，只能全员点名一遍；堆的"父≤子"承诺把信息组织成一棵平衡二叉树，下沉路径长度等于树高 $\log_2 n$。这是"维护结构的成本换取查询的速度"的经典交易——哈希表的扩容账单也是同一旋律。
</details>

## 7. 选读：为什么堆化（heapify）只需 O(n)

<details>
<summary>选读 · 从一半高度开始打折</summary>

把任意数组原地变成堆：从最后一个非叶节点起逐个下沉。粗看是 $n$ 个节点各付 $\log n$，其实大部分节点住在底层、下沉距离极短：约 $\frac{n}{2}$ 片叶子付 0 步、$\frac{n}{4}$ 付至多 1 步……总代价是 $\sum \frac{n}{2^{k+1}} \cdot k = O(n)$。级数求和又一次证明"多数人很浅"胜过"少数人很深"——与决策树一课的均衡思想互为镜像。

</details>

## 8. 下一站

三大容器的机械部分到此齐备。把它们装回图论卷学过的 Dijkstra 与 BFS 里反复拆装，本章的实战挑战正等着你——去章首页接受「外卖骑手的送餐路线」综合考验吧！实战之前容器架已添一位新成员：只认"左小右大"家规的有序树，在[二叉搜索树](./65-binary-search-tree.md)等你。

→ [第 30 章 · 实战挑战](./index.md#实战挑战--外卖骑手的送餐路线)
