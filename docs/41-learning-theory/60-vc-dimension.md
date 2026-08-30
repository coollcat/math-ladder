---
title: VC 维与 shattering：给模型复杂度定量
lesson_id: learning-theory/vc-dimension
prereqs:
  - learning-theory/capacity-consistency
volume: 4
layer: L10
track:
  - information-learning
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - vc-dimension
  - shattering
  - growth-function
applications:
  - machine-learning
exits:
  - data-ai
---

# VC 维与 shattering：给模型复杂度定量

## 1. 从一个场景开始

酒会上有几位嘉宾站在院子里，你手里有一根无限长的激光线，宣布规则："线一侧的都是甲队，另一侧都是乙队。"三位嘉宾各自脑门上要贴红蓝贴纸——**无论他们想怎么贴**，你都能摆一条线把他们按贴纸颜色分开吗？

答案是肯定的。可一旦来第四位站成四边形，就会出现一种贴法让你彻底绝望：两条对角线上的两位同色、相邻的不同色（棋盘格）。你把线转到天荒地老也分不开。

这一课不关心你赢了多少局，只问一个更锋利的问题：**在这个分类器家族里，最多能"任人摆布"几个人？** 这个数字就是 VC 维。

## 2. 直觉解释

上一课的账本依赖库的条数 $M$，而现实中的规则族（全体直线）条数无穷。新思路是换掉计数对象：

- **shatter（打碎）**：$n$ 个点共有 $2^n$ 种红蓝贴法。若这 $2^n$ 种全都能被族里某条边界实现，就说这个点集被 $\mathcal{H}$ **shattered**。"打碎"的是"我们想不出分法"这件事本身。
- **增长函数** $\Pi_{\mathcal H}(n)$：给定 $n$ 个点，能实现的贴法至多多少种。有限类的 $\Pi(n)\le M$ 只是它的粗略上界；好族的 $\Pi(n)$ 在小 $n$ 时依然指数疯涨。
- **VC 维** $h$：$\mathcal{H}$ 能打碎的最大点数。它是无穷大库的**有效尺寸**——右半射线是 1，平面直线是 3，轴对齐矩形是 4；参数个数只是它的一条腿，不是全部。

直线的 VC 维为何恰是 3？三点任取（哪怕共线）的 8 种贴法都能用某条线切开：依次把"分界缝"插进相邻两人之间或整个队列外侧即可。而四点只要取凸四边形的两条对角贴法就卡死。注意"不能 shatter 某个四点"就够了——VC 维要求的是存在性上限，一处失守即封顶。

## 3. 正式定义

| 符号 | 名字 | 要点 |
| --- | --- | --- |
| $\Pi_{\mathcal H}(n)$ | 增长函数 | $n$ 点上可实现二分模式的数目，$\le 2^n$ |
| shatter | 打碎 | $\Pi_{\mathcal H}(n) = 2^n$ 对某个具体的 $n$ 点成立 |
| $h=\mathrm{VC}(\mathcal H)$ | VC 维 | 能被 shatter 的最大 $n$；永不满足则记 $\infty$ |

三句话把概念钉牢：(1) VC 维看的是**存在一个**点集被打碎，不是所有点集；(2) 超过 $h$ 时**存在某种**贴法失败即可，不必人人失败；(3) 增长函数在 $n\le h$ 段等于 $2^n$，越过 $h$ 后增速骤降——著名的 Sauer 引理证明它从此不超过多项式量级 $O(n^h)$，一维世界的指数奇迹到此为止。

把上一课的 $\ln M$ 换成 $\ln \Pi_{\mathcal H}(2n)$，泛化界就活了：对无穷类同样成立，且在 VC 有限的条件下给出与 $h$ 相关的样本复杂度。

## 4. 分步例题

**例题：半平面射线族有多强？** 规则族为"$x \ge t$ 就亮灯"（门槛可以任意漂移）。取两点 $x=0$ 和 $x=20$：

1. 两点共 $2^2=4$ 种贴法；
2. $(0,0),(0,0)$：门槛拉到极右，没人亮灯——实现；
3. $(1,0)$ 或 $(0,1)$ 不可能——亮区永远从左到右连续扩展，右边的点一旦亮，左边必然跟着亮。**结构偏见暴露**；
4. $(1,1)$：门槛挪到最左——实现。合计 3 种，差一种，打碎失败；
5. 任何单点显然可碎，故 $h=1$：射线族只能可靠地当"一边倒警报器"。

对照练习里的四门槛枚举（含范围外两端），你会亲手验证这 4 种里的 3 种。可见 VC 维管住的是增长函数何时断崖——预算不足的一侧永远是结构出卖了你。

## 5. 动手实验

### 实验 1（python）：直线族在方格上的破坏力实测

网格点上撒出所有斜截式直线候选（系数步长 0.25），数每种贴法的可行性：

```python title="三个点 vs 四个点：指数天堂在哪里破功"

P3 = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]        # 三位嘉宾（直角三角站位）
P4 = P3 + [[1.0, 1.0]]                            # 第四位补成单位方形

# 系数网格：(-3,3] 步长 0.25；round 抹平浮点尾巴防止重复登记
vals = [-3]
v = -3.0
while v < 3.0001:
    v += 0.25
    vals.append(round(v, 4))

def achievable_patterns(pts):
    found = set()                                  # set：自动去重的集合
    for a in vals:                                 # 枚举直线 ax+by+c>0 的三类系数
        for b in vals:
            for c in vals:
                bits = ""
                for px, py in pts:
                    bits += "1" if a * px + b * py + c > 0 else "0"
                found.add(bits)
                found.add("".join("1" if ch == "0" else "0" for ch in bits))
                # 红蓝互换等价于整体取反，一并登记省一半搜索
    return found

p3 = achievable_patterns(P3)
p4 = achievable_patterns(P4)
print(f"3 points: {len(p3)}/{2**3}")
print(f"4 points: {len(p4)}/{2**4}")
allbits4 = [format(i, "04b") for i in range(16)]   # format：整数转定宽二进制串
print("missing:", [pat for pat in allbits4 if pat not in p4])
```

运行结果：三位嘉宾 `8/8` 全场通吃；四位只剩 `14/16`，漏网的恰是 `'0110'` 与 `'1001'`——也就是四边形对角同色、邻边异色的两种棋盘贴法。线性结构的盲点一目了然。

### 实验 2（python）：给每种贴法找一把尺子

固定三角形三人组，对 8 种贴法逐一反向搜索可行直线，验证"打碎"的每个成员都名副其实：

```python title="三点的 8 种贴法逐个点名：每一票都有解"
P3F = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]
GRIDF = [i * 0.5 - 3 for i in range(13)]           # 更粗的网格：-3 到 3 步长 0.5

def find_line_for(target_bits):
    # 枚举所有 (a,b,c)，命中目标贴法或其反色即算成功
    for af in GRIDF:
        for bf in GRIDF:
            for cf in GRIDF:
                got = "".join("1" if af * px + bf * py + cf > 0 else "0"
                              for px, py in P3F)
                if got == target_bits or got == "".join(
                        "1" if q == "0" else "0" for q in target_bits):
                    return True
    return False

for i in range(8):
    bitsf = format(i, "03b")
    verdict = "有解" if find_line_for(bitsf) else "无解"
    print(f"{bitsf}: {verdict}")
```

八个模式全部报"有解"。小提示：三位嘉宾构成三角形至关重要——换成三点共线虽然照样 8/8，但那是因为队列内外的缝隙更多；真正的高危阵营是让"分界弯不过来"的空间布局。

### 快问快答

```quiz
关于平面上直线分类器的 VC 维，下面哪个说法站得住脚？
- 参数个数说了算：直线只有三个系数，数一数就知道 VC 维
- 四个点不可能全被打碎：总有一种贴法让两条对角线各自同色、相邻异色，任何直线都切不开 [*]
- 只要四个点足够分散、拉开距离，直线就能打碎它们
? 参数个数只是经验线索，不是定义。反例来自几何布局：四边形对角同色的贴法使两组点互相"包围"，任何一条直线切开的都是两段连续区域，恰好把它们隔开不了。同时也要记住：只需找到一个打不碎的四点布局即封顶，别的布局碎了也不加分。
```

:::warning[常见误区]

**误区一**：你以为 VC 维等于参数个数。二者常巧合（直线 2 参配 3 维都要小心），但正反例遍地：单参数的 sin(at) 族可以打碎任意多点；十参数硬约束模型也可能维度很低。数参数是懒人的占卜，定义才是裁决。

**误区二**：你以为没被打碎的点集宣判了分类器死刑。shatter 失败只说"有 $2^n-\Pi(n)$ 种贴法够不着"，往往剩下的仍覆盖绝大多数现实数据分布——悲观上界未必精确到日常。

**误区三**：你以为 VC 大就能包治百病。VC 有限才有样本复杂度的定心丸；VC 无限的族（如全体可测集合）上 ERM 可以随便记住任何数据，保证灰飞烟灭。

:::

## 6. 练习

**练习**：回到例题的射线族 $\lbrace x \ge t\rbrace$。把门槛范围放宽到 $t=-1,5,15,25$（两端刻意越界），点集先取三兄弟 $\lbrace 0,10,20\rbrace$：四种门槛各产生一串 01 串，去重后还剩几个不同模式？再缩回 $\lbrace 0,20\rbrace$ 两点又是几种？

```exercise
# @title: 练习：射线族的贴法普查
# @check: 4
# @check: 3
# @hint: 门槛放两边越界才能采到"全亮"和"全灭"；用 set 存字符串去重，最后读 len
positions = [0, 10, 20]
ts_full = [-1, 15]            # ← 有 bug：少了 5 与两端之外的门槛，采不全 4 种
patterns = set()
for t in ts_full:
    bit = "".join("1" if x >= t else "0" for x in positions)
    patterns.add(bit)
print(len(patterns))

two_pts = [0, 20]
reach2 = set()
for t in [-1, 5, 15]:         # ← 有 bug：再漏掉 25，全灭模式缺席，答案会虚低
    reach2.add("".join("1" if x >= t else "0" for x in two_pts))
print(len(reach2))
```

<details>
<summary>点开查看逐步解答</summary>

第一问：$t=-1\to111$、$5\to011$、$15\to001$、$25\to000$，四个互不相同，答案 **4**。注意若不加越界的 -1 与 25，首尾两挡丢失——枚举边界情形是普查纪律。

第二问：两点时 5 与 15 同时给出 01（中间没有任何样本挡在中间），去重后只剩 $\lbrace 11,01,00\rbrace$ 即 **3** 种，缺 10——证实正文断言"右侧点亮则左侧被迫点亮"。这也再次说明射线族的 VC 维封顶在 1：连两个点都无法完全任性。

</details>

## 7. 选读：从增长函数到定心丸

<details>
<summary>选读 · 指数与多项式的换挡时刻</summary>

有限类并集界的代价是 $\ln M$；把求和对象从 $M$ 条规则换成 $\Pi_{\mathcal H}(2n)$ 种 $2n$ 点行为，就得 $\sqrt{\ln\Pi(2n)/(2n)}$ 形态的新余量（细节下一课展开）。关键在于 Sauer 引理给出的换挡曲线：$n<h$ 时 $\Pi(2n)\approx 2^{2n}$ 依旧指数级爆炸；一旦 $n>h$，$\Pi(2n)\le (2en/h)^h$ 变成 $n$ 的 $h$ 次多项式，其对数 $\approx h\ln(2en/h)$ 缓慢爬行。于是泛化余量的有效分母变成 $n$ 对 $\ln n$——曲线在大 $n$ 处重新进入舒适的 $1/\sqrt{n}$ 单调下降轨道。VC 维的全部理论分量都压在这一个换挡点上：它是"记忆能力"耗尽的里程碑，也是学习从背题转向举一反三的数学分水岭。

</details>

## 8. 下一站

VC 维给了我们衡量"复杂度"的尺子，但承诺尚未落袋：拿这把尺子，到底换来的误差券长什么样？"以概率至少 $1-\delta$，错误率不超过最优加 $\varepsilon$"——这就是 PAC 学习框架要签下的合同。

→ [PAC 学习框架：可能近似正确](./70-pac-learning.md)
