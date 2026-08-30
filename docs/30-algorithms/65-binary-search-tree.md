---
title: 二叉搜索树：有序数据的家
lesson_id: algorithms/binary-search-tree
prereqs:
  - algorithms/traversal-structures
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
  - binary-search-tree
  - inorder-traversal
  - tree-degeneration
applications:
  - ordered-dictionary
  - database-index
exits:
  - engineering
  - research
---

# 二叉搜索树：有序数据的家

## 1. 从一个场景开始

班上的通讯录要支持两件事：按姓名快速找到某人的电话，以及随时新增一个同学。两种朴素方案各有软肋：

- **有序数组**：名字排好队，翻中间一页就能砍掉一半——查找飞快。可新同学一来，插入位置后面的所有人都要整体后挪，挪一次动全班；
- **哈希表**（第 50 课[哈希、冲突与期望分析](./50-hashing-collisions.md)）：插入、查找都是 $O(1)$，但它只回答"这个人在不在"，问它"通讯录里按顺序排第五的是谁""比李明大的最小的名字是谁"，它只能摊手；
- **堆**（上一课[栈、队列、堆与图遍历](./60-stack-queue-traversal.md)）：只承诺"最小值在顶"，第 2 小、第 3 小、比某个值大的最小值，它一概答不上。

需要一个**随时保持整体有序**的家：插入不挪人，查找走捷径，还能按顺序整队点名。第 40 课[排序下界与决策树](./40-sorting-lower-bound.md)里那个用来证明天花板的"决策树"是抽象道具，不能住人；把它变成真仓库，就是本课的主角——**二叉搜索树**。

## 2. 直觉解释

回忆猜数字游戏：心里想一个 1 到 100 的数，每猜一次只告诉你"大了"还是"小了"。聪明的猜法永远猜区间正中，七次必中——每问一次，嫌疑范围砍一半。

二叉搜索树（Binary Search Tree，简称 BST）就是把这场游戏**固化成建筑**：每个节点存一个数，并且立下家规——

```text
            8
          /   \
         3     10
        / \      \
       1   6      14
          /      /
         4      13
```

从 8 往下找 6：6 比 8 小，往左；6 比 3 大，往右——正好两步到家。**每走一步都淘汰一整棵子树**，这正是猜数字"砍一半"的树形版本。家规越被遵守（树越匀称），淘汰越狠；要是家规形同虚设（树歪成一条线），每步只淘汰一个——查找退化成一页页翻名单。

## 3. 正式定义

**二叉搜索树性质**：树中每个节点 $x$ 都满足——

- 左子树里的**所有**节点值 $< x$；
- 右子树里的**所有**节点值 $> x$；
- 左右子树各自也是 BST（递归定义）。

注意是"左子树全体"，不只是左孩子：下图中 13 在根 8 的右子树里、又大于 10，合法；但如果把 2 挂到 10 的左边，虽然 2 < 10 满足"局部规矩"，2 < 8 却违反了"在 8 右子树必须全体大于 8"的**全局**规矩——这是 BST 最常被误解的一条。

**两条直接推论**：

1. **查找/插入的成本是 $O(h)$**，$h$ 为树高：每步下沉一层，最多走 $h$ 步（对照：有序数组查找 $O(\log n)$ 但插入 $O(n)$；无序数组插入 $O(1)$ 但查找 $O(n)$——BST 把两种成本统一挂在了树高上）；
2. **中序有序定理**：对 BST 做"左子树 → 根 → 右子树"的中序遍历，得到的序列**从小到大有序**。因为左子树全体更小先出场、根居中、右子树全体更大压轴——家规自动兑换成整队点名。

## 4. 分步例题

**例**：依次插入 8, 3, 10, 1, 6, 14, 4（从空树开始），然后查找 6、中序整队。

1. **插 8**：空树，8 坐根位；
2. **插 3**：3 < 8，往左，左边空着——8 的左孩子；
3. **插 10**：10 > 8，往右——8 的右孩子；
4. **插 1**：1 < 8 往左遇 3，1 < 3 再往左——3 的左孩子；
5. **插 6**：6 < 8 往左遇 3，6 > 3 往右——3 的右孩子；
6. **插 14**：14 > 8 往右遇 10，14 > 10 再往右——10 的右孩子；
7. **插 4**：4 < 8 往左遇 3，4 > 3 往右遇 6，4 < 6 往左——6 的左孩子。成品即第 2 节那棵树；
8. **查找 6**：8 → 3 → 6，三次比较命中，一路"大了/小了"没有回头路；
9. **中序遍历**：先 3 号左子树（1、3、4、6），再根 8，再右子树（10、13、14）——得到 1, 3, 4, 6, 8, 10, 14，从小到大自动排好队 ✓。

## 5. 动手实验

### 实验 1：树高决定命运

同样 $n$ 个节点，匀称的树高约 $\log_2 n$，歪成链的树高是 $n$——查找/插入的成本就挂在这条曲线上：

```viz
{
  "type": "plot",
  "title": "同样是 n 个节点：斜链高度（蓝）vs 匀称树高度（橙）",
  "expr": "x",
  "expr2": "log(x) / log(2)",
  "xmin": 1,
  "xmax": 64,
  "sliders": []
}
```

横轴拖到 64：链形要下沉 64 层，匀称树只要 6 层。两条曲线的差距就是"家规被遵守的程度"——它决定了 BST 是快刀还是蜗牛。

### 实验 2：亲手栽一棵树

```python title="插入与缩进树形打印"
tree = None   # 空树先用 None 占位：None 表示"这里什么都没有"

def insert(node, value):
    # 把 value 插进以 node 为根的子树，返回这棵子树的新根
    if node is None:                  # is None：判断"是不是空位"——空位就长出新节点
        return {"value": value, "left": None, "right": None}   # 字典当节点：值 + 左右两个孩子
    if value < node["value"]:         # 比根小 → 归左子树管
        node["left"] = insert(node["left"], value)
    else:                             # 比根大 → 归右子树管
        node["right"] = insert(node["right"], value)
    return node

def show(node, depth):
    # 把树"放倒"打印：先画右子树，再画自己，最后画左子树，缩进越深层数越深
    if node is None:
        return
    show(node["right"], depth + 1)
    print("      " * depth + str(node["value"]))   # str：数字变文字才能与缩进拼接；字符串乘整数=重复
    show(node["left"], depth + 1)

for value in [8, 3, 10, 1, 6, 14, 4]:
    tree = insert(tree, value)

show(tree, 0)
```

打印出来的树是"横躺"的：每行一个节点，缩进越深的位置离根越远——顶行的 14 是最大值，底行的 1 是最小值，从上往下读恰好从大到小。对照第 2 节的图竖着看，每一个缩进台阶就是一层树枝。

### 实验 3：查找、中序与 sorted 对拍

> 本块直接复用实验 2 栽好的 `tree` 与 `insert`——浮窗里变量跨块保留，但请**按顺序先运行实验 2**；直接单跑本块会报 `NameError: name 'tree' is not defined`。

```python title="查找步数 + 中序遍历 == sorted"
def search(node, target):
    steps = 0
    while node is not None:           # is not None：还没走出树外就继续找
        steps = steps + 1
        if target == node["value"]:   # 命中：交出比较次数
            return steps
        if target < node["value"]:
            node = node["left"]       # 目标更小 → 只可能在左子树
        else:
            node = node["right"]      # 目标更大 → 只可能在右子树
    return -1                         # -1 是"查无此人"的暗号

def inorder(node, acc):
    # 中序遍历：先左子树，再自己，最后右子树
    if node is None:
        return
    inorder(node["left"], acc)
    acc.append(node["value"])         # append：把自己追加到队伍末尾
    inorder(node["right"], acc)

seen = []                             # 收集中序出场的数字
inorder(tree, seen)
print(seen)
print(sorted([8, 3, 10, 1, 6, 14, 4]))
print(seen == sorted([8, 3, 10, 1, 6, 14, 4]))   # == 逐个位置比较两个列表是否完全相同

print(search(tree, 6))                # 8 → 3 → 6，三次比较
print(search(tree, 5))                # 5 不在树里，走到空位返回 -1
```

中序队伍与 `sorted()` 的答案逐位相等——**中序有序定理**的实测版：往树里塞数据时从不排序，可只要按中序走一圈，队伍自动整齐。查找 5 的最后一段路（6 → 4 → 空）还顺手演示了"查无此人"如何干净利落地收场。

### 实验 4：最坏情况——树歪成一条链

```python title="按序插入 1..8：家规还在，捷径没了"
def height(node):
    # 树高：从根到最远叶子的层数
    if node is None:
        return 0
    left_h = height(node["left"])
    right_h = height(node["right"])
    taller = right_h                  # 手写"取大"：两个分支比一比
    if left_h > right_h:
        taller = left_h
    return taller + 1

balanced = None
for value in [8, 4, 12, 2, 6, 10, 14, 1]:   # 大中小穿插着入场，树长得匀称
    balanced = insert(balanced, value)

chain = None
for value in [1, 2, 3, 4, 5, 6, 7, 8]:      # 从小到大依次入场——每人都比前任大，全往右边挂
    chain = insert(chain, value)

print(f"同一批 8 个数：匀称树高度 {height(balanced)}，斜链高度 {height(chain)}")
print(f"找最深的数据：斜链里找 8 要比较 {search(chain, 8)} 次，匀称树里找 1 只要 {search(balanced, 1)} 次")
```

按 1, 2, 3, …, 8 的顺序插入，每个新值都大于树上所有人，于是一个个挂向右边——BST 退化成一条 $O(n)$ 的**链表**，"砍一半"的魔法归零。这正是第 40 课"坏 pivot 的快排是长歪的决策树"的姊妹篇：**数据顺序不受控时，最坏情况总会来敲门**。解药是给树请一位健身教练——AVL 树、红黑树等**自平衡树**在每次插入后做几次"旋转"把树捋匀，把树高压死在 $O(\log n)$（本课只报名字，它们的旋转术留给后续课程）。

### 快问快答

```quiz
对二叉搜索树做中序遍历（左子树、根、右子树），得到的是？
- 按插入顺序排列的数据
- 从小到大的有序序列 [*]
- 从大到小的倒序序列
? BST 家规保证左子树全体更小、右子树全体更大，中序遍历正好按"小—中—大"出场。插入顺序只决定树的形状，不决定中序结果。
```

::::warning[常见误区]

**误区一**："左孩子 < 根 < 右孩子就是 BST。" 不够。规矩约束的是**整棵子树**：根右边的所有节点都要大于根。只看孩子，2 挂在 10 左边（10 在根 8 右边）这种"局部合法、全局违规"的树就会被误判为 BST。

**误区二**："BST 和堆差不多，都是有序树。" 承诺完全不同：堆只承诺"父 ≤ 子"，能秒答最小值；BST 承诺"左小右大"，能按序整队、按范围查询。同一批数据，堆的中序遍历一塌糊涂，BST 的中序遍历直接有序——两位是分工不同的邻居。

**误区三**："BST 天生就是 $O(\log n)$。" 它的成本是 $O(h)$，$h$ 由插入顺序决定：顺序插入退化成链，查找掉到 $O(n)$。只有树被维持得足够匀称（自平衡树负责这件事），$\log n$ 的承诺才兑现。

::::

## 6. 练习

**练习 1**：把 7, 5, 12, 3, 6, 9, 15 依次插入空 BST，画出树形；再写出查找 9 经过哪些节点。

<details>
<summary>点开查看逐步解答</summary>

7 坐根；5 < 7 挂左，12 > 7 挂右；3 < 7 < 往左遇 5，3 < 5 挂 5 左；6 > 5 挂 5 右；9 < 12 挂 12 左；15 > 12 挂 12 右。树形：根 7，左孩子 5（左 3、右 6），右孩子 12（左 9、右 15）。查找 9：9 > 7 往右 → 9 < 12 往左 → 命中，比较 3 次——树高 3，任何查找都不超过 3 步。中序整队：3, 5, 6, 7, 9, 12, 15 ✓。
</details>

**练习 2**：下面的插入函数能跑，可中序队伍竟然从大到小——把它修到判题通过：

```exercise
# @title: 练习：给 BST 立正家规
# @check: [1, 3, 4, 6, 8, 10, 14]
# @check: 3
# @hint: 中序居然倒序，说明每个节点都站反了边。家规是"比根小归左、比根大归右"——对照 search 里"目标更小往哪边走"，检查 insert 的两个分支是不是写反了。
tree = None

def insert(node, value):
    # 把 value 插进以 node 为根的子树，返回这棵子树的新根
    if node is None:
        return {"value": value, "left": None, "right": None}
    if value < node["value"]:
        node["right"] = insert(node["right"], value)   # ← 小的数被塞去了哪边？
    else:
        node["left"] = insert(node["left"], value)     # ← 那大的数该去哪边？
    return node

def inorder(node, acc):
    # 中序遍历：左子树 → 自己 → 右子树
    if node is None:
        return
    inorder(node["left"], acc)
    acc.append(node["value"])
    inorder(node["right"], acc)

def search(node, target):
    steps = 0
    while node is not None:
        steps = steps + 1
        if target == node["value"]:
            return steps
        if target < node["value"]:
            node = node["left"]
        else:
            node = node["right"]
    return -1

for value in [8, 3, 10, 1, 6, 14, 4]:
    tree = insert(tree, value)

seen = []
inorder(tree, seen)
print(seen)
print(search(tree, 6))
```

<details>
<summary>点开查看逐步解答</summary>

insert 的两个分支写反了：比根小的该走左边，比根大的该走右边。反着的家规长出一棵**镜像树**，中序自然从大到小（初始码输出 `[14, 10, 8, 6, 4, 3, 1]`，查找 6 也一路撞墙返回 -1）。把两个分支对调后，中序输出 `[1, 3, 4, 6, 8, 10, 14]`，查找 6 走 8 → 3 → 6 三次比较命中——search 本身没病，病在家规：**查找与插入必须遵守同一套左右规矩**，这就是 BST 的"合同"。
</details>

**练习 3**：往空 BST 依次插入 n, n-1, n-2, …, 3, 2, 1，树长什么样？查找成本是多少？谁会来救场？

<details>
<summary>点开查看逐步解答</summary>

每个新值都比树上所有人小，全往左边挂——退化成向左倒的斜链，与实验 4 向右倒的链互为镜像，树高 $n$，查找/插入都是 $O(n)$：BST 最怕"按序入场"的数据（升序右斜、降序左斜）。救场的是**自平衡树**：AVL 树给每个节点记"左右高度差"，一旦差超过 1 就旋转复位；红黑树用红黑染色约束放宽一点、旋转更省。它们保证 $h = O(\log n)$，让 BST 的 $\log n$ 承诺在任何插入顺序下都兑现。工程里的有序字典、数据库索引，底下几乎都是这些平衡树的变种。
</details>

## 7. 选读：中序为什么必然有序

<details>
<summary>选读 · 用归纳法把家规兑换成整队</summary>

对树高归纳。空树中序为空序列，有序 ✓。设结论对更矮的树成立，考虑以 $x$ 为根的 BST：由家规，左子树全体 $< x$、右子树全体 $> x$；中序序列 = "左子树中序" + $x$ + "右子树中序"。由归纳假设前后两段各自有序；又左段每个数 $< x <$ 右段每个数，三段首尾相接仍有序 ✓。归纳闭合，中序有序定理得证。反过来它还是一把检测尺：对任何二叉树做中序遍历，结果有序**当且仅当**它是 BST——比逐个节点检查"子树全体"省事得多。至于怎么让树一直长得匀称，AVL 与红黑的旋转术、以及"随机打乱插入顺序也能近似匀称"的概率把戏，都在后续课程等你。

</details>

## 8. 下一站

至此，章名里的"数据结构"四件套——栈、队列、堆、有序树——全部到齐。去章首页接受「外卖骑手的送餐路线」综合考验，检验你手里这套工具箱的成色吧！

→ [第 30 章 · 实战挑战](./index.md#实战挑战--外卖骑手的送餐路线)
