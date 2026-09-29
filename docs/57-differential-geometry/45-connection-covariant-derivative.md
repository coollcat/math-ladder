---
title: 联络与协变导数：在弯曲的纸上怎么求导
lesson_id: differential-geometry/connection-covariant-derivative
prereqs:
  - differential-geometry/surface-tangent-space
  - differential-geometry/second-fundamental-form
volume: 5
layer: L8
track:
  - geometry-space
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - covariant-derivative
  - christoffel-symbols
  - parallel-transport
applications:
  - general-relativity
  - surface-navigation
exits:
  - differential-geometry/geodesic-path
---

# 联络与协变导数：在弯曲的纸上怎么求导

## 1. 从一个场景开始

在平坦的桌面上，把一支箭头沿任意闭合路径搬一圈回到原点，箭头方向分毫不差。把同样的实验搬到**球面**上：从赤道某点朝正东举起箭头，沿一条纬度圈慢慢挪，绕回出发点时——箭头转了一个角度。没人碰过它，它却自己转了。

"没人碰它"这句话需要翻译：一路上都在让它**保持同一个方向**（平行移动）。麻烦在于，"同一个方向"在曲面上压根没有现成定义：北极点的切平面和赤道点的切平面是两块**不同的平面**，就像两页纸，你没法直接指着说"这两个箭头平行"。上一课的切空间给了每点一块平面，这一课要给这两页纸之间装一条**缝合规则**。

## 2. 直觉解释

曲面用参数 $(u,v)$ 描述，切向量写成分量 $(V^1, V^2)$，意思是 $V = V^1\vec r_u + V^2\vec r_v$。想问"这个向量场沿 $u$ 方向怎么变"，本能的做法是求偏导：

$$\frac{\partial V}{\partial u} = \frac{\partial V^1}{\partial u}\vec r_u + \frac{\partial V^2}{\partial u}\vec r_v \;+\; \underbrace{V^1\vec r_{uu} + V^2\vec r_{vu}}_{\text{基向量自己也在变}}$$

前两项老老实实待在切平面里；麻烦全在后面两项：$\vec r_{uu}$ 是**二阶导**，它既有贴着切平面的分量，也有**翘出切平面**的法向分量（第 42 课第二基本形式正是在量这个翘出的部分）。

于是修法只有一句话：**求完导，再投影回切平面**。切掉法向分量，剩下的就是曲面居民认可的"变化率"——**协变导数**，记作 $\nabla$ 或 $D$。

被切掉的那部分不是垃圾，而是曲率的信息（第 42 课）；留下的那部分则要记账：基向量 $\vec r_u,\vec r_v$ 自己在平移中怎么扭、怎么伸缩。这本账就是 **Christoffel 符号** $\Gamma^k_{ij}$——它不是"新几何"，只是"坐标网格自己怎么歪"的记录表。

## 3. 正式定义

把二阶导拆成切向 + 法向（**高斯公式**，第 42 课的第二基本形式 $b_{ij}$ 就在法向那一项）：

$$\vec r_{ij} = \Gamma^1_{ij}\vec r_u + \Gamma^2_{ij}\vec r_v + b_{ij}\,\vec n$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $\Gamma^k_{ij}$ | Christoffel 符号（第二类） | $\vec r_{ij}$ 的切向部分在 $\vec r_k$ 上的分量；每点一组数 |
| $b_{ij}$ | 第二基本形式系数 | 翘出切平面的部分（上一课的主角，本课切掉） |
| $\nabla_i V^j$ | 协变导数分量 | $\partial_i V^j + \Gamma^j_{ik}V^k$：普通导数 + 基向量修正 |
| $\dfrac{D V^j}{dt}$ | 沿曲线的协变导数 | $\dot V^j + \Gamma^j_{ik}\dot u^i V^k$ |
| $\nabla$ / $\Gamma$ | 联络 | 把相邻切空间"连"起来的一套规则 |

三条立刻可用的公式：

1. **协变导数**：$\nabla_i V = \bigl(\partial_i V^j + \Gamma^j_{ik}V^k\bigr)\vec r_j$；
2. **平行移动**：沿曲线 $u^i(t)$ 搬运 $V$ 且 $\dfrac{DV^j}{dt}=0$——"方向不变"在曲面上的正式说法；
3. **测地线方程**：把"速度向量沿自身平行移动"$\dfrac{D\dot u^k}{dt}=0$ 展开，即 $\ddot u^k + \Gamma^k_{ij}\dot u^i\dot u^j = 0$——"直线"在曲面上的翻译。

Christoffel 符号不必回到三维空间去算，用第 30 课的度量系数 $g_{ij}$（即 $E,F,G$）就能算出来：

$$\Gamma^k_{ij} = \tfrac12\, g^{kl}\bigl(\partial_i g_{jl} + \partial_j g_{il} - \partial_l g_{ij}\bigr), \qquad (g^{kl}) = (g_{ij})^{-1}$$

这说明一件大事：$\Gamma$ 完全由**度量**决定——住在曲面里的二维生物量得出长度，就量得出怎么求导。

## 4. 分步例题

**例 1（圆柱面：网格不歪）**：$\vec r(u,v)=(a\cos u,\ a\sin u,\ v)$，第 30 课算过 $E=a^2,\ F=0,\ G=1$，全是**常数**。

1. 度量是常数 $\Rightarrow$ 所有偏导 $\partial_i g_{jl}=0$；
2. 代入公式：所有 $\Gamma^k_{ij}=0$；
3. 测地线方程退化成 $\ddot u=\ddot v=0$：参数匀速直线——**把圆柱剪开摊平后的直线**（螺旋线、直母线、横截圆都是它）；
4. 平行移动绕一圈不偏转：圆柱面内蕴地就是一张纸。

**例 2（球面：网格会歪）**：球坐标 $(\theta,\varphi)$，$\theta$ 为极角：$g_{\theta\theta}=1,\ g_{\varphi\varphi}=\sin^2\theta,\ g_{\theta\varphi}=0$。

1. 逆矩阵 $g^{\theta\theta}=1,\ g^{\varphi\varphi}=1/\sin^2\theta$；
2. 算 $\Gamma^\theta_{\varphi\varphi}=\tfrac12 g^{\theta\theta}\bigl(2\partial_\varphi g_{\theta\varphi}-\partial_\theta g_{\varphi\varphi}\bigr)=\tfrac12\bigl(0-2\sin\theta\cos\theta\bigr)=-\sin\theta\cos\theta$；
3. 算 $\Gamma^\varphi_{\theta\varphi}=\Gamma^\varphi_{\varphi\theta}=\tfrac12 g^{\varphi\varphi}\partial_\theta g_{\varphi\varphi}=\tfrac12\cdot\frac{2\sin\theta\cos\theta}{\sin^2\theta}=\cot\theta$；
4. 其余（含全部 $\Gamma^\theta_{\theta\theta}$）为 0；
5. 检验赤道：$\theta\equiv\pi/2$，$\dot\varphi=1$，第一分量 $\ddot\theta+\Gamma^\theta_{\varphi\varphi}\dot\varphi^2 = 0+(-\sin\frac\pi2\cos\frac\pi2)=0$ ✓——赤道是测地线；
6. 检验北纬 45° 的纬度圈：$\theta\equiv\pi/4$，$\dot\varphi=1/\sin\frac\pi4$，残差 $\nabla_t\dot\gamma = -\cot\frac\pi4 = -1\ne 0$，指向北极一侧——**它不是测地线**（第 50 课会正面处理这件事）。

## 5. 动手实验

绕纬度圈平行移动一圈，箭头偏过的角度等于**圈住的立体角**（Gauss–Bonnet 的定量版）：赤道圈住半个球（$2\pi$，模 $2\pi$ 相当于没转），贴近极点的小圈几乎不转。

```viz
{
  "type": "plot",
  "title": "绕纬度圈一圈的平行移动偏角 = 圈住的立体角 2π(1−cos θ)",
  "expr": "2*pi*(1-cos(x))",
  "xmin": 0,
  "xmax": 3.14
}
```

### 实验 1：用度量公式手算球面的 Christoffel 符号

```python title="球面 Christoffel 符号：数值版 vs 解析版"
import math  # math 提供 sin 与 cos，用来写球面度量

def metric(theta):
    # 2×2 度量矩阵：下标 0 对应极角 theta，下标 1 对应经度 phi
    m = [[1.0, 0.0], [0.0, math.sin(theta) ** 2]]
    return m

def metric_inv(theta):
    m = metric(theta)
    det = m[0][0] * m[1][1] - m[0][1] * m[1][0]      # 2×2 行列式
    return [[m[1][1] / det, -m[0][1] / det], [-m[1][0] / det, m[0][0] / det]]

def d_metric(theta, k, h=1e-5):
    # 度量只依赖 theta；对 phi 求偏导得零矩阵，对 theta 用中心差分
    if k == 1:
        return [[0.0, 0.0], [0.0, 0.0]]
    a = metric(theta - h)
    b = metric(theta + h)
    out = [[0.0, 0.0], [0.0, 0.0]]
    for i in range(2):
        for j in range(2):
            out[i][j] = (b[i][j] - a[i][j]) / (2 * h)   # 中心差分近似偏导
    return out

def christoffel(theta):
    inv = metric_inv(theta)
    d = [d_metric(theta, 0), d_metric(theta, 1)]        # d[k] 是 ∂_k g
    out = [[[0.0, 0.0], [0.0, 0.0]], [[0.0, 0.0], [0.0, 0.0]]]
    for k in range(2):
        for i in range(2):
            for j in range(2):
                s = 0.0
                for l in range(2):
                    # Γ^k_ij = ½ g^{kl}(∂_i g_jl + ∂_j g_il − ∂_l g_ij)
                    s = s + inv[k][l] * (d[i][j][l] + d[j][i][l] - d[l][i][j])
                out[k][i][j] = 0.5 * s
    return out

theta = math.pi / 4
C = christoffel(theta)
print("Γ^θ_φφ  数值 =", round(C[0][1][1], 4), " 解析 =", round(-math.sin(theta) * math.cos(theta), 4))
print("Γ^φ_θφ  数值 =", round(C[1][0][1], 4), " 解析 =", round(math.cos(theta) / math.sin(theta), 4))
print("Γ^θ_θθ  数值 =", round(C[0][0][0], 4))
```

两行数值与解析值逐位吻合；第三行为 0——球面的经线方向不歪，歪的是纬线。

### 实验 2：把两条曲线代进测地线方程

```python title="赤道是测地线，纬度圈不是"
import math  # math 提供 sin 与 cos

def covariant_accel(theta, dtheta, dphi, d2theta, d2phi):
    # 测地线方程的两条残差：θ̈ + Γ^θ_φφ φ̇²  与  φ̈ + 2Γ^φ_θφ θ̇ φ̇
    g1 = -math.sin(theta) * math.cos(theta)     # Γ^θ_φφ
    g2 = math.cos(theta) / math.sin(theta)      # Γ^φ_θφ
    a_theta = d2theta + g1 * dphi ** 2
    a_phi = d2phi + 2 * g2 * dtheta * dphi
    return a_theta, a_phi

def show(v):
    # 把浮点噪声与 −0.0 归零，只为好看
    return 0.0 if abs(v) < 1e-9 else round(v, 4)

eq = covariant_accel(math.pi / 2, 0.0, 1.0, 0.0, 0.0)                       # 赤道：θ=π/2 恒定
lat = covariant_accel(math.pi / 4, 0.0, 1 / math.sin(math.pi / 4), 0.0, 0.0) # 北纬 45° 纬度圈
print("赤道   ∇_t γ̇ =", show(eq[0]), show(eq[1]))
print("纬度圈 ∇_t γ̇ =", show(lat[0]), show(lat[1]))
```

第一行两个 0：赤道上"速度不变"与"协变加速度为零"是同一件事——它是测地线。第二行第一个数 $-1$：沿纬度圈匀速前进时，协变加速度指向北极一侧，等于在说"再不拐弯就要掉下去"。

### 快问快答

```quiz
圆柱面上所有 Christoffel 符号都等于零，这说明了什么？
- 圆柱面在三维空间里被压扁了
- 圆柱面的坐标网格不随位置歪斜，内蕴上就是一张平面 [*]
- 圆柱面上不存在测地线
? Γ 记录的是坐标基向量随位置的变化。圆柱摊平后网格是标准方格，基向量处处相同，所以 Γ 全为零；它的测地线正是摊平后的直线。
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为 $\Gamma$ 是曲率。$\Gamma$ 是**坐标网格的歪斜账**，换个坐标就全变；圆柱面用斜坐标写出来 $\Gamma$ 也不为零。真正的不变量是第 40 课的高斯曲率——$\Gamma$ 的某些组合。

**误区二**：你以为协变导数就是"投影掉法向分量"这么简单。在曲面（嵌在三维空间里）上这个说法成立，但 $\Gamma$ 可以只靠度量算出来（本节公式），**不需要外部空间**。广义相对论里的时空不嵌在任何"外面"，靠的正是这一条。

**误区三**：你以为测地线方程里那项是"力"。$\ddot u^k + \Gamma^k_{ij}\dot u^i\dot u^j=0$ 说的是"速度沿自身平行移动"——没有外力，只是坐标在弯。把 $\Gamma$ 项搬到等号右边当成"惯性力"，是坐标的锅，不是物理的力。

:::

## 7. 练习

**练习 1**：球面的 $\Gamma^\theta_{\varphi\varphi}$ 只由 $-\tfrac12\partial_\theta g_{\varphi\varphi}$ 决定。初始代码把 $g_{\varphi\varphi}$ 抄成了 $\sin\theta$（漏了平方），修到通过：

```exercise
# @title: 练习：手算球面的 Γ^θ_φφ
# @check: -0.5
# @check: -0.433
# @hint: g_φφ = sin²θ，求导是 2 sinθ cosθ；Γ^θ_φφ = −½·2 sinθ cosθ = −sinθ cosθ。
import math

def gamma(theta):
    g_phiphi = math.sin(theta)          # ← 错在这：球面度量是 sin²θ，不是 sinθ
    d_g = math.cos(theta)               # 对 θ 求导
    return -0.5 * d_g

print(round(gamma(math.pi / 4), 3))
print(round(gamma(math.pi / 3), 3))
```

**练习 2**：口答题——沿赤道平行移动一支与前进方向成 30° 的箭头，绕地球一圈后它还成 30° 吗？

<details>
<summary>点开查看逐步解答</summary>

成。赤道是测地线，而且圈住的立体角是 $2\pi$（半个球面），偏角 $2\pi \equiv 0 \pmod{2\pi}$——转了一整圈等于没转。这正是上面那张曲线图在 $\theta=\pi/2$ 处的读法：数值 $2\pi$ 要**模 $2\pi$** 看。换成北纬 60° 的小圈，偏角 $2\pi(1-\cos\frac\pi3)=\pi$：箭头掉头。

</details>

## 8. 选读：为什么叫"联络"

<details>
<summary>选读 · 相邻切空间的粘合剂</summary>

曲面每点自带一块切平面（第 20 课），这些平面互不认识、没有公共元素——它们是悬在各自点上的一堆独立向量空间（这堆东西叫**切丛**）。要谈"这个向量和那个向量是否平行"，必须额外指定一条规则：从点 $p$ 的切平面到邻近点 $q$ 的切平面，哪个向量对应哪个向量。

这套"邻点之间怎么搬"的规则，就是把一堆互不相干的纤维**连络**成一体的粘合剂，故名 **connection（联络）**。同一块切丛可以配许多不同的联络；由度量算出的这一个是**Levi-Civita 联络**——唯一一个"无挠"（不扭曲）且"与度量相容"（搬运保长度保夹角）的选择。

第 60 课的 Riemann 度量给的是"怎么量长度"，联络给的是"怎么比较方向"；两者合起来，才有了第 77 章哈密顿力学与广义相对论里的标准语言：在那里引力不再是一种力，而是时空的 Levi-Civita 联络——自由落体走的，正是 $\ddot u^k + \Gamma^k_{ij}\dot u^i\dot u^j=0$ 这条"最直的路"。

</details>

## 9. 下一站

方程已经写出来了：$\ddot u^k + \Gamma^k_{ij}\dot u^i\dot u^j = 0$。满足它的曲线到底长什么样——为什么北京飞纽约的航线要拐进北冰洋，为什么测地线局部最短却不一定全局最短。

→ [测地线：曲面上的最直路径](./50-geodesic-path.md)
