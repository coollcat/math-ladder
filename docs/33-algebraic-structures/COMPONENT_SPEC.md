---
title: 第 33 章组件规格（非课程）
description: 代数结构章交互组件的实现规格、状态与验收标准。
lesson_id: algebraic-structures/component-spec
prereqs:
  - numtheory/congruence
volume: 3
layer: L2
track:
  - algebra-structure
stage: university-core
difficulty: 4
draft: true
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 组件实现规格

本文件是工程规格，不是读者课程。前三个核心组件已有第一版：`operation-table`、`finite-field-inverse-grid` 和 `cyclic-generator`；其余仍按本规格待实现。已实现版本优先保证行/列或 x/y 双轴选择、中文结论、暗色主题和移动端横向滚动。

## 共同验收标准

1. 所有二维表和平面必须同时暴露横向与纵向控制：行/列或 x/y 都可选中、拖动或键盘移动，不能只做单向演示。
2. 每个组件有明确 aria-label、焦点顺序、Enter/Space 主操作、方向键网格导航；触屏目标不小于 40px。
3. 状态变化用文字和颜色双重表达，暗色模式下对比度达标。
4. 渲染器只读 JSON spec，不改 Markdown 节点；插入容器必须带防重复绑定守卫。
5. 元素个数限制在可读范围：表格不超过 12x12，平面默认视口内显示完整坐标轴并提供缩放。
6. 组件标题和结论文案使用中文；数学记号交给 KaTeX 或等宽文本，不做图片化。

## operation-table

**状态**：第一版已实现。支持双轴选择、方向键移动、结构高亮和单位/零因子判定；单元格编辑与候选子群框选留到第二版。

**目标**：让学生在凯莱表里亲手发现单位元、逆元、交换性和封闭性。

### 数据

```json
{
  "type": "operation-table",
  "title": "模 6 加法表",
  "elements": ["0", "1", "2", "3", "4", "5"],
  "operation": "(a+b) mod 6",
  "mode": "explore",
  "highlight": ["identity", "inverses", "commuting-pairs"]
}
```

### 交互

1. 已实现：行轴选择 $a$，列轴选择 $b$；点击交点单元格同步选中两个轴。
2. 已实现：高亮单位元、互逆对、交换差异和乘法零因子。
3. 已实现：结论条输出选中运算、单位元、单位列表、交换律和零因子。
4. 第二版：允许编辑自定义表中的结果，标记越界，并框出候选子群。

### 判定

学生能通过至少三次筛选回答：谁是单位元、哪些元素可逆、是否存在零因子。

## group-explorer

**状态**：待实现。

**目标**：把二面体群的旋转与翻面变成可组合的动作棋盘。

### 数据

```json
{
  "type": "group-explorer",
  "title": "正方形的旋转与翻面",
  "object": "square-4",
  "generators": [
    { "id": "r", "label": "顺时针旋转 90°" },
    { "id": "s", "label": "垂直轴翻面" }
  ],
  "grid": { "xAxis": "r-power", "yAxis": "reflection-count", "maxX": 3 }
}
```

### 交互

1. 平面横轴是 $r$ 的幂次，纵轴是是否追加翻面；每个格子代表一个动作。
2. 点击动作格后，左侧图形实时变换，路径记录成词，如 `s r^2`。
3. 支持拖动起点到另一动作，自动计算复合并显示是否交换。
4. “回到恒等”按钮搜索逆元路径，帮助学生看见逆元的几何含义。

### 判定

学生能用同一棋盘解释封闭、结合示例、单位和逆元，并找出两个不可交换动作。

## cyclic-generator

**状态**：第一版已实现。圆盘与幂次平面共享 k 状态；滑块、按钮、拖拽和方向键（左右调 k、上下调步长）均可用。“旧轨道淡出”动画留到下一版。

**目标**：同时展示圆周循环和幂次平面，避免学生只记住“绕圈”。

### 数据

```json
{
  "type": "cyclic-generator",
  "title": "模 n 加法的生成轨道",
  "modulus": 12,
  "step": 5,
  "power": 3,
  "showAll": true
}
```

### 交互

1. 圆视图支持步长滑块和单步前进/后退；访问过的刻度保留轨迹。
2. 幂次平面横轴是次数 $k$，纵轴是落点 $kg\bmod n$；点击任意点高亮对应圆上位置。
3. 已实现：双视图同步同一个 k；改变步长后点列立即重排。
4. 已实现：结论条输出最大公约数、元素阶和是否生成全群。
5. 第二版：为旧轨道增加淡出过渡，并支持乘法循环群模式。

### 判定

学生能预测 $\gcd(g,n)=1$ 时轨道覆盖全群，并用平面中的重复周期验证。

## isomorphism-map

**状态**：待实现。

**目标**：把“双射 + 保运算”拆成两关，防止只看一一对应就宣布同构。

### 数据

```json
{
  "type": "isomorphism-map",
  "title": "Z4 到四格旋转",
  "left": { "name": "Z4", "elements": [0, 1, 2, 3], "operation": "+" },
  "right": { "name": "rotations", "elements": ["1", "i", "-1", "-i"], "operation": "*" },
  "mapping": [[0], [1], [2], [3]]
}
```

### 交互

1. 左右两栏之间是映射矩阵：横轴表示左元素，纵轴表示右元素，点击切换箭头。
2. 第一关实时判定是否函数、单射、满射、双射。
3. 第二关让学生任选 $a,b$；组件并排显示 $\phi(a*b)$ 与 $\phi(a)\circ\phi(b)$。
4. 提供“全表审计”，但只有学生先手动抽查三组后才解锁完整结果。
5. 失败时标出最小反例，而不是直接给出正确映射。

### 判定

学生能区分“不是双射”“双射但不保运算”和“同构”三种状态。

## polynomial-ring-lab

**状态**：待实现。

**目标**：用系数平面替代纯符号演算，让乘法的卷积位置可见。

### 数据

```json
{
  "type": "polynomial-ring-lab",
  "title": "系数环上的多项式乘法",
  "coefficientRing": "Z7",
  "left": [1, 1],
  "right": [6, 2],
  "plane": {
    "xAxis": "degree of left term",
    "yAxis": "degree of right term",
    "cell": "product contribution"
  },
  "showConvolution": true
}
```

### 交互

1. 左侧系数表控制被乘式，右侧控制乘式；每项可增删、赋值或按模归约。
2. 中央平面横轴是左项次数，纵轴是右项次数；每个格子显示 $a_i b_j$ 及其目标次数 $i+j$。
3. 点击同一对角线上的格子，右侧结果多项式的对应系数闪烁累加。
4. 提供普通整数模式和模 $m$ 模式；模模式显示负系数与余数的等价。

### 判定

学生能解释为什么多项式乘法不是逐位相乘，并能手工追踪一条卷积对角线。

## homomorphism-kernel-map

**状态**：待实现。

**目标**：让核不只是公式，而是被压扁到目标单位的纤维。

### 数据

```json
{
  "type": "homomorphism-kernel-map",
  "source": { "name": "Z8", "size": 8 },
  "target": { "name": "Z4", "size": 4 },
  "map": "x mod 4",
  "showFibers": true,
  "showKernel": true
}
```

### 交互

1. 上排源群、下排像群；横轴都是余数，纵轴表示映射层级。
2. 点击源元素画箭头到像；同一根纤维共享颜色。
3. 核纤维固定为强调色，并可叠加加法检查：任取核内两点，其和仍在核内。
4. 学生可以切换非法映射，观察保运算检查在哪一对输入首次失败。

### 判定

学生能说出核是子群，并解释它如何定义“哪些输入被视为等价”。

## finite-field-inverse-grid

**状态**：第一版已实现。支持 x/y 双轴、三类过滤器和域/环判读；模数目前由 JSON 固定，页内改模数滑块留给第二版。

**目标**：在乘法表中一眼分出域、含零因子的环和不可逆元素。

### 数据

```json
{
  "type": "finite-field-inverse-grid",
  "modulus": 11,
  "xAxis": "a",
  "yAxis": "b",
  "value": "(a*b) mod 11",
  "filters": ["equals-one", "equals-zero", "nonzero-zero-product"]
}
```

### 交互

1. 横纵双轴都可点击选择 $a,b$；对应单元格放大显示普通积与取余后的值。
2. 过滤器分别高亮乘积为 1、为 0 以及参与制造零因子的非零元素。
3. 已实现：结论条输出单位列表；素数模所有非零行都有绿色 1 格。
4. 已实现：合数模通过“乘积=1”过滤器显示不可逆行，通过非零零积标出零因子。
5. 第二版：增加页内模数滑块并原地重绘。

### 判定

学生能根据网格判断 $\mathbb Z_n$ 是否为域，并举出一个零因子实例。

## 实现顺序建议

1. 已完成第一版：`finite-field-inverse-grid`、`operation-table` 和 `cyclic-generator`。
2. 下一批：`isomorphism-map` 与 `homomorphism-kernel-map`，统一箭头矩阵与保运算审计。
3. 最后一批：`group-explorer` 与 `polynomial-ring-lab`，二者需要更强的图形和拖拽状态管理。
