---
title: 减法与负数
lesson_id: arithmetic/subtract
prereqs:
  - arithmetic/addition
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 减法与负数

## 1. 从一个场景开始

冬夜气温 $3^\circ\text{C}$，寒潮过境后降了 8 度。现在多少度？

$3 - 8 = ?$ 数轴上从 3 向左跳 8 步——跳过了 0，落到 0 左边**暂时没有名字的地方**。

数学家的做法朴素而有力：既然现有的数还不够表达它，那就**创造一个新的数**。这一步让"欠债"、"零下温度"、"倒退步数"有了统一语言，也让傅里叶变换里的正负频率成为可能。

## 2. 直觉解释

把数轴从 0 向左**镜像延长**：0 的左边依次是 $-1, -2, -3, \dots$

- $-3$ 读作"负三"，表示比 0 小 3；
- 生活对应物：欠 3 元、零下 3 度、电梯 B3 层、后退 3 步。

减法的图像：$a-b$ 就是从 $a$ 出发向**左**跳 $b$ 步。落点在 0 右边还是左边，取决于你离右边界够不够远——不够远就进入负数区。

## 3. 正式定义

**相反数**：对任意数 $a$，记 $-a$ 为满足 $a + (-a) = 0$ 的那个数。$-a$ 叫做 $a$ 的**相反数**（也叫负值）。注意 $-a$ 不一定是负数：$-(-5) = 5$。

**减法定义为新运算**：

$$a - b := a + (-b)$$

即"减去一个数 = 加上它的相反数"。这条定义是本课的顶梁柱，后面所有规则都由它推出。

由此立刻得到符号法则：

$$a - (-b) = a + b \qquad (\text{负负得正})$$

因为 $-(-b) = b$（相反数的相反数是自己）。

## 4. 分步例题

**例 1**：$3 - 8$
1. 写成加相反数：$3 + (-8)$
2. 数轴上从 3 向左跳 8 步 → 落在 $-5$
3. 所以 $3-8=-5$

**例 2**：$-5 - (-2)$
1. 减去 $-2$ 等于加上 $2$：$-5 + 2$
2. 从 $-5$ 向右跳 2 步 → 落在 $-3$
3. 所以 $-5-(-2)=-3$

**例 3（连续减法）**：$10 - 4 - 3$
1. 规定从左到右算：$(10-4)-3 = 6-3 = 3$
2. 等价地一次减总和：$10-(4+3)=10-7=3$ ✓

## 5. Python 验证

### 实验 1：定义就是定理

```python title="验证 a-b 永远等于 a+(-b)"
import random

ok_count = 0
for trial in range(10000):
    a = random.randint(-50, 50)
    b = random.randint(-50, 50)
    if a - b == a + (-b):
        ok_count = ok_count + 1

print(f"a-b 与 a+(-b) 在一万组随机数中相等 {ok_count} 次")
```

### 实验 2：负负得正

```python title="减去负数=加上正数"
a, b = 4, 9
print(f"{a} - (-{b}) = {a - (-b)}")
print(f"{a} + {b}    = {a + b}")
```

### 实验 3：一周气温折线

```python title="用负数记录温差并画图"
import matplotlib.pyplot as plt

temps = [3, -2, -6, -4, 1, 5, 2]
days = list(range(1, 8))

diffs = []
for i in range(1, len(temps)):
    diffs.append(temps[i] - temps[i - 1])
print(f"相邻两日温差: {diffs}")

plt.plot(days, temps, marker="o", label="temperature")
plt.axhline(0, color="gray", linestyle="--")  # axhline：水平参考线（画在 y=0，负温区一眼可见）
plt.xlabel("day")
plt.ylabel("degrees C")
plt.grid(True)
plt.legend()
```

看 `diffs` 列表：升温的日子是正数、降温是负数——**差值的正负自动记录了方向**。这就是负数最大的功劳：把"方向"变成了可以参与运算的数。

### 实验 4：拖动滑块，实时看减法跳跃

先不用装任何东西，在网页组件里直接拖（零等待）：

```viz
{ "type": "numberline", "title": "a - b 的落点", "min": -10, "max": 10, "op": "-",
  "sliders": [
    { "name": "a", "min": -9, "max": 9, "step": 1, "value": 3 },
    { "name": "b", "min": -9, "max": 9, "step": 1, "value": 8 }
  ] }
```

这个实验带**滑块**——点「▶ 浮窗实验」打开后，拖动 `a`、`b` 两个滑块，图会实时刷新：

```python title="滑块实验：a - b 的落点"
# sliders: a=3 [-9:9:1], b=8 [-9:9:1]
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(7, 2))   # subplots：建一块画布，ax 是画笔；figsize 是宽高（英寸）
ax.axvspan(-10, 0, color="mistyrose")    # axvspan：给一段横轴区间刷底色——负数区刷粉
ax.axvspan(0, 10, color="honeydew")
ax.annotate("", xy=(a - b, 0), xytext=(a, 0),   # annotate：画一支从 a 指向 a-b 的箭头
            arrowprops=dict(arrowstyle="->", color="darkorange", lw=2.5))
ax.scatter([a, a - b], [0, 0], s=80, zorder=3)   # s：点的大小；zorder：图层顺序，越大越靠上
ax.set_title(f"{a} - {b} = {a - b}", fontsize=11)
ax.set_xlim(-10, 10)
ax.set_yticks([])
```

橙色箭头从起点 $a$ 指向落点 $a-b$，粉区是负数、绿区是正数。用滑块完成三个挑战：

1. **跨过零点**：让 $a>0$ 但落点进粉区（比如 $3-8$）；
2. **向右的箭头**：把 $b$ 拖成负数，观察 $-5-(-2)$ 这类"减去负数反而向右走"；
3. **异途同归**：找到两组不同的 $(a,b)$，落点是同一个 $-5$。

### 实验 5：相反数是一面镜子

```python title="n 与 -n 关于 0 对称"
import matplotlib.pyplot as plt

ns = list(range(1, 8))
fig, ax = plt.subplots(figsize=(6, 2.2))

ax.axvline(0, color="gray", linestyle="--")  # axvline：竖直参考线（x=0，正负数的分界）
for n in ns:
    ax.scatter([n], [1], s=60, color="steelblue")
    ax.scatter([-n], [1], s=60, color="tomato")
    ax.text(n, 1.22, str(n), ha="center", fontsize=8)  # str()：把数字变成字符串好当标签写进图；ha="center" 水平居中对齐
    ax.text(-n, 1.22, str(-n), ha="center", fontsize=8)

ax.text(0, 0.35, "镜面: 0", ha="center", fontsize=9)
ax.set_xlim(-9, 9)
ax.set_ylim(0, 1.8)
ax.set_yticks([])
```

每对蓝红点到中央虚线的距离都相等——$n$ 与 $-n$ 互为相反数，"$-(-n)=n$" 就是照两次镜子回到原处。

### 快问快答

```quiz
算一算：-5 - (-2) 等于多少？
- -7（两个负号凑一起更小了）
- -3（减去 -2 等于加上 2）[*]
- 3（负负得正，结果一定是正的）
? a - (-b) = a + b：从 -5 向右跳 2 步落在 -3。"减去负数"是向右走，不是把绝对值摞起来。
```

:::warning[常见误区]

**误区一**："$-5$ 比 $-2$ 大，因为它数字更大"。
负数世界规则反转：数字部分越大，数越小。$-5 < -2$（零下 5 度比零下 2 度冷）。数轴上**越靠左越小**，一图定乾坤。

**误区二**："负负得正"到处适用。
它是**两条**规则的简称：$-(-b)=b$（相反数的相反数）和 $a \times (-b) = -(ab)$（乘法，第 2 章）。别把它套到 "$-2 + -3$" 这种加法上。

**误区三**：连续加减时随手从中间算起。
规定是从左到右。$10 - 4 - 3 \neq 10 - (4 - 3)$，后者等于 9，前者等于 3。括号改变命运。

:::

## 6. 练习

**练习 1**：计算三道题，各打印一行结果。第一题已示范：

```exercise
# @title: 练习：负数运算三连
# @check: 5
# @check: -5
# @check: 8
# @hint: (2) 写一道"小减大"的减法，落点会进负数区（参考：4 - 9）；(3) 用"减去一个负数 = 加上它的相反数"（参考：-3 - (-11)）
print(-7 + 12)
print()  # (2)：自己出一道结果为负数的减法
print()  # (3)：自己出一道"减去负数"、结果为正数的算式
```

**练习 2**：某股票三天涨跌为 $+2, -5, +3$（元），起点价 20。求每天收盘价与最终价格。

<details>
<summary>点开查看逐步解答</summary>

```python
price = 20
changes = [2, -5, 3]
for c in changes:
    price = price + c
    print(price)
```

收盘价序列：22, 17, 20；最终回到 20。注意涨跌互抵正是"相反数相加得 0"的现实版本。
</details>

**练习 3**：判断并说理由：若 $a - b = b - a$，则 $a$ 和 $b$ 必须满足什么关系？

<details>
<summary>点开查看逐步解答</summary>

$a-b=b-a$ 移项（两边同加 $a+b$）得 $2a=2b$……严格解需要等式性质，第 4 章正式讲。先动手试：

```python
for a, b in [(3, 3), (3, 5), (7, 7), (0, 0)]:
    print(a - b == b - a)
```

规律：只有 $a=b$ 时成立。直觉：交换减数被减数还想相等，除非两者相同。
</details>

## 7. 选读：为什么"发明新数"是合法的？

<details>
<summary>选读 · 数学对象的自由与约束</summary>

凭什么能"发明"负数？因为发明之后必须**自洽**：新旧数放在一起，加法交换律、结合律、$a+0=a$ 全部依然成立，且老的自然数之间怎么算还和原来一样。数学家把这叫"扩张数系而保持结构"。

历史上负数曾长期被视为荒谬（"比没有还少"？），欧洲直到 17 世纪还有人称其为"谬数"。真正让它站住脚的不是实用，而是**它让整个体系更完整且无矛盾**——这个模式后来反复上演：分数、无理数、复数，每一次扩张都是同一个故事的重演。第 12 章复数登场时你会再听一遍这段旋律。

</details>

## 8. 下一站

会加会减了。下一课我们把"很多个相同的数相加"压缩成一个新动作——**乘法**，顺便看看分配律怎么给计算抄近路。

→ [乘法与分配律](./30-multiplication.md)
