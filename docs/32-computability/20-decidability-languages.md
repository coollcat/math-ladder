---
title: 可判定性与语言
lesson_id: computability/decidability-languages
prereqs:
  - computability/turing-machine
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - recursive-language
  - recursively-enumerable-language
applications:
  - specification-checking
  - parser-design
exits:
  - research
---

# 可判定性与语言

## 1. 从一个场景开始

老师批卷有两种风格：一种保证每份卷子都给出“对”或“错”；另一种只在发现正确答案时举手喊“找到了”，遇到错卷可能沉默到下课。第一种叫判定，第二种只是枚举证据。

把所有该喊“对”的输入收集成一个语言，就能精确地问：这台机器到底会不会对每个输入都停机？

## 2. 直觉解释

字母表上的一个**语言**就是一些串组成的集合。例如所有合法括号串构成一门语言，所有能被某程序接受的输入也构成一门语言。

图灵机面对输入串有三种命运：接受、拒绝、不停机。可判定语言排除了第三种。它的机器像一位负责任的裁判，不管证词多么冗长，最终都要落槌。

半可判定更像侦探搜集线索：只要真相属于目标集合，迟早会拿出证据；但若真相不属于，搜索可能永不结束。它能确认“是”，却不保证确认“不是”。

## 3. 正式定义

设 $M$ 是图灵机，$L(M)$ 表示所有被 $M$ 接受的输入串组成的集合。

| 名称 | 条件 | 直觉 |
| --- | --- | --- |
| 递归可枚举语言 | 存在 $M$ 使 $L=L(M)$ | 属于时必有某时刻接受 |
| 递归语言 / 可判定语言 | 存在总是停机的 $M$ 使 $L=L(M)$ | 每条输入都得到是或否 |
| 补集可判定 | 语言 $\overline L$ 可判定 | 能可靠回答“不在其中” |

若 $L$ 可判定，则 $\overline L$ 也可判定：同一台判定器交换接受态和拒绝态即可。反之，若 $L$ 与 $\overline L$ 都递归可枚举，可以让两台机器交替各走一步；无论输入在哪一边，总会有一方接受，因此 $L$ 可判定。

## 4. 分步例题

例 1：语言 $A=\lbrace$ 所有长度为偶数的 0/1 串 $\rbrace$。

1. 读写头从左到右扫过整串；
2. 用状态交替记录“目前长度为奇”和“目前长度为偶”；
3. 扫到空白时，若是偶状态则接受，否则拒绝。

每条输入都会在有限步后到达空白，所以 $A$ 可判定。

例 2：某程序不断生成候选自然数，并把满足神秘性质的数打印出来。

1. 若至少存在一个这样的数，程序迟早打印它；
2. 这说明“非空”是半可判定的；
3. 但若它一直没有打印，你不能区分“还没有搜到”和“根本不存在”。

因此“非空”可能只有单向保证。

## 5. 动手实验

### 实验 1：裁判与探照灯

```viz
{
  "type": "proof-trail",
  "title": "从半可判定走向可判定的一条桥",
  "steps": [
    { "id": "两侧", "text": "L 与补集各有枚举器" },
    { "id": "交替", "text": "让两台机器轮流各走一步" },
    { "id": "命中", "text": "输入必属某一侧，故必有一侧接受" },
    { "id": "裁决", "text": "接受方决定是/否并停机" }
  ],
  "edges": [["两侧", "交替"], ["交替", "命中"], ["命中", "裁决"]]
}
```

这张链路图解释了一个关键技巧：单独的枚举器不能回答否定问题；两个互补枚举器一起赛跑，就把无限等待变成有限裁决。

### 实验 2：有限世界里的双向检查

```python title="交替搜索两个有限清单"
yes_list = ["cat", "dog", "bird"]     # 已知属于语言的样本
no_list = ["fish", "tree", "rock"]    # 已知不属于语言的样本
target = "bird"

i = 0                                 # 共同步数
answer = "unknown"                    # unknown 表示尚未裁决
max_steps = len(yes_list) + len(no_list)  # len() 返回清单长度，用来设预算
while answer == "unknown" and i < max_steps:
    if i < len(yes_list) and yes_list[i] == target:
        answer = "yes"                # 正侧枚举器命中
    if i < len(no_list) and no_list[i] == target:
        answer = "no"                 # 反侧枚举器命中
    print(i, answer)
    i += 1

print(answer)
```

这里清单有限，当然可以直接查找。实验的重点是流程：两侧交替推进，任一侧命中即停。无限世界里同样的逻辑依赖“目标必居其一”，才能保证不会两边都没等到。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为“能慢慢找到所有成员”就等于可判定。枚举器对不属于语言的串可能永不表态。

**误区二**：你以为拒绝就是不接受。可判定语境里拒绝也是明确停机；卡住不算拒绝。

**误区三**：你以为补集总是同样好处理。半可判定性对补运算非常脆弱，一侧能枚举不代表另一侧也能枚举。

:::

## 7. 练习

```exercise
# @title: 练习：把单向搜索升级成双向裁决
# @check: yes 2
# @check: no 3
# @hint: 每轮都要同时推进正例和反例；任一侧命中后立即返回答案和轮次。
yes_stream = ["apple", "pear", "plum"]
no_stream = ["stone", "glass", "wood"]

def judge(target):
    found = "unknown"
    rounds = 0
    while rounds < len(yes_stream):
        if yes_stream[rounds] == target:
            found = "yes"
            break
        rounds += 1
    return found, rounds

answer, used = judge("pear")   # 解包赋值：把答案和轮次分开交给两个变量
print(answer, used)
answer, used = judge("wood")
print(answer, used)
```

初始代码只看正例流，所以无法可靠回答“不在其中”；而且命中时记下的还只是下标，不是人类可读的“第几轮”。请改为每一轮同时检查 `yes_stream[rounds]` 和 `no_stream[rounds]`，任一侧命中就立刻带着「答案 + 第几轮（从 1 数起）」返回。

<details>
<summary>点开查看逐步解答</summary>

在循环里先令 `attempt = rounds + 1`，再同时检查正例流和反例流；任一侧命中时返回这个人类可读的第几轮。`pear` 出现在下标 1，对应第 2 轮，所以输出 `yes 2`；`wood` 在反例流下标 2，对应第 3 轮，所以输出 `no 3`。这个有限例子之所以安全，是因为我们预先知道每个目标必然出现在某一侧；无限世界的对应论证也需要这个“必居其一”的前提。

</details>

## 8. 快问快答

```quiz
一门语言可判定的核心要求是什么？
- 成员总能被某台机器最终接受
- 总有一台机器对每条输入停机并给出接受或拒绝 [*]
- 补集一定是空集
? 判定器必须双向裁决；仅保证正向找到证据只是半可判定。
```

## 9. 选读：丘奇-图灵论题下的稳定性

<details>
<summary>选读 · 概念为何不依赖具体机型</summary>

在标准图灵机、多带图灵机和常规编程语言之间，可以在多项式甚至常常只是常数级开销内互相模拟。因此，“是否存在总是停机的程序”这一判定概念不因换成另一种合理模型而改变。复杂度层面的细节可能受模型影响，但可计算性层面的“能可靠判定”具有很强稳健性。这也是后续不可判定证明敢直接谈论“程序”的原因。

</details>

## 10. 下一站

既然每台图灵机都有有限描述，自然会问：能否造一台机器，读入别人的描述并替它运行？下一课拆开这台“程序的解释器”。

→ [通用图灵机](./30-universal-machine.md)
