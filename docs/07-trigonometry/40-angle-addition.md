---
title: 和角公式
lesson_id: trig/angle-addition
prereqs:
  - trig/wave-anatomy
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 和角公式：两次旋转，一本账

## 1. 从一个场景开始

看着 $\sin(a + b)$，几乎每个人的第一反应都是把加号拆进去：$\sin a + \sin b$ 嘛。

可惜数学不讲人情。拿 $30° + 60°$ 试一下：$\sin 90° = 1$，而 $\sin 30° + \sin 60° \approx 0.5 + 0.866 = 1.366$——差得不是一点半点。那正确的展开式是什么？这一课我们不走"先背公式"的老路，而是让计算机当证人：先大规模抽查一个候选公式，看它敢不敢接招。

## 2. 直觉解释

回到单位圆的视角：$\theta$ 是"从起点 $(1,0)$ 转过 $\theta$"这个动作。

于是 $\sin(a+b)$ 说的是：**先转 $a$，再接着转 $b$，最后停在哪**。它当然不等于"只转 $a$ 的高度"加"只转 $b$ 的高度"——两次旋转是接力的关系，不是两段独立的高度求和。

和角公式回答的是：终点坐标如何用"只转 $a$"与"只转 $b$"各自的横纵坐标**乘积组合**出来。为什么偏偏是那种乘积组合？选读部分给几何思路，本课先用数值实验把它钉死。

## 3. 正式定义

对任意角 $a$、$b$（弧度制），以下四条恒等式成立：

$$\sin(a+b) = \sin a \cos b + \cos a \sin b$$

$$\sin(a-b) = \sin a \cos b - \cos a \sin b$$

$$\cos(a+b) = \cos a \cos b - \sin a \sin b$$

$$\cos(a-b) = \cos a \cos b + \sin a \sin b$$

| 记号 | 名字 | 记忆锚点 |
| --- | --- | --- |
| $\sin(a \pm b)$ | 正弦和/差角公式 | 两项之间是 **＋**（与左侧同号） |
| $\cos(a \pm b)$ | 余弦和/差角公式 | 两项之间是 **－**（与左侧反号） |
| $\sin a \cos b$, $\cos a \sin b$ | 异名乘积对 | 正弦版的两项都是"异名函数配对" |
| $\cos a \cos b$, $\sin a \sin b$ | 同名乘积对 | 余弦版的两项都是"同名函数配对" |

一句话总结：**正弦加、余弦减；异名配、同名配**。四条公式其实是同一个事实的四张面孔——旋转可以接力。

## 4. 分步例题

**例**：手算 $\sin 75°$（不许查表，只许用 $45°$ 与 $30°$ 的特殊值）。

1. 拆角：$75° = 45° + 30°$，套正弦和角公式；
2. 展开：$\sin 75° = \sin 45° \cos 30° + \cos 45° \sin 30°$；
3. 代入特殊值：$\frac{\sqrt2}{2} \cdot \frac{\sqrt3}{2} + \frac{\sqrt2}{2} \cdot \frac12 = \frac{\sqrt6 + \sqrt2}{4}$；
4. 收尾：$(2.449 + 1.414) \div 4 \approx 0.966$。

验证：$75°$ 已接近最高点 $90°$（值为 1），所以答案略小于 1——量级对得上。这就是和角公式的威力：用几个已知角，滚出所有新角。

## 5. 动手实验

### 实验 1（viz）：和角的真身是一次平移

```viz
{
  "type": "plot",
  "title": "y = sin(x + a)：蓝线随 a 整体左移",
  "expr": "sin(x + a)",
  "label": "sin(x+a)",
  "expr2": "sin(x)",
  "label2": "sin(x)",
  "xmin": 0,
  "xmax": 12.56,
  "sliders": [
    { "name": "a", "min": 0, "max": 6.28, "step": 0.1, "value": 0 }
  ]
}
```

怎么玩：拖动 a，蓝色曲线整体向左滑、橙色虚线原地不动——上一课的"相位"原来就是"给自变量加了一个角"。和角公式要做的，就是把左移后的高度用 $x$ 处原波的 $\sin x$、$\cos x$ 表达出来。

### 实验 2（python）：四万组随机角度体检

```python title="抽查 sin(a+b)：公式值 vs 直接算值"
import random                     # 随机数库（第 1 章已登场）
import math

ok_count = 0                      # 计数器：记录"公式与直接计算一致"的次数
for trial in range(40000):        # 循环四万次试验
    a = random.uniform(0, math.tau)   # uniform：在给定区间取随机小数（本课首现）
    b = random.uniform(0, math.tau)   # 这里取 0 到一整圈 2π 之间的任意角
    left = math.sin(a + b)            # 直接算：先相加再取正弦
    right = math.sin(a) * math.cos(b) + math.cos(a) * math.sin(b)   # 和角公式
    if abs(left - right) < 0.000000001:   # 差距小于十亿分之一算"一致"
        ok_count = ok_count + 1

print(f"{ok_count} / 40000")
print(round(math.sin(math.radians(75)), 4))   # 例题复核：sin 75° ≈ 0.9659
```

怎么玩：第一行输出 `40000 / 40000`——无一例外。注意两组数的差距都在 $10^{-16}$ 量级（双精度浮点的极限），这已是"同一件事的两种算法"而非"巧合"。想考验它，可以把区间改成负角度试试。

### 快问快答

```quiz
cos(a + b) 的正确展开是？
- cos(a)·cos(b) + sin(a)·sin(b)
- cos(a)·cos(b) - sin(a)·sin(b) [*]
- cos(a) + cos(b)
? 余弦版中间是减号，且配对的都是同名函数。正弦版才是加号配异名函数——两族公式的符号正好相反。
```

:::warning[常见误区]

**误区一**："你以为 $\sin(a+b) = \sin a + \sin b$。" 开场的 $30°+60°$ 反例已经说明了这一点。和角公式的每一项都是**乘积对**，没有一项是单独的 $\sin a$ 或 $\sin b$。

**误区二**："你以为正弦、余弦的展开符号差不多。" 其实恰好相反：正弦版两项相**加**，余弦版两项相**减**（差角则全部反过来）。背错一个符号，整道题全毁。

**误区三**："你以为这只是考试专用套路。" 其实它是波的通用语：下一课两列波叠加产生的"拍"，包络线就是靠和角公式一步化出来的。没有它，调音师耳朵里的"嗡嗡声"无从解释。

:::

## 6. 练习

**练习 1**：下面的代码想验证正弦和角公式，但有一个符号写错了，导致只有部分角度蒙混过关。修好它，让 100 组角度全部通过：

```exercise
# @title: 练习：修好正弦和角公式
# @check: 100
# @hint: 正弦版两项之间是加号：rhs 应该等于 sin(a)·cos(b) 加上 cos(a)·sin(b)；现在代码里的减号算出的是另一个公式
import math

count = 0
for i in range(10):
    for j in range(10):      # 双层循环：内层每轮都从头走一遍
        a = i * 0.3          # 角度 a 取 0 到 2.7 弧度
        b = j * 0.7          # 角度 b 取 0 到 6.3 弧度
        left = math.sin(a + b)
        right = math.sin(a) * math.cos(b) - math.cos(a) * math.sin(b)
        if abs(left - right) < 0.000000001:
            count = count + 1

print(count)
```

**练习 2**：只用差角公式，证明"余角恒等式"$\cos(90° - \theta) = \sin\theta$（它在[单位圆那一课](./10-unit-circle.md)的选读里露过面）。

<details>
<summary>点开查看逐步解答</summary>

把 $90°$ 写成弧度 $\frac{\pi}{2}$，套余弦差角公式：

$$\cos\Big(\frac{\pi}{2} - \theta\Big) = \cos\frac{\pi}{2}\cos\theta + \sin\frac{\pi}{2}\sin\theta = 0 \cdot \cos\theta + 1 \cdot \sin\theta = \sin\theta$$

单位圆上的镜像对称，被和角公式一行代数收编——这就是"工具滚工具"的复利。
</details>

**练习 3**：手算 $\sin 15°$（利用 $45°$ 与 $30°$）。

<details>
<summary>点开查看逐步解答</summary>

拆角 $15° = 45° - 30°$，这次要用**差**角公式：

$$\sin 15° = \sin 45° \cos 30° - \cos 45° \sin 30° = \frac{\sqrt6}{4} - \frac{\sqrt2}{4} = \frac{\sqrt6 - \sqrt2}{4} \approx 0.259$$

对照：$15°$ 很接近 $0°$（值为 0），所以是个小正数——量级合理。
</details>

## 7. 选读：公式为什么长这样

<details>
<summary>选读 · 单位圆上的一次"接力"（证明思路）</summary>

思路提示，四步走：

1. 在单位圆上标出转过 $a$ 的点 $P = (\cos a, \sin a)$；
2. 构造那个"从 $(1,0)$ 到转角 $b$ 落点"的小直角三角形——两条直角边分别是 $\cos b$ 与 $\sin b$；
3. 把这个小三角形**平移并旋转**到 $P$ 处（接力！），它的两条直角边的指向随之改变：一条变成方向 $(-\sin a, \cos a)$、另一条保持方向 $(\cos a, \sin a)$；
4. 分别沿两个方向量长度再合并同类项，落点横坐标 $= \cos a \cos b - \sin a \sin b$，纵坐标 $= \sin a \cos b + \cos a \sin b$。

第 3 步的"方向旋转"手工追踪比较费纸；第 11 章学了矩阵后，同样的内容只是矩阵乘法的一行。今天先用四万次数值实验建立信任，完全够用。

</details>

## 8. 下一站

翻译装备完毕。四张面孔里藏着一位最勤快的常客——让 b=a，"两次旋转"变成"同一个角转两次"：sin 2a、cos 2a 与降幂公式马上出锅，第 16 章的正交性正等它当幕后功臣。

→ [倍角公式与降幂](./42-double-angle.md)
