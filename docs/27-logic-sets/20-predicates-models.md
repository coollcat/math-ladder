---
title: 谓词、量词与模型
lesson_id: logic-sets/predicates-models
prereqs:
  - logic-sets/propositional-deduction
  - math-language/quantifiers
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
  - model-structure
  - quantifier-negation
  - witness
applications:
  - database-query
  - program-specification
exits:
  - research
---

# 谓词、量词与模型

## 1. 从一个场景开始

第 18 章你见过 $\forall x\, P(x)$ 和 $\exists x\, P(x)$，也知道量词顺序一换含义就变。但当时有个问题被轻轻放过了：**$P(x)$ 到底是什么意思，是谁说了算？**

"所有人都会跑步"——在幼儿园里是真话，在骨科病房就未必。同一句话，换个人群重新评估，真假翻转。这个"人群"，就是本课的主角：**模型（论域 + 解释）**。

## 2. 直觉解释

一个模型就像一台验钞机的工作环境：

- **论域** $U$：传送带上允许出现的钞票种类（哪些对象在场）；
- **解释**：每个谓词符号接上了具体的判定电路（$P(x)$ 在每个对象上取什么真值）。

离开环境谈真假没有意义。"存在一个人是左撇子"在 10 人班级和全人类面前是两个不同的问题。而**反例搜索**也从此有了精确的形状：要推翻 $\forall x\, P(x)$，只需在论域里翻出一个让 $P$ 为假的对象。

还有一条万能钥匙：**否定号穿过量词时会翻转它**。"不是所有人都到齐" = "有人没到齐"；"没有人不及格" = "所有人都及格"。形式化就是德摩根定律的量词版。

## 3. 正式定义

一个（一阶）**模型**（也叫结构）$\mathcal{M} = (U, P_1^{\mathcal{M}}, P_2^{\mathcal{M}}, \dots)$ 由两部分组成：

| 部件 | 名字 | 作用 |
| --- | --- | --- |
| $U$ | 论域（非空集合） | 变量 $x$ 只能在这里取值 |
| $P_i^{\mathcal{M}} \subseteq U^n$ | 谓词的解释 | 规定每个谓词对哪些对象成立 |

真值规则：$\mathcal{M} \models \forall x\, P(x)$ 当且仅当 $P$ 对 $U$ 中**每一个**元素成立；$\mathcal{M} \models \exists x\, P(x)$ 当且仅当 $P$ 对 $U$ 中**至少一个**元素成立。使 $\exists$ 命题为真的那个具体元素叫 **witness**；使 $\forall$ 命题失败的那个元素叫**反例**。

量词否定律（对任何模型都成立）：

$$\lnot \forall x\, P(x) \;\equiv\; \exists x\, \lnot P(x), \qquad \lnot \exists x\, P(x) \;\equiv\; \forall x\, \lnot P(x)$$

## 4. 分步例题

取论域 $U = \lbrace 2, 3, 4, 5, 6\rbrace$，解释 $E(x)$："x 是偶数"，$P(x)$："x 是素数"。

1. $\forall x\,(P(x) \Rightarrow E(x))$？"所有素数都是偶数"。逐个检查：素数有 $2, 3, 5$，其中 $3$ 不是偶数——反例 $3$，命题为**假**；
2. $\exists x\,(E(x) \land \lnot P(x))$？"存在偶数不是素数"。扫描：$4 = 2 \times 2$ 合格——witness $4$，命题为**真**；
3. 用量词否定律核对第 1 问：它的否定是 $\exists x\,(P(x) \land \lnot E(x))$，即"存在奇素数"——$3$ 和 $5$ 都是，所以原命题确实为假；
4. 换个模型再看第 2 问：若论域缩成 $U' = \lbrace 2\rbrace$，则唯一的偶数 $2$ 是素数，witness 消失，命题变假。**语句没变，模型变了，真假就变了。**

## 5. 动手实验

### 实验 1（viz）：量词猎手——顺序与反例现场

```viz
{
  "type": "quantifier-hunt",
  "title": "每人至少会一项运动吗？",
  "domain": ["小明", "小红", "小刚"],
  "range": ["跑步", "游泳"],
  "relations": [["小明", "游泳"], ["小红", "游泳"], ["小刚", "跑步"]],
  "form": ["forall"]
}
```

绿色格是关系 $R(\text{人}, \text{运动})$。当前状态下 $\forall a\,\exists b\, R(a,b)$ 为真（每行至少一个绿格）。点掉小刚那行的绿格，看反例如何当场揪出；再切换成 $\exists a\,\forall b$，观察结论瞬间翻转——"有人样样精通"比"人人有一手"苛刻得多。

### 实验 2（python）：把模型装进程序里体检

```python title="在小论域上搜索反例与 witness"
numbers = [2, 3, 4, 5, 6, 7, 8, 9]     # 论域 U

def is_even(n):
    return n % 2 == 0                  # % 取余数：除以 2 余 0 就是偶数

def is_prime(n):
    if n < 2:
        return False                   # return：立刻结束函数并把值交回去
    d = 2
    while d * d <= n:                  # 试除法：只要试到根号 n 就够
        if n % d == 0:
            return False
        d = d + 1
    return True

for x in numbers:                      # 检验“所有素数都是奇数”=> 找素数且偶数的对象
    if is_prime(x) and is_even(x):     # and：两个条件都成立才进入
        print("反例: " + str(x))       # str()：把数字转成文字，方便拼接

for x in numbers:                      # 检验“存在偶数不是素数”=> 找一个 witness
    if is_even(x) and not is_prime(x):
        print("witness: " + str(x))
```

输出 `反例: 2` 与 `witness: 4`、`6`、`8`。两条语句在同一模型上一真一假，而机器把证据都翻了出来——这就是量词语句的判定方式：**全称找反例，存在找证人**（存在命题只需一个证人即可结案，多抓几个是顺路的）。

:::warning[常见误区]

**误区一**：你以为 $\forall x\, P(x)$ 为假意味着"所有 $x$ 都不满足 $P$"。其实它只承诺**至少一个**反例；其余元素可能全都合格。

**误区二**：你以为量词可以脱离论域使用。其实"所有""存在"永远相对某个 $U$ 而言；换论域等于换题目。

**误区三**：你以为 $\exists a\,\forall b\, R(a,b)$ 成立就能推出 $\forall b\,\exists a\, R(a,b)$。前者确实更强、推出后者没问题；危险的是反过来——"每人都有一把钥匙开门"推不出"有一把万能钥匙"。

:::

## 6. 练习

```quiz
“班上没有学生不及格”等价于哪一句？
- 所有学生都不及格
- 所有学生都及格 [*]
- 有的学生及格
? 否定号穿过量词时量词翻转：非(存在不及格) = 所有不(不及格)。
```

**练习 1**：写出"$\forall x\, \exists y\, (x + y = 0)$，论域为全体整数"的中文翻译，并给出每个 $x$ 的 witness。

<details>
<summary>点开查看逐步解答</summary>

翻译："对每个整数 $x$，都存在整数 $y$ 使两者之和为零"。witness 是 $y = -x$——每个输入都有专属搭档。注意若把量词换成 $\exists y\,\forall x$，就变成"存在万能 $y$ 与一切 $x$ 相加为零"，整数里找不到这样的 $y$，命题变假。
</details>

**练习 2**：程序想给"所有素数都是奇数"找反例，却把所有奇数都抓了起来。把筛选条件改成正确的反例形状：

```exercise
# @title: 给“所有素数都是奇数”找真反例
# @check: 2
# @hint: 反例必须同时“是素数”且“是偶数”。初始代码只筛了奇数——方向恰好弄反了。
numbers = [2, 3, 4, 5, 6, 7, 8, 9]

def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d = d + 1
    return True

for x in numbers:
    if x % 2 == 1:        # ← 问题在这：抓的是“奇数”，而反例应是“素数且偶数”
        print(x)
```

修好后输出恰好一行 `2`。体会一下：$2$ 是唯一的偶素数，所以它独自撑起了对"所有素数都是奇数"的否决票；而 $9$ 是奇数却不是素数，跟这句话毫无瓜葛。

**练习 3**（概念折叠题）：数据库查询"列出所有未完成订单"对应哪个带否定的量词语句？

<details>
<summary>点开查看逐步解答</summary>

设论域为全部订单，$D(x)$ 表示"x 已完成"。查询语义是 $\lbrace x : \lnot D(x)\rbrace$，等价于先对 $\forall x\, D(x)$ 取否定再用存在量词表述："并非所有订单都已完成"。SQL 里写成 `NOT EXISTS` 或直接筛 `status != 'done'`——量词否定律每天都在生产线上打工。
</details>

## 7. 选读：同一个句子，一千个世界

<details>
<summary>选读 · 为什么逻辑学家关心"模型论"</summary>

命题逻辑只有真值表一种世界；一阶逻辑的世界有无穷多个——每个论域与解释的组合都是一个候选宇宙。"$\Gamma \models \varphi$"（语义蕴含）说的是：**在每一个**让 $\Gamma$ 全真的宇宙里，$\varphi$ 也真。哥德尔完备性定理保证这又等价于"存在形式推导"。于是"所有可能的模型"成了数学家的试金石场：想证明某结论推不出来？构造一个让前提真、结论假的模型即可——这正是下一章"独立性证明"的标准姿势，也是集合论里连续统假设独立性的底层逻辑。
</details>

## 8. 下一站

谓词谈的是"对象满足什么性质"，而集合把这些性质收拢成新的对象。下一课给集合装上并交补的运算台，让恒等式接受机器检阅。

→ [集合运算与证明](./30-set-algebra.md)
