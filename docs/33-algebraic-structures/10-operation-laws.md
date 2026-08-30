---
title: 运算律与结构预告
lesson_id: algebraic-structures/laws-preview
prereqs:
  - math-language/sets-relations-functions
  - numtheory/congruence
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 3
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - algebraic-structure
applications:
  - cryptography
  - symbolic-computation
exits:
  - research
---

# 运算律与结构预告

## 1. 开场钩子

洗牌时，先左转再右转总会回到原地；钟表上，加 9 小时再加 5 小时会落到下午 2 点。两个场景里的对象完全不同，动作却像同一家人。

这一课不急着给它们命名，而是先找共同规则。

## 2. 直觉解释

普通加法有交换律：$a+b=b+a$，顺序不影响结果。乘法对加法有分配律：$a(b+c)=ab+ac$，打包和拆包等价。

但不是所有“结合起来的方法”都这么守规矩。比如减法 $5-3\ne3-5$。代数结构要研究的问题正是：**哪些规则被保留，哪些结论才跟着成立**。

## 3. 正式定义

一个代数结构包含三件事：

| 成分 | 问的是 | 例：整数加法 |
| --- | --- | --- |
| 集合 | 有哪些对象 | $\mathbb Z=\lbrace \ldots,-1,0,1,\ldots\rbrace$ |
| 运算 | 怎么把两个对象合成一个 | $(a,b)\mapsto a+b$ |
| 规则 | 结果满足什么律 | 交换、结合、有 0、有相反数 |

交换律写作 $a*b=b*a$；分配律写作 $a*(b\oplus c)=(a*b)\oplus(a*c)$。这里 $*$ 和 $\oplus$ 只是占位符，提醒我们“运算”本身也可以成为研究对象。

## 4. 分步例题

比较三种系统：

1. 整数加法：交换、结合，0 是不动点；
2. 整数减法：不交换，也不结合；
3. 洗牌动作：两次洗牌接连执行，天然有结合性，但通常不交换。

第三种已经离开数字世界。它说明结构语言比“加减乘除”更宽。

## 5. 动手实验

```viz
{
  "type": "distributive",
  "a": 7,
  "b": 10,
  "c": 3
}
```

拖动紫点切分矩形。左边是 $7(10+3)$ 的整体面积，右边是两块面积相加。分配律不是背诵口诀，而是两种数面积的路径。

```python title="用小表格检查两条律"
def check_laws(values):
    ok_swap = True
    ok_distributive = True
    for a in values:
        for b in values:
            if a + b != b + a:
                ok_swap = False
            for c in values:
                if a * (b + c) != a * b + a * c:
                    ok_distributive = False
    print("swap:", ok_swap)
    print("distributive:", ok_distributive)

check_laws([0, 1, 2, 3])
```

代码用嵌套循环穷举小样本。它不能证明所有整数都满足运算律，但能训练“先检查结构”的习惯。

## 6. 练习

```exercise
# @title: 练习：找出被破坏的运算律
# @check: False
# @check: True
# @check: False
# @hint: 三条律都要用 shift_add_left 自己来检验。结合律比较的是同一运算的两种分组：f(f(a,b),c) 与 f(a,f(b,c))——这里的 f 该填普通加法还是 shift_add_left？
def shift_add_left(a, b):
    return a * 2 + b

a = 3
b = 5
c = 7
swap = shift_add_left(a, b) == shift_add_left(b, a)
right_increment = shift_add_left(a, b + c) == shift_add_left(a, b) + c
associative = (a + b) + c == a + (b + c)
print(swap)
print(right_increment)
print(associative)
```

<details>
<summary>点开查看逐步解答</summary>

$a*2+b$ 中，加在后面的 $b$ 是特殊角色，所以交换失败。右侧增量合成成立：

$$a*2+(b+c)=(a*2+b)+c.$$

但这不是分配律；它只是说普通加法 $b+c$ 可以穿过这个自定义运算的右端。结合律才是比较同一运算的两种分组：

记 $f(a,b)=a*2+b$。那么

$$f(f(3,5),7)=4\times3+2\times5+7,\qquad f(3,f(5,7))=2\times3+2\times5+7.$$

两边不相等，所以结合失败。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为运算律是显然成立的普遍真理。其实它们是每个系统的身份证，换一个运算就可能失效。

**误区二**：你以为代数结构只是把数字换成字母。真正的重点是把“集合 + 运算 + 规则”当成一个整体。

**误区三**：你以为几个例子相等价就是同构。结构相同必须通过保运算的一一对应来证明。

:::

## 8. 快问快答

```quiz
代数结构最先关心哪件事？
- 数越大越好
- 集合上的运算满足哪些规则 [*]
- 所有式子都要能化简成数字
? 结构语言把规则本身当研究对象。同一个集合配不同运算，可能属于不同结构。
```

## 9. 选读：为什么先谈律而不先背名词

<details>
<summary>选读 · 从规则到公理</summary>

如果只记住“群”“环”“域”，很容易把它们当成标签。先看具体对象中的交换、结合、逆元和分配，才能明白每个公理为什么被挑出来：它保证某类计算可以安全进行。

下一课我们把最小零件拿出来：什么叫一个真正合法的二元运算。

</details>

## 10. 下一站

运算律是结构的影子。要看清影子，得先固定光源：下一课正式定义二元运算与单位元。

→ [二元运算与单位元](./15-binary-operation.md)
