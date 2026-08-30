# 第 21 章 · 线性代数进阶 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 15 门正式课已建成（10/20/30/40/45/50/60/70/80/90/100/105/110/120/125）
> 目标：15 门正式课（原「12 门」为写作当时快照，45 谱定理 / 105 Jordan 形 / 125 张量 einsum 系后续补入）
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 2 / layer L6 / track geometry-space + scientific-computing / stage university-core

## 1. 章定位

本章把卷一的“会算矩阵”升级成“看懂结构”。首批六课沿一条主线推进：

```text
消元改变方程的样子 → 秩说明自由度 → 行列式量面积 → 特征方向找不变轴 → SVD 找最佳低秩形状 → PCA 压缩数据
```

每课必须同时服务几何直觉和计算语义；不能把高斯消元写成机械步骤表，也不能把 SVD 写成名词缩写堆。

## 2. 先做组件

六个 renderer 已实现并提交。JSON type 使用 kebab-case，函数使用 camelCase。

### elimination

```viz
{
  "type": "elimination",
  "title": "消元不改解",
  "matrix": [2, 1, 3, 4],
  "rhs": [7, 12]
}
```

交互：滑块改 2×2 方程组；按钮逐步归一、消元、回代；同步显示三条信息——解唯一/无解/无穷解、行阶梯矩阵、几何直线交点。

### span-space

```viz
{
  "type": "span-space",
  "title": "两个向量的张成",
  "v1": [2, 1],
  "v2": [1, 2]
}
```

交互：拖动两个向量端点；实时判断 rank 0/1/2；独立时高亮整张平面，相关时只保留直线，并画出系数平行四边形。

### det-area

```viz
{
  "type": "det-area",
  "title": "行列式就是面积",
  "c1": [2, 0],
  "c2": [1, 2]
}
```

交互：拖动两列向量；单位方块被推成平行四边形；显示有向面积、绝对面积和翻面符号。

### eigen-direction

```viz
{
  "type": "eigen-direction",
  "title": "找不变方向",
  "matrix": [3, 1, 0, 2]
}
```

交互：拖动试探向量；同时画 $A\vec v$、它在 $\vec v$ 上的投影和角度误差；按钮吸附到最近实特征方向，并显示特征值。

### svd-stretch

```viz
{
  "type": "svd-stretch",
  "title": "旋转-伸缩-旋转",
  "matrix": [3, 1, 0, 2]
}
```

交互：单位圆经过 $A$ 变成椭圆；显示右奇异方向、左奇异方向和奇异值；可切换 rank-1 近似并对比误差。

### pca-projection

```viz
{
  "type": "pca-projection",
  "title": "找数据最舒展的方向",
  "points": [[1, 1], [2, 2.1], [3, 2.8], [4, 4.1], [5, 5]]
}
```

交互：拖动投影方向或一键吸附第一主成分；显示沿方向方差、垂直残差和重构误差；投影点保留在直线上。

## 3. 六门课题切分

### 10 · 高斯消元与解空间（已完成）

- 文件：`10-gaussian-elimination.md`
- 核心概念：行变换保持解集；阶梯形暴露唯一解、无解和无穷解。
- 边界：讲 2×2 完整消元和几何解释；不讲一般 LU 分解算法复杂度。
- 组件：`elimination` + `span-space`。
- 判题：把增广矩阵消成阶梯形并输出唯一解。
- 必写误区：行交换不改变解；消成 $0=0$ 不是失败；$0=$ 非零才是无解。

### 20 · 秩、零空间与维数（已完成）

- 文件：`20-rank-nullspace.md`
- 核心概念：秩是像空间维数，零空间维数是自由度。
- 边界：讲 2×2/3×2 直觉和秩-零化度；不讲抽象商空间。
- 组件：`span-space` + `elimination`。
- 判题：从行最简形判断 rank 和自由变量数。
- 必写误区：零空间是解集合不是单个零向量；秩不是非零元素个数。

### 30 · 行列式的几何意义（已完成）

- 文件：`30-determinant-geometry.md`
- 核心概念：行列式是有向面积/体积缩放因子。
- 边界：讲 2×2 几何与可逆性；不讲一般排列展开式。
- 组件：`det-area` + 已有 `matrix`。
- 判题：由列向量计算行列式并判断可逆性。
- 必写误区：行列式不是矩阵大小；负号表示定向反转。

### 40 · 特征值与不变方向（已完成）

- 文件：`40-eigenvalues.md`
- 核心概念：特征向量是变换后只伸缩不转向的非零方向。
- 边界：讲实特征值、2×2 判别式和几何试错；不讲 Jordan 型。
- 组件：`eigen-direction` + 已有 `matrix`。
- 判题：验证 $A\vec v=\lambda\vec v$ 并求简单整数特征对。
- 必写误区：零向量不能当特征向量；实矩阵可以有复特征值。

### 50 · SVD 与低秩近似（已完成）

- 文件：`50-svd-low-rank.md`
- 核心概念：任何线性变换都可分解为旋转、轴伸缩、旋转。
- 边界：讲 2×2 几何 SVD 和 rank-1 近似；不讲完整证明。
- 组件：`svd-stretch` + `det-area`。
- 判题：由奇异值选择最优 rank-1 并计算保留能量比例。
- 必写误区：奇异值不是特征值的别名；U 和 V 的角色不能混写。

### 60 · PCA 与高维压缩（已完成）

- 文件：`60-pca-compression.md`
- 核心概念：第一主成分是中心化数据方差最大的投影方向。
- 边界：讲中心化、协方差直觉和二维投影；不讲完整统计推断。
- 组件：`pca-projection` + 已有 `projection`。
- 判题：中心化数据并计算给定方向的方差/残差。
- 必写误区：PCA 前必须中心化；主成分方向不等于回归线。

## 4. Front Matter 建议

| 课 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | linalg-advanced/elimination | linalg/matrix | 4 | row-echelon-form |
| 18 | linalg-advanced/rank-nullspace | linalg-advanced/elimination | 4 | rank, nullspace |
| 19 | linalg-advanced/determinant-geometry | linalg-advanced/rank-nullspace | 4 | oriented-area |
| 20 | linalg-advanced/eigenvalues | linalg-advanced/determinant-geometry | 4 | eigenpair |
| 21 | linalg-advanced/svd-low-rank | linalg-advanced/eigenvalues | 5 | singular-value |
| 22 | linalg-advanced/pca-compression | linalg-advanced/svd-low-rank | 4 | principal-component |

首批课不引入第三方库；Python 只用已有循环、函数、列表和浮点运算。若确需 `zip`、`enumerate`、`abs` 等，先在正文给出生证明并按规范登记。

## 4A. 第二批课题切分

第二批继续沿用同一几何主线：形状分类 → 近似 → 结构 → 换基 → 稳定性 → 动力演化。

### 70 · 正定二次型（已完成）

- 文件：`70-positive-definite.md`
- 核心概念：二次型的等值线形状由对称矩阵的正负性决定。
- 边界：讲 2×2 对称矩阵、主子式和椭圆/抛物/双曲分类；不讲一般 Sylvester 定理证明。
- 组件：`quadratic-form` + `eigen-direction`。
- 判题：由对称矩阵计算二次型在给定点的值并分类。
- 必写误区：正定看所有方向，不是只看对角元；对称矩阵的交叉项要除以 2 记账。

### 80 · 最小二乘与正规方程（已完成）

- 文件：`80-least-squares.md`
- 核心概念：不可解方程组的最佳近似来自投影。
- 边界：讲一元线性拟合和 2×2 正规方程；不讲 QR/SVD 数值实现。
- 组件：`least-squares-fit` + `pca-projection`。
- 判题：由四个点计算均值、斜率和残差平方和。
- 必写误区：最小化垂直残差与竖直残差不同；正规方程病态时不能硬解。

### 90 · 向量空间与线性映射（已完成）

- 文件：`90-linear-maps.md`
- 核心概念：线性映射由基向量去向完全决定。
- 边界：讲公理、核、像和 2×2 映射；不讲商空间与泛函对偶。
- 组件：`linear-map` + `span-space`。
- 判题：判断映射是否保加法与数乘，并输出核/像类型。
- 必写误区：线性不是“像直线”；平移会破坏原点保持性。

### 100 · 相似与对角化（已完成）

- 文件：`100-diagonalization.md`
- 核心概念：换到特征基后，矩阵动作变成纯伸缩。
- 边界：讲相似变换、2×2 可对角化条件和几何解释；不讲 Jordan 标准型。
- 组件：`diagonalize-grid` + `eigen-direction`。
- 判题：由特征对组装 $P,D$ 并验证 $A=PDP^{-1}$。
- 必写误区：相似矩阵共享特征值但特征向量不同；有特征值不等于可对角化。

### 110 · 条件数与数值稳定性（已完成）

- 文件：`110-condition-number.md`
- 核心概念：条件数衡量输入扰动被放大多少倍。
- 边界：讲 2×2 线性系统、相对误差和奇异值条件数；不讲浮点格式细节。
- 组件：`condition-number` + `svd-stretch`。
- 判题：由奇异值计算条件数并分类稳定/病态。
- 必写误区：行列式小不等于病态；残差小不等于误差小。

### 120 · 矩阵幂与图传播（已完成）

- 文件：`120-matrix-powers.md`
- 核心概念：矩阵幂把“一步转移”变成“多步演化”。
- 边界：讲转移矩阵、二阶幂和长期收敛直觉；不讲 Perron-Frobenius 定理证明。
- 组件：`matrix-power` + `matrix`。
- 判题：计算转移矩阵平方并输出指定节点概率。
- 必写误区：转移矩阵每列/每行归一方向必须统一；幂增长不等于概率增长。

## 4B. 第二批组件清单

| renderer | 核心交互 | 消费课 |
| --- | --- | --- |
| `quadratic-form` | 拖动对称矩阵，实时画等值线和分类 | 70 |
| `least-squares-fit` | 拖点改数据，展示竖直残差与正规方程解 | 80 |
| `linear-map` | 拖输入点，显示基去向、核与像 | 90 |
| `diagonalize-grid` | 在标准基/特征基之间切换观察网格 | 100 |
| `condition-number` | 改奇异值，观察输入圆误差如何被放大 | 110 |
| `matrix-power` | 改转移概率和幂次，观察节点概率演化 | 120 |

## 5. 整章验收

1. 六个 renderer 注册且 validate 可识别。
2. 每课至少两个定制可视化；高难课不得用静态图凑数。
3. 每课一个判题 exercise，初始代码能运行但不通过，独立解法与 `@check` 逐行一致。
4. 每课有 quiz、误区卡、选读或边界说明。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿。
6. h2 逐页一致；浏览器测 exercise/quiz/viz；360px + dark 无溢出。
7. 报告结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记到 `AUDIT_REPORTS/OPEN_ITEMS.md`。
