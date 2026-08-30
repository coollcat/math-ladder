---
title: 关系代数与 SQL 数学
lesson_id: computer-systems/relational-algebra
prereqs:
  - logic-sets/set-algebra
  - logic-sets/relations-equivalence-order
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L4
track:
  - algebra-structure
  - discrete-computing
stage: university-core
difficulty: 3
introduces_concepts:
  - relation-as-set
  - select-project-join
  - relational-completeness
  - three-valued-logic
applications:
  - sql-query-writing
  - query-planning
  - data-modeling
exits:
  - engineering
---
## 1. 从一个场景开始
```sql
SELECT DISTINCT dept FROM S JOIN E ON S.sid = E.sid WHERE score > 85;
```
这行 SQL 干了三件事：**挑行、挑列、把两张表连起来**。可为什么它"看起来像英语"，却能给出数学上精确的答案？
因为 SQL 不是一门新语言——它是**关系代数**的一套语法糖。所有花哨的查询，最终都能翻译成六个符号的运算。
## 2. 直觉解释
**一张表就是一个集合**，它的元素是"行"（元组）。
这个朴素的观察威力巨大：集合论里的一切运算，都可以直接搬过来用。
- **σ（选择）** = 筛子：行进来，符合条件的留下，**列数不变、行数变少**；
- **π（投影）** = 切刀：只保留指定的列，**行数可能变少（因为要去重）、列数变少**；
- **⋈（连接）** = 配对：按某个键把两张表的行撮合起来；
- **×（笛卡尔积）** = 野蛮配对：所有行两两组合，是 ⋈ 的"浪费版"。
一句话记住 σ 与 π 的区别：**σ 是水平切（割行），π 是垂直切（割列）。**
## 3. 正式定义
**关系（relation）**：给定属性集 $A = \lbracea_1,\ldots,a_k\rbrace$，每个属性有值域 $D_i$，关系是笛卡尔积的一个有限子集
$R \subseteq D_1 \times D_2 \times \cdots \times D_k$
$R$ 的元素叫**元组（tuple）**。关系是**集合**，所以**没有重复行、没有行序**——这是它与 Excel 表格的根本差别。
五个基本算子（$\theta$ 是谓词，$X$ 是属性子集）：
| 算子 | 符号 | 定义 | 结果 |
| --- | --- | --- | --- |
| 选择 | $\sigma_\theta(R)$ | $\lbracet \in R \mid \theta(t)\rbrace$ | 列数不变，行数 $\le |
| 投影 | $\pi_X(R)$ | $\lbracet[X] \mid t \in R\rbrace$ | **集合语义，自动去重** |
| 并 | $R \cup S$ | 集合并 | 要求属性**相容** |
| 差 | $R - S$ | 集合差 | 要求属性相容 |
| 笛卡尔积 | $R \times S$ | $\lbrace(r,s) \mid r\in R, s\in S\rbrace$ | $ |
**自然连接**是派生的——它就是"先乘后筛再去重"：
$R \bowtie S \;=\; \pi_{A_R \cup A_S}\bigl(\sigma_{R.k = S.k}(R \times S)\bigr)$
| 符号 | 含义 |
| --- | --- |
| $t[X]$ | 元组 $t$ 在属性集 $X$ 上的分量 |
| $\theta$ | 由比较与逻辑连接词构成的谓词 |
| $k$ | 连接键（公共属性） |
**关系完备性**：$\lbrace\sigma, \pi, \cup, -, \times\rbrace$ 五个算子足以表达关系代数能表达的一切查询。任何 SQL 查询（不含聚合与排序）都能翻译成这五个算子的组合。
## 4. 分步例题
**例**：学生表 $S$（4 行）与选课表 $E$（5 行）。求"选了课的学生所在院系"，即 $\pi_{\text{dept}}(S \bowtie E)$。
1. 先算 $S \times E$：$4 \times 5 = 20$ 行——**绝大多数是垃圾配对**（张三配了一门别人的课）；
2. 再筛 $\sigma_{S.\text{sid} = E.\text{sid}}$：只有 sid 相等的留下。sid=1 有 2 条选课记录、sid=2 有 1 条、sid=3 有 1 条 → **4 行**；
3. 注意丢掉了谁：sid=4（赵六）没选课，sid=5 有选课记录但不在学籍表里——**内连接把两边"对不上"的行全丢了**，要保留得用外连接；
4. 最后投影到 dept：得到 CS、CS、EE、CS → 去重后 **{CS, EE}**，2 行；
5. 结论：从 20 行垃圾配对，一步步收敛到 2 行答案。**中间结果越小越靠前，查询就越快**——这就是查询优化器拼命"把 σ 往下推"的原因。
## 5. 动手实验
### 实验 1（lab）：点一个算子，看结果表和等价 SQL
```lab
{
  "type": "relational-algebra",
  "title": "六个关系算子：σ π ⋈ ∪ − ×"
}
```
先选算子（第一排），再选基表（S 学生表 / E 选课表），最后在参数区挑列和值。结果表**当场算出来**，下方同时给出等价 SQL。
做四组对照：
- **σ**：挑 `dept = CS` → 4 行变 2 行，列数不变；
- **π**：只勾 `dept` → 4 行变 3 行，**因为 CS 出现了两次被自动去重**（这是 SQL 里 `SELECT DISTINCT` 的由来）；
- **×**：S × E = **20 行**（只显示前 8 行）；
- **⋈**：只有 **4 行**。看读数里的说明——`⋈ = σ(×)`，**代价差就在这个 × 上**。
### 实验 2（python）：三个算子的十行实现
```python title="用列表把 σ、π、⋈ 写出来"
S = {                      # 关系 = 列名 + 行（列表套列表）
    "cols": ["sid", "name", "dept", "age"],
    "rows": [[1, "张三", "CS", 20], [2, "李四", "EE", 21],
             [3, "王五", "CS", 19], [4, "赵六", "MA", 22]],
}
E = {
    "cols": ["sid", "course", "score"],
    "rows": [[1, "DB", 92], [1, "OS", 85], [2, "DB", 78],
             [3, "OS", 90], [5, "DB", 88]],
}
def select(R, col, pred):                 # σ：水平切，只留符合条件的行
    i = R["cols"].index(col)
    return {"cols": R["cols"], "rows": [r for r in R["rows"] if pred(r[i])]}
def project(R, cols):                     # π：垂直切，并去重
    idx = [R["cols"].index(c) for c in cols]      # 目标列在原表里的下标
    out = []
    for r in R["rows"]:
        row = [r[i] for i in idx]
        if row not in out:                # 关系是集合，重复行只留一次
            out.append(row)
    return {"cols": cols, "rows": out}
def join(R, T, key):                      # ⋈：只留键值相等的配对
    i = R["cols"].index(key)
    j = T["cols"].index(key)
    rows = [r + t for r in R["rows"] for t in T["rows"] if r[i] == t[j]]
    return {"cols": R["cols"] + T["cols"], "rows": rows}
def show(R):
    print(" | ".join(R["cols"]))
    for r in R["rows"]:
        print(" | ".join(str(v) for v in r))
    print("  (" + str(len(R["rows"])) + " 行)\n")
show(select(S, "age", lambda v: v > 19))     # lambda：临时匿名函数，这里当谓词用
show(project(S, ["dept"]))
show(join(S, E, "sid"))
```
输出依次是 3 行（年龄大于 19 的）、3 行（CS / EE / MA 三个院系）、4 行（连接结果）。**注意 `join` 那个双重列表推导**：它先枚举所有配对再筛选，和 $\sigma(R \times S)$ 的定义一模一样——**自然连接在数学上就是这么定义的**，聪明的实现（哈希连接、归并连接）只是让它不必真的构造出 20 行。
### 快问快答
```quiz
SQL 里写 SELECT dept FROM S 得到 4 行，而关系代数的 π_dept(S) 只有 3 行，为什么？
- 因为 SQL 的 SELECT 默认不去重，要写 DISTINCT 才等价于关系代数的投影 [*]
- 因为关系代数算错了
- 因为两张表里的数据不一样
? 关系是集合，集合里不能有重复元素，所以 π 自带去重。SQL 出于实用考虑默认保留重复行（称为「包语义」/ multiset），想拿到集合语义必须显式写 DISTINCT——这也正是 COUNT(*) 与 COUNT(DISTINCT col) 会给出不同答案的原因。
```
:::warning[常见误区]
**误区一**："`SELECT` 就是关系代数里的投影。" 你以为两者等价——**默认不等价**：投影是集合运算（自动去重），`SELECT` 默认保留重复行。要等价得写 `SELECT DISTINCT`。反过来，SQL 的 `SELECT *` 连投影都算不上（一列都没切）。
**误区二**："连接条件写在 `WHERE` 里还是 `ON` 里，只是风格差别。" 你以为只是写法不同——对**内连接**，优化器通常会把它们归一成同一个执行计划，结果确实相同；但对**外连接**，`ON` 是"配对条件"、`WHERE` 是"配对后再筛"，两者语义完全不同：把左连接的过滤条件误写进 `WHERE`，会把本该保留的 NULL 行一起筛掉，**左连接悄悄退化成了内连接**。
**误区三**："`WHERE score > 85` 与 `WHERE NOT (score <= 85)` 一定互补。" 你以为逻辑上互补——**一旦列里可能出现 NULL，就不成立了**。SQL 用三值逻辑：`NULL > 85` 是 **UNKNOWN**，`NOT UNKNOWN` 仍是 **UNKNOWN**，而 `WHERE` 只保留 TRUE 的行。于是 `score IS NULL` 的那一行**两条查询都不会返回**。这是 SQL 里最经典的静默丢数据事故。
:::
## 6. 练习
**练习 1**：这段代码号称在做自然连接，却输出 20。修到输出 `4`：
```exercise
# @title: 练习：自然连接漏掉了匹配条件
# @check: 4
# @hint: 自然连接只保留「公共属性 sid 相等」的那些配对。代码把所有配对都留下了，那其实是笛卡尔积 R × S
S = [[1, "张三", "CS"], [2, "李四", "EE"], [3, "王五", "CS"], [4, "赵六", "MA"]]
E = [[1, "DB", 92], [1, "OS", 85], [2, "DB", 78], [3, "OS", 90], [5, "DB", 88]]
rows = []
for s in S:
    for e in E:
        rows.append(s + e)     # ← 问题在这：缺一个 s[0] == e[0] 的判断
print(len(rows))
```
**练习 2**：把查询"找出至少有一门课成绩超过 85 分的学生姓名"写成关系代数表达式，并说明查询优化器会怎么安排执行顺序。
<details>
<summary>点开查看逐步解答</summary>
1. 表达式：$\pi_{\text{name}}\bigl(S \bowtie \sigma_{\text{score} > 85}(E)\bigr)$；
2. 优化器会**把选择下推**：先算 $\sigma_{\text{score}>85}(E)$，5 行里筛出 3 行（92、90、88）；
3. 再做连接：$4 \times 3 = 12$ 个配对中筛出 sid 相等的 → 3 行；
4. 若不做下推，先连接得 4 行再筛 → 也是 3 行，**结果一样，但中间结果大得多**（本例差别不大，百万行表上就是几秒与几分钟的差距）；
5. 这就是**查询优化器的核心工作**：在保持等价的前提下，把 $\sigma$ 尽量往下推、把 $\pi$ 尽量往下推，让每一步的中间结果尽可能小。**关系代数的等价变换律（选择可下推、投影可下推、连接可交换可结合）就是它的变换工具箱。**
</details>
## 7. 选读：关系完备性，以及 SQL 超出代数的地方
<details>
<summary>选读 · 五个算子为什么够用，又为什么不够</summary>
**够用**：Codd 证明了 $\lbrace\sigma, \pi, \cup, -, \times\rbrace$ 与一阶逻辑（关系演算）表达能力相当——凡是用"存在/任意 + 属性比较"能说清的查询，这五个算子都能写。$\bowtie$、$\cap$、$\div$（除法，"查选修了全部课程的学生"就是典型的除法）都是派生算子。
**不够**：真实 SQL 至少有三样东西超出了纯关系代数：
| 超出部分 | 例子 | 为什么代数表达不了 |
| --- | --- | --- |
| **聚合** | `SUM`、`COUNT`、`AVG` | 结果不再是"行的子集"，而是对集合的汇总 |
| **排序** | `ORDER BY` | 关系是无序集合，排序只在输出时有意义 |
| **分组** | `GROUP BY` | 先把集合划分成等价类再各自聚合 |
所以严格说 SQL 是"关系代数 + 聚合扩展"，它**不是**纯粹的关系语言。这也是为什么数据库教材在讲完代数之后还要单独讲"扩展关系代数 $\gamma$（分组聚合算子）"。
还有一个微妙点：**递归查询**（`WITH RECURSIVE`，比如查一棵树的所有子孙）超出了关系代数的能力，必须引入**不动点算子**——这与第 80 课选读里的数据流分析不动点，是同一个数学概念。
</details>
## 8. 下一站
关系代数说清了"答案是什么"，却没说"怎么快速找到它"。全表扫描 20 行尚可，两千万行呢？
→ [索引与 B 树](100-btree-lab.md)
