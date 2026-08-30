---
title: 同胚与橡皮几何
lesson_id: tdg/homeomorphism
prereqs:
  - tdg/hausdorff
volume: 5
layer: L8
track:
  - geometry-space
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - homeomorphism
applications:
  - shape-matching
exits:
  - research
---

# 同胚与橡皮几何

## 1. 开场钩子

把陶瓷杯慢慢捏成甜甜圈当然不行，陶瓷会碎；但在理想橡皮世界里，杯柄就是环身的一个洞，杯身可以鼓成环体。同胚要问的不是材料能不能变形，而是对应关系是否双向连续。

## 2. 直觉解释

同胚是一张完美的双向地图：原空间的邻近点映到新空间仍然邻近；新空间的邻近点也能沿逆地图走回原空间。拉伸、弯曲、膨胀、收缩都可以；撕开、打洞、粘合都不行。

圆变成椭圆是同胚；圆挖掉一点后可以无限展开成一条直线。圆和线段不是同胚，因为去掉一个中间点后两者的连通块数不同。

## 3. 正式定义

设 $f:X\to Y$ 是双射。若 $f$ 与逆映射 $f^{-1}$ 都连续，则称 $f$ 是同胚，$X,Y$ 同胚，记作 $X\cong Y$。

同胚保持所有拓扑不变量。因此若能找到一个不变量不同，例如连通分支数、基本群或 Euler 示性数，就可断定不同胚。

## 4. 分步例题

证明开区间 $(0,1)$ 同胚于 $\mathbb R$。

1. 构造 $f:(0,1)\to\mathbb R$ 为 $f(x)=\tan(\pi(x-\tfrac12))$；
2. 当 $x$ 接近 0 或 1 时，函数值分别跑向负无穷和正无穷；
3. 正切在每个区间上严格递增，因此有反函数；
4. 反函数是 $f^{-1}(y)=\frac12+\frac{1}{\pi}\arctan(y)$，连续；
5. 所以 $(0,1)\cong\mathbb R$。

## 5. 动手实验

### 实验 1：圆如何连续变扁

```viz
{
  "type": "plot",
  "title": "圆到椭圆的连续变形",
  "expr": "(1 - 0.4 * t) * sqrt(1 - x^2)",
  "expr2": "-(1 - 0.4 * t) * sqrt(1 - x^2)",
  "xmin": -1.05,
  "xmax": 1.05,
  "sliders": [
    { "name": "t", "min": 0, "max": 1, "step": 0.01, "value": 0 }
  ]
}
```

拖动参数 `t`，上半弧和下半弧连续变形：`t=0` 是单位圆，`t=1` 变成短半轴 0.6 的椭圆。这个实验只显示轮廓；真正的同胚还需要说明每个角度一一对应，而不是只看图像。

### 实验 2：Python 检查双射采样

```python title="检查线性变形是否一一对应"
def stretch(point, factor):
    return [point[0] * factor, point[1]]

samples = [[0, 0], [1, 0], [2, 0]]
factor = 1.5
images = []

for point in samples:
    image = stretch(point, factor)
    images.append(image)
    print(image)

unique_images = set(tuple(item) for item in images)
print(len(samples) == len(unique_images))
```

有限采样只能发现明显重复，不能证明连续同胚；但它提醒我们，同胚的第一道门槛是一一对应。

## 6. 练习

```quiz
下列哪一组空间一定同胚？
- 圆盘和圆周
- 实心三角形和实心圆形 [*]
- 圆环和实心圆盘
? 前者有一维边界而后者无边界；圆环有贯穿洞；实心三角形可通过连续变形变成实心圆盘。
```

<details>
<summary>折叠练习：用不变量排除假朋友</summary>

考虑三个对象：线段、圆周、数字 8 形曲线。

1. 线段去掉中间点得到两块；圆周去掉一点仍是连通弧；因此线段与圆周不同胚。
2. 数字 8 去掉交叉点得到多段，圆周去掉一点只有一段；因此也不同胚。
3. 若只比较“有无洞”还不够，可继续使用连通块数、割点数和后续的基本群。

结论：不变量能证“不同”，通常不能单独证“相同”；完整证明需要构造双向连续映射。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为连续双射就是同胚。逆映射也可能不连续；同胚要求双向连续。

**误区二**：你以为形状相似就是同胚。相似保留比例；同胚允许极端拉伸和压扁。

**误区三**：你以为数值实验能证明同胚。绘图只能提供直觉，严格结论依赖公式或拓扑不变量配合定理。

:::

## 8. 判题练习：亲手造一个同胚

R 和开区间 $(0,1)$ 看起来一个"无限长"一个"有限长"，但它们同胚。下面的 $f$ 把整条实数轴连续地压进 $(0,1)$；补全它的反函数，验证来回复合真的回到原点——双向连续的一一对应就是同胚。

```exercise
# @title: 造一个 R 到开区间的同胚
# @check: -1.0
# @check: 0.0
# @check: 2.0
# @hint: 反函数是对数：g(y) = ln(y / (1 - y))，math.log 就是 ln
import math

# f 把整条实数轴连续地压进开区间 (0, 1)
def f(x):
    return 1 / (1 + math.exp(-x))  # exp 是 e 的幂（第 03 章诞生）

def g(y):
    return y  # 占位错误版本：改成真正的反函数再运行

for x in [-1, 0, 2]:
    print(round(g(f(x)), 6))
```

跑通后想一想：为什么这个例子躲开了"误区一"？$f$ 和 $g$ 在两个方向上都连续，所以它不只是双射，而是同胚。

<details>
<summary>点开查看逐步解答</summary>

logistic 函数的逆是对数几率：

```python
import math

def f(x):
    return 1 / (1 + math.exp(-x))

def g(y):
    return math.log(y / (1 - y))

for x in [-1, 0, 2]:
    print(round(g(f(x)), 6))
```

`math.log` 就是自然对数。三行输出恢复为 `-1.0`、`0.0`、`2.0`，说明来回复合是恒等映射。

</details>

## 9. 选读：嵌入与同伦

<details>
<summary>选读 · 三个容易混淆的词</summary>

同胚是双向连续的一一对应。嵌入是把一个空间连续且无自交地放进另一个空间，并把像看作与原空间同胚。同伦是两个映射之间的一族连续变形，不要求每一步都是同胚。

咖啡杯和甜甜圈的民间说法常混合了同痕与同伦直觉；严格处理时必须先指定对象是曲面、实体还是映射。

</details>

## 10. 下一站

橡皮几何需要一个简单又强大的计数器。下一站介绍 Euler 示性数：顶点、边和面的账本。

→ [Euler 示性数](./40-euler-characteristic.md)
