---
title: Lean 式证明助手工作流
lesson_id: ai-math/lean-workflow-practice
prereqs:
  - ai-math/formal-proof-assistant
volume: 5
layer: L11
track:
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - proof-goal-state
  - tactic-language
  - sorry-transparency
applications:
  - lean-interactive-proving
  - mathlib-contribution
exits:
  - data-ai
---

# Lean 式证明助手工作流

## 1. 从一个场景开始

上一课我们从"安检员"的视角认识了证明助手：证明是一条语句序列，检查器逐行核对，任何一步不合法就整体拒绝。但真正的日常长什么样？数学家坐在 Lean 里，屏幕上是几行**目标**，他敲一条指令，目标就变形一次；敲错一条，助手立刻报错，绝不揣摩你的意图。prove 你可以慢慢来，check 我只看一瞬间——这正是 2024 年那支在国际数学奥林匹克拿下银牌分段的成绩的 AI 团队（AlphaProof）的日常：它的每一个推理步骤都被迫走完这条流水线。

这一课不复讲检查器的原理（上一课讲透了），专注三件只有亲手做过才懂的事：**目标态怎么被 tactic 改写、错误信息为什么铁面无私、以及"sorry 才是真话"的工程文化**。

## 2. 直觉解释

把证明过程想象成**擦白板**：

- 白板上只挂着一块牌子，写着"待证：结论 C"，牌子旁边贴着你已经拥有的假设小纸条；
- 每个 tactic 就是一种**允许的白板操作**：把箭头拆掉一张纸条、拿一条已知事实抵消整个待证、给变量起名字……；
- 擦到最后牌子上只剩"完成"两个字，证明结束。中途任何一个动作无牌可依，助手会把违例的那一步原样指给你看——它不猜你大概想干什么。

于是"写证明"从一整篇论述，变成了一连串**局部小操作**；每一步错了当场暴露，而不是拖到最后一行才崩盘。这个体验和调试程序一模一样——事实上按 Curry–Howard（上一课选读），它们本来就是同一件事。

## 3. 正式定义

上一课的语句序列视角叫**前向**：从公理不断往上堆新事实。现代证明助手的日常界面是**反向**的，核心对象是目标态：

$$\text{目标态} = \underbrace{h_1 : H_1,\ \dots,\ h_k : H_k}_{\text{手头的假设}} \ \vdash\ \underbrace{G}_{\text{待证结论}}$$

| 要素 | 含义 |
| --- | --- |
| 目标态 | 当前假设清单加上待证结论的组合状态 |
| tactic | 把一个目标态改写成若干更简单目标态的合法指令 |
| 证明完成 | 所有目标都被关闭，通常表现为目标区清空 |
| intro | 把形如 H → G 的目标拆开：H 存为假设，改证 G |
| exact h | 直接出示一条内容恰等于目标的假设，关闭该目标 |

 tactic 序列本身不是证明，它是**生成证明的手柄**：每条指令背后由系统自动补出对应的形式化语句，最后交给内核复核——生成权在你手里，裁决权在内核手里，两者从不混岗。

## 4. 分步例题

用玩具目标 `P -> Q -> P`（若先有 P 再有 Q，则 P）完整走一遍：

1. **开局**：目标区挂着 `P -> Q -> P`，假设清空。它是两层箭头，得拆两层；
2. 第一条 `intro h1`：外层箭头拆除，假设栏新增 `h1 : P`，目标变为 `Q -> P`；
3. 第二条 `intro h2`：再拆一层，新增 `h2 : Q`，目标缩成光秃秃的 `P`；
4. 第三条 `exact h1`：目标恰等于假设 `h1` 的内容 P，瞬间闭合——三条指令，证毕；
5. **反序教训**：若第二条就急着 `exact h1`，此时目标仍是箭头式而非命题 P，助手拒绝——错误信息说的不是"你的证明烂"，而是**此刻没有东西可供出示**。顺序即语义，这是 tactic 工作流的第一个纪律。

## 5. 动手实验

### 热身：先看一座"引理当砖"的大厦

```viz
{
  "type": "proof-trail",
  "title": "整数的乘法交换律是这样盖起来的",
  "steps": [
    { "id": "pa", "text": "基础库：皮亚诺公理" },
    { "id": "plus", "text": "引理A：加法交换律" },
    { "id": "ring", "text": "引理B：半环结构打包" },
    { "id": "natmul", "text": "中间件：自然数乘法交换律" },
    { "id": "intmul", "text": "成品：整数乘法交换律" }
  ],
  "edges": [["pa", "plus"], ["pa", "ring"], ["plus", "natmul"], ["ring", "natmul"], ["natmul", "intmul"]]
}
```

每个节点都是一段通过了机检的代码。删掉中间一条边试试——下游立刻悬空：**库里的一切彼此踩着肩膀**，没有一步凭空。

### 实验 1：亲手推一个恒等式

```python title="玩具版目标态引擎：两步证 A -> A"
GOAL_TEXT = "A -> A"                       # 恒等式：只要 A 成立就有 A

def split_arrow(text):
    return [s.strip() for s in text.split("->")]   # split：按分隔符切碎字符串成列表

def run_goal(goal_text, plan):
    parts = split_arrow(goal_text)
    k = 0                                  # 已拆掉的箭头层数
    hyps = {}                              # 字典：假设名 -> 内容
    for i, step in enumerate(plan):        # enumerate：遍历时同时给出序号
        tactic, arg = step[0], step[1]
        remaining = parts[k:]              # 切片：剩下还没处理的目标
        if len(remaining) > 1:
            if tactic == "intro":
                hyps[arg] = remaining[0]
                k += 1
            else:
                return "第%d步卡住: 目标还是箭头式，只接受 intro" % (i + 1)
        else:
            if tactic == "exact":
                if hyps.get(arg) == remaining[0]:
                    return "全部目标关闭！"
                return "第%d步卡住: 假设 %s 与目标不符" % (i + 1, arg)
            return "第%d步卡住: 目标已是命题，只接受 exact" % (i + 1)
    return "卡住了: 目标还剩 " + " -> ".join(parts[k:])

print(run_goal(GOAL_TEXT, [("intro", "hx"), ("exact", "hx")]))
```

两步，引擎宣布全部目标关闭——**世界上最短的证明长这样**。函数内部那台小板车把目标一层层搬进假设字典，正是真实助手目标区的缩影。

### 实验 2：修好这条被写乱的工作流

下面的计划把第三步抄漏了又抄重了位置：当前它会卡在第 2 步。请调整 `plan` 中元素的排列（不允许增删指令、不允许改参数），让它重新通过。

```exercise
# @title: 练习：修复乱序的 tactic 计划
# @check: 全部目标关闭！
# @check: 步数: 3
# @hint: 只有当目标不再是箭头式时才能 exact；两条 intro 必须都在它前面。h1 和 h2 各占一层箭头。
GOAL_TEXT = "P -> Q -> P"

plan = [
    ("intro", "h1"),
    ("exact", "h1"),     # ← 问题在这：此刻目标还是 Q -> P，无处可示
    ("intro", "h2"),
]

# 下面是和实验 1 相同的引擎，别改它，只排上面的顺序。
def split_arrow(text):
    return [s.strip() for s in text.split("->")]

def run_plan():
    parts = split_arrow(GOAL_TEXT)
    k = 0
    hyps = {}
    for i, step in enumerate(plan):
        tactic, arg = step[0], step[1]
        remaining = parts[k:]
        if len(remaining) > 1:
            if tactic == "intro":
                if arg in hyps:
                    return "第%d步卡住: 假设名 %s 已被占用" % (i + 1, arg)
                hyps[arg] = remaining[0]
                k += 1
            elif tactic == "exact":
                return "第%d步卡住: 目标还是箭头式，还没有命题可供 exact" % (i + 1)
            else:
                return "第%d步卡住: 收到未知指令 %s" % (i + 1, tactic)
        else:
            target = remaining[0]
            if tactic == "exact":
                if arg not in hyps:
                    return "第%d步卡住: 库里找不到假设 %s" % (i + 1, arg)
                if hyps[arg] == target:
                    return "全部目标关闭！"
                return "第%d步卡住: 假设 %s 是命题 %s，不等于目标 %s" % (i + 1, arg, hyps[arg], target)
            if tactic == "intro":
                return "第%d步卡住: 目标已不是箭头式，无箭头可拆" % (i + 1)
            return "第%d步卡住: 只认 intro 和 exact" % (i + 1)
    return "卡住了: 计划走完但目标还剩 %s" % " -> ".join(parts[k:])

print(run_plan())
print("步数:", len(plan))
```

修好后的输出与手演分步例题一一对应。注意唯一的合法解：两条 intro 先后拆掉两层箭头，`exact h1` 收尾——即便调换 `h1`、`h2` 的引入位置，箭头的嵌套结构也锁死了先后，这就是 checker 的语法秩序。

```quiz
Mathlib 这类大规模证明库的持续集成里，含有一个 sorry（未完成的洞）的文件会被怎样对待？
- 只要最终定理看起来有用，就照常并入主库
- 文件必须显式声明这里尚未证完，CI 会一直亮着这块缺口，谁也不许把它悄悄伪装成已完成 [*]
- sorry 会被自动替换成电脑自己找来的证明
? sorry 不是作弊暗道而是工地的黄色围挡：诚实标注进行中的部分，令半成品无法冒充成品。整套大规模协作的可信度正建立在这种透明之上。
```

## 常见误区

:::warning[常见误区]

**误区一**："tactic 是咒语，背熟就行。"
每条 tactic 都对应明确的规则语义（intro 就是拆箭头入假设）。背咒语的人遇到目标形态稍变就寸步难行——读懂目标态永远先于记住指令名。

**误区二**："反正后面还能修，先乱写也没事。"
可以乱试，但要靠真实的报错信息导航，而不是自我感觉。工作流的效率差异几乎全部来自**会不会读报错**：它告诉你的是此刻目标态是什么，而不是骂你笨。

**误区三**："先有证明，再补陈述。"
实际贡献流程相反：先把要证的陈述写到无懈可击并过目检查器，再谈怎么证。陈述一旦定型便成为契约——证明可以一夜推翻重来，陈述的改动牵动所有引用者。（上一课讲过的"陈述本身也要审"，落在工序上就是这一条。）

:::

## 6. 练习

**练习 1**：手工推演 `A -> B -> B`：写出恰好关闭它的一条 tactic 序列，并解释换成 `exact hA` 时报错信息的含义。

<details>
<summary>点开查看逐步解答</summary>

序列：`intro ha`、`intro hb`、`exact hb`。第二条之后目标是命题 B，而 `ha` 的内容是 A——内容不符，助手报"假设 hb..."级别的对照信息；`exact hb` 后目标区清空，完成。巧处在于内层结论恰好等于刚引入的前提，与 `P -> Q -> P` 同构。
</details>

**练习 2**：给玩具引擎增设第三条指令 `apply`：当目标 G 且存在名为 lem 的库引理形状 `L -> G` 时，把目标 G 替换成 L。试着用它把实验 1 改写成另一条路径。

<details>
<summary>点开查看逐步解答</summary>

在引擎的命题分支加入判断：若 `tactic == "apply"` 且目标等于库中该引理的后件，则将 `remaining` 的末位替换为引理的前件。对 `A -> A`，先 `intro hx`，再 `apply id_lemma`（库中存有 `id_lemma : A -> A`），目标变回 A，最后 `exact hx`。真实 Lean 里 apply 的威力正在于此：把陌生结论折返为你熟悉的形状。
</details>

**练习 3**：概念辨析：上一课的"十行迷你检查器"与本课的"目标态引擎"，同样都拦截非法步骤，二者的职责差别在哪？

<details>
<summary>点开查看逐步解答</summary>

前者核对一份**既成的语句序列**是否合规（裁决者）；后者参与**构造过程的每一步**（陪练兼裁判）：它维护目标态、给出可行动作空间。真实系统的分工同理——前端策略引擎陪你写，后端微内核做终审，两层各自独立审计。
</details>

## 7. 选读：前向、后向与第三种模式

<details>
<summary>选读 · 三种书写证明的姿势</summary>

除了前向堆事实（apply 给别人看）与后向拆目标（本课主线），还存在第三种姿势：直接**书写证明项**——绕过 tactic，把表达式一步到位写出来交内核验类型。它的极简范例就是 $\lambda h.\,h$（收到 A 返回 A），正是实验 1 那两步 tactic 编译出的终点。三者关系像三层驾驶模式：前向是手动挡，后向是自动挡，证明项是直接写汇编——同一台发动机（类型检查），三种油门。大型库开发中最常见的折衷是用 tactic 起草、失败处降级为手写项，二者交替推进。
</details>

## 8. 下一站

工作流的尽头是一座庞大到没人读得完的证明库。可那些库存里的 x 与 y 有何不同？接下来看看符号计算——当计算机不再代数字受苦，而是直接操纵这些表达式本身。

→ [符号计算与计算机代数](./60-symbolic-computation-cas.md)
