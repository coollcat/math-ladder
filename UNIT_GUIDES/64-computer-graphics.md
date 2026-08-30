# 第 64 章 · 计算机图形学 生产指导
> 进度以 ROADMAP.md 为准；本文只作组件规格与课边界依据。

> 状态：全章 12 门正式课已全部建成齐线（05 点向量 / 25 四元数 / 45 曲面细分 / 80 方法地图四个缺口号位已于本轮回填；coordinate-transform 与 spline-editor 两个新渲染器已注册）。
> 目标：14 门课题经部分合并后为 12 门，全部落盘。
> 写法：`LESSON_TEMPLATE.md` 九段式 + 本章定制组件  
> 元数据基线：volume 5 / layer L7 / track geometry-space + scientific-computing / stage university-core / difficulty 4

## 1. 章定位

计算机图形学是「看得见的线性代数」：矩阵搬动模型，相机把三维压成像素，光栅化和着色决定最终颜色。主线推进：

```text
点向量坐标系 → 齐次仿射 → 旋转四元数 → 相机视图 → 透视投影裁剪 → 三角形光栅化 → 重心插值 → 纹理 Mipmap → 深度测试 → Bezier/B 样条 → 曲面细分（选讲）→ Phong 光照 → 光线求交路径追踪 → 方法地图
```

两条贯穿线：①**每一步都展示数据长什么样**——同一只小房子模型贯穿 10–65 课，学生亲眼看着它被平移、旋转、投影、光栅化、着色；②几何管线（10–65）与曲线光照射线（70–85）两个半场，70 课是分水岭。与 11 章/50 章分工：向量、矩阵、线性映射不再重讲，本章只做「图形语义」的升级；与 40 章多元微积分分工：法向量的几何意义直接引用。

## 2. 前置覆盖

- `linalg/vectors`、`linalg/dot-product`、`linalg/matrix`、`linalg/basis`、`linalg/projection`：向量运算与矩阵变换的出生地。
- `complex/polar`、`trig/unit-circle`、`trig/radian`：旋转角与极形式的直觉来源。
- `functions/linear`、`functions/transformations`：图像变换语言。
- `algebra/quadratic-formula`：85 课光线-球面求交解二次方程要用。
- `geometry/pythagoras`：距离计算。
- `calculus/derivative`：Bezier 切矢与参数曲线斜率的一句话引用。
- Python 只用已登记 `math` 与 matplotlib；无新 import（四元数课用纯列表实现四元数乘法）。

## 3. 组件清单（新增 5 个定制渲染器）

| renderer | 核心交互 | 服务课 |
| --- | --- | --- |
| `coordinate-transform` | 六滑块仿射矩阵实时揉捏小房子 | 20（主）、10/30 回扣 |
| `projection-frustum` | 视锥线框 + 投影落点联动 | 45（主）、40 复用 |
| `rasterizer-grid` | 拖顶点 + 扫描线逐格填充动画 | 50（主）、55 重心模式复用 |
| `spline-editor` | 拖控制点 + de Casteljau 骨架动画 | 70（主）、75 选讲复用 |
| `lighting-model` | 拖光源位置，三种着色模型对比 | 80（主） |

### 可实现规格

**coordinate-transform**
- spec 字段：`{ "type": "coordinate-transform", "title": "...", "model": "house", "matrix": [1,0,0,1,0,0] }`；`model`: `"house"` / `"triangle"` / `"letter-f"`（内置顶点表）；matrix 按 [a,b,c,d,tx,ty] 行主序给初值。
- 画布：左侧网格坐标面（−8..8）：原模型淡色轮廓 + 变换后实色轮廓 + 基向量 i/j 的箭头随矩阵弯曲；右侧当前 2×3 矩阵数值面板。连续操作时保留上一步的残影（最多 3 层淡出）。
- 交互：六个滑块（a b c d tx ty）；四个预设按钮「平移/缩放/旋转/剪切」把滑块补间到目标值；「重置回单位阵」按钮；开关显示基向量。
- 动画：预设按钮触发 400 ms 矩阵插值补间（线性混合即可，不要求 SLERP）；reduced-motion 直接跳终值。

**projection-frustum**
- spec 字段：{ "type": "projection-frustum", "fovDeg": 60, "nearZ": 0.5, "farZ": 10, "camDist": 5, "objPos": [1.5, 0.5, -6] }；objPos 为物体三轴位置。
- 画布分上下两栏：上栏侧视图——相机原点、视锥上下边线、near/far 竖线、立方体八个顶点点位、每个顶点到相机的投影射线虚线；下栏 2D 成像平面——透视除法后的落点连成的小立方体像，视锥外顶点标红并注「已裁剪」。正交/透视切换时下栏并排双图对照。
- 交互：fov/near/far/camDist 四滑块 + objPos 三滑块；透视↔正交切换钮；hover 上栏任一顶点显示其相机空间坐标与深度。
- 动画：「缓慢环绕」开关让相机绕 y 轴慢转（约 20 秒一圈），帮助建立三维感；默认关闭，离屏暂停，reduced-motion 禁用。

**rasterizer-grid**
- spec 字段：{ "type": "rasterizer-grid", "verts": [[2,2],[14,3],[5,13]], "mode": "fill" }；网格固定 16×12 像素；`mode`: `"fill"` / `"barycentric"`（三顶点 RGB 插值）/ `"edges"`（只亮边函数）。
- 画布：像素网格（含浅色格线），三角形三边粗描边覆盖其上；fill 模式按边函数同号判定逐格填色，边界像素按 top-left 规则裁决并在 hover 时解释该格判词；barycentric 模式每格颜色 = 三顶点颜色按重心权重混合，hover 显示三个权重的数值条。
- 交互：三个顶点均可指针拖拽（吸附到格中心）；「单步扫描」按钮每次推进一行，「播放」自动扫完（约 2 秒）；hover 任一格显示三条边函数值。
- 动画：扫描线逐行填充（短循环动画，扫完自动停）；reduced-motion 一次性显示最终结果。

**spline-editor**
- spec 字段：{ "type": "spline-editor", "degree": 3, "points": 4, "showSkeleton": true }；`degree` 2–4；控制点数量 3–6。
- 画布：坐标面 −5..5：控制多边形虚线折线 + 控制点方块（可拖拽）；曲线本体按当前 t 高亮推进绘制；showSkeleton 开启时画出 de Casteljau 中间层杆件与插值点（不同层级不同色）。B 样条模式下额外把影响区间按节点分段着底色。
- 交互：拖控制点曲线即时变形；t 滑块 0..1；「播放 t 扫描」按钮匀速画完整条曲线；degree 下拉切换 Bezier 次数（点数不足时自动截断并提示）。
- 动画：t 扫描为主动画（可暂停）；拖拽本身即实时反馈无需帧循环；reduced-motion 下禁用播放键、保留滑块。

**lighting-model**
- spec 字段：{ "type": "lighting-model", "model": "phong", "ka": 0.15, "kd": 0.7, "ks": 0.5, "shininess": 20, "roughness": 0.35, "metallic": 0.0 }；`model`: `"lambert"` / `"phong"` / `"pbr"`；PBR 参数仅在 pbr 模式生效。
- 画布：中央一个大球（canvas 手绘明暗渐变，不做 WebGL）：Lambert 只画 N·L 明暗；Phong 加高光斑（R·V^shininess）；PBR 模式用简化 Cook-Torrance 观感（菲涅尔边缘变亮 + 金属吸收漫反射）。光源位置以小太阳图标画在球面上方可沿半球拖动。右侧竖排三小条对比带同时展示三种模型的同视角结果。
- 交互：拖光源图标（pointer 事件映射到方位角/仰角）；ka/kd/ks/shininess 四滑块（pbr 模式换 roughness/metallic 两滑块）；模型单选钮；开关「显示向量分解」在球面画 N/L/V/R 四支箭头。
- 动画：无强制动画；一切随拖动实时更新。这是纯静态友好组件。

验收：五个 renderer 注册进 `RENDERERS`，dataset 签名守卫防 MutationObserver 重注入，亮暗主题可读（网格线/文字用主题变量），canvas 非空白，至少一门课真实消费。

## 4. 十四门课题切分

### 10 · 点、向量与坐标系

- 文件：`10-points-vectors-coords.md`
- 核心概念：图形学的一切对象先是数组；加法=平移组合，点积=夹角打分，模长=距离。
- 边界：讲二维向量运算复习与「点 vs 向量」之辨；不讲叉积三维推广（45 课需要时一句话引用）。
- 组件：已有 `vecadd`、`dotprod` 直接复用 + 浮窗 Python 小房子顶点表实验。
- 判题 exercise：a=[2,1]、b=[1,3]，打印 `a+b = [3, 4]`、`a·b = 5`、`模长 = 2.24`（round 两位）。初始代码把点积写成逐元素列表 [2, 3]。
- 必写误区：①点和向量长得一样但语义不同（平移对点是移动、对向量不变）；②点积是数不是向量；③屏幕坐标 y 轴向下，与数学习惯相反是万错之源。

### 20 · 齐次坐标与仿射变换

- 文件：`20-homogeneous-affine.md`
- 核心概念：给点加一个 1 分量，平移就变成了矩阵乘法；仿射=线性+平移的统一。
- 边界：讲齐次坐标、2D/3D 仿射矩阵拼接顺序；不讲投影部分（45 课）与仿射群代数结构。
- 组件：`coordinate-transform`（主）+ 已有 `linear-map` 对照「纯线性做不到平移」。
- 判题 exercise：先旋转 90 度再平移 (2,0)，作用于 p=[1,0]（矩阵 [[0,-1,2],[1,0,0],[0,0,1]]），打印 `变换后 = [2, 1]`。初始代码先平移后旋转得 [0, 3]，能跑但顺序反了。
- 必写误区：①矩阵作用从右往左读，顺序换了结果通常不同；②齐次分量 w 不是摆设，除以 w 是透视伏笔；③缩放负数=镜像，行列式变负要警觉。

### 30 · 旋转、四元数选讲

- 文件：`30-rotation-quaternion.md`
- 核心概念：旋转矩阵会积累误差且欧拉角有万向节死锁；四元数用一个四维单位向量编码任意旋转。
- 边界：讲旋转矩阵回顾与四元数乘法/共轭的使用规则；不讲李代数与四元数插值证明（SLERP 点名一句）。
- 组件：`coordinate-transform` 回扣旋转滑块 + 浮窗 Python 手搓四元数三明治积。
- 判题 exercise：q=(cos45°,0,0,sin45°) 把 v=(1,0,0) 转 90 度，v'=qvq* 各分量 round 两位后打印 `旋转后 = [0.0, 1.0, 0.0]`。初始代码共轭放错一侧得 [0.0, -1.0, 0.0]。
- 必写误区：①四元数必须单位化才表示旋转；②q 和 −q 是同一个旋转；③欧拉角顺序约定（XYZ/ZYX）不同引擎不同，照抄公式前先查。

### 40 · 视图矩阵与相机

- 文件：`40-view-camera.md`
- 核心概念：相机不动世界动——视图矩阵是世界反向变换；lookAt 由位置、目标、上向量构造。
- 边界：讲视图变换=仿射逆的思想与简单 lookAt 数值例；不讲任意轨道相机的数值稳定性细节。
- 组件：`coordinate-transform` 复用（把「相机后退 5 步」演示成世界前进 5 步）+ 浮窗 Python 构造视图矩阵。
- 判题 exercise：相机位于 (0,0,5) 朝 −z 看，把世界点 (1,2,3) 变入相机空间，打印 `相机空间坐标 = [1, 2, -2]`。初始代码加了相机位置而不是减。
- 必写误区：①视图矩阵是模型变换的逆，不是又一个「相机矩阵」乘上去；②相机永远停在原点看向 −z（约定各库一致但值得强调）；③上向量不能与视线平行，否则构造退化。

### 45 · 透视投影与视锥体裁剪

- 文件：`45-perspective-frustum.md`
- 核心概念：近大远小来自除以深度；视锥六面包住可见范围，出界即裁剪。
- 边界：讲透视除法、正交对照与 near/far 裁剪面判定；不讲裁剪算法的多边形细分实现。
- 组件：`projection-frustum`（主）。
- 判题 exercise：fov=90°（focal=1/tan(45°)≈1）、点 (1,1,−2)，透视除法后打印 `屏幕坐标 = [0.5, 0.5]`（round 两位）。初始代码忘了除以 z 直接输出 [1.0, 1.0]。
- 必写误区：①除的是 −z（或 w），深度为零/负的点不能投；②fov 越大视野越广但边缘拉伸越狠；③裁剪发生在投影之前或齐次空间，不是画到一半才判断。

### 50 · 三角形与光栅化

- 文件：`50-triangle-rasterization.md`
- 核心概念：GPU 只认三角形；哪些像素属于三角形由边函数同号判定，像素中心是裁判。
- 边界：讲边函数、像素中心采样与 top-left 规则的存在性；不讲瓦片化 GPU 微架构。
- 组件：`rasterizer-grid` fill 模式（主）。
- 判题 exercise：A(0,0)、B(4,0)、C(0,4)，算像素中心 (1,1) 的三条边函数，打印 `三条边函数 = [4, 8, 4]`、`判定：内部`。初始代码一条边叉积两操作数写反得 -8，误判外部。
- 必写误区：①判定看像素中心不是整个方块，贴边的三角形可能丢一行像素；②三点共线面积为零不构成可光栅化三角形；③绕向决定正面背面，背面剔除依赖它。

### 55 · 重心坐标与插值

- 文件：`55-barycentric-interpolation.md`
- 核心概念：三角形内任意点是三顶点的加权平均，权重=对面小三角形面积比；颜色/深度/纹理全靠它插值。
- 边界：讲重心坐标定义与归一化性质；不讲透视矫正插值的推导（点名存在即可）。
- 组件：`rasterizer-grid` barycentric 模式（RGB 三角形）为主。
- 判题 exercise：A(0,0)、B(4,0)、C(0,4)、p=(1,1)，打印 `重心坐标 = [0.5, 0.25, 0.25]` 与 `插值颜色 R 通道 = 127.5`（仅 A 为红色 255）。初始代码把 α 对应到顶点 A 以外的面积（权重张冠李戴）。
- 必写误区：①三个权重恒和为 1，不为 1 说明点在形外；②权重与「离谁近」有关但严格由面积定义；③屏幕空间的直线插值在透视下有偏差，硬件会做透视矫正。

### 60 · 纹理采样与 Mipmap 直觉

- 文件：`60-texture-mipmap.md`
- 核心概念：纹理是查表上色；双线性插值平滑取值，Mipmap 用金字塔预缩小抗摩尔纹。
- 边界：讲最近邻/双线性采样与 Mipmap 层级选择思想；不讲各向异性过滤实现。
- 组件：浮窗 Python（matplotlib 并排展示最近邻 vs 双线性放大效果）+ `rasterizer-grid` barycentric 模式回扣插值同源性。
- 判题 exercise：2×2 纹素 [[10,20],[30,40]] 在 (0.5,0.5) 双线性采样，打印 `双线性采样 = 25.0`；Mipmap 总显存约为原图 1/(1−1/4) 倍，打印 `Mipmap 显存倍率 = 1.33`（round 两位）。初始代码用最近邻得 10.0。
- 必写误区：①纹理坐标是 0..1 的相对坐标，越界行为（重复/钳制）要显式选；②双线性解决平滑不解决闪烁，缩小还得靠金字塔；③Mipmap 多占的那三分之一显存买的是远处稳定。

### 65 · 深度测试与隐藏面消除

- 文件：`65-depth-testing.md`
- 核心概念：z-buffer 逐像素记录最近深度，后到的更远者丢弃——遮挡与绘制顺序解耦。
- 边界：讲 z-buffer 规则与画家算法失效例子；不讲 early-z 优化与深度精度分布。
- 组件：浮窗 Python（matplotlib 三块色板模拟 z-buffer 逐个写入过程，输出中间快照）。
- 判题 exercise：同一像素先后被深度 5、3、7 的片元命中，打印 `最终深度 = 3` 与 `未通过测试次数 = 2`。初始代码用 max 保留最远得 7。
- 必写误区：①透明物体不能用 z-buffer 一刀切，要先画不透明再排序画透明；②画家算法 O(n²) 且相交三角形会出错，z-buffer 才是通用解；③深度比较方向（小于通过）要与投影时的深度范围约定配套。

### 70 · Bezier 曲线与 B 样条

- 文件：`70-bezier-bspline.md`
- 核心概念：控制点拉着曲线走；de Casteljau 递归中点构造给出稳定算法；B 样条把控制力局部化。
- 边界：讲 Bernstein 权重、de Casteljau 过程与 B 样条局部性思想；不讲节点向量插入与 NURBS 有理化。
- 组件：`spline-editor`（主）。
- 判题 exercise：三次 Bezier P0=(0,0),P1=(0,2),P2=(2,2),P3=(2,0) 在 t=0.5 求值，打印 `B(0.5) = [1.0, 1.5]`。初始代码四个权重都写成 0.25 得 [1.0, 1.0]。
- 必写误区：①控制点多边形只是骨架，曲线一般不过中间控制点；②t 不是弧长比例，等步进 t 速度不均匀；③升阶改变表示不改变曲线形状。

### 75 · 曲面细分选讲

- 文件：`75-tessellation.md`
- 核心概念：一条曲线可以从中点切成两条低阶 Bezier，切到足够细就是曲面细分的原型。
- 边界：讲 de Casteljau 分割公式与细分收敛直觉；不讲 LOD 屏幕误差度量与壳/域着色器管线。
- 组件：`spline-editor` 复用（叠加分割后的左右控制多边形）+ 浮窗 Python 打印分割控制点。
- 判题 exercise：对 70 课同一条曲线做 t=0.5 分割，打印左半控制点 `左半控制点 = [(0.0, 0.0), (0.0, 1.0), (0.5, 1.5), (1.0, 1.5)]`（坐标一律写浮点字面量保证格式）。初始代码中点全部按 t=0.25 取值导致整列偏移。
- 必写误区：①分割后的两条曲线合起来与原曲线完全重合，是精确操作不是近似；②每细分一层控制点翻倍，深度要有上限；③本课选讲，重点拿走「递归中点」这一个动作。

### 80 · Phong/PBR 光照直觉

- 文件：`80-phong-lighting.md`
- 核心概念：颜色=环境项+漫反射(N·L)+镜面反射(R·V)^n；PBR 用粗糙度/金属度替换拍脑袋的高光指数。
- 边界：讲 Lambert/Phong 公式与 PBR 参数观感对照；不讲 BRDF 积分与辐射度学单位体系。
- 组件：`lighting-model`（主）。
- 判题 exercise：N=(0,0,1)、L=(1,1,1) 归一化后 diffuse=N·L_hat，V=N 时 specular=(N·L)^shininess（shininess=10），打印 `漫反射项 = 0.58`（round 两位）、`镜面反射项 = 0.0041`（round 四位）。初始代码忘记归一化 L，两项都得 1.0。
- 必写误区：①光照在法向量空间计算，模型没归一化法线就会斑驳；②镜面高光是观察相关的，换个角度就挪位；③能量守恒是 PBR 的底线：反射越多漫反射必须越少。

### 85 · 光线求交与路径追踪入门

- 文件：`85-raytracing-intro.md`
- 核心概念：光栅化的反面——从相机发一根光线问「先撞到谁」；光线-球面归结为一个二次方程。
- 边界：讲射线方程、球面求交取近根与递归反弹一段话；不讲 BVH 加速与重要性采样。
- 组件：浮窗 Python（matplotlib 俯视剖面图画射线与圆的相交）。
- 判题 exercise：O=(0,0,-5)、d=(0,0,1)、球心原点半径 1，解 |O+td|²=1 取较小根，打印 `命中 t = 4.0` 与 `交点 = [0.0, 0.0, -1.0]`。初始代码取较大根得 6.0（穿到球背面）。
- 必写误区：①判别式小于零是脱靶，不是错误；②取近根但要检查它在相机前方（t>0）；③路径追踪每反弹一次能量都要乘反照率，不衰减就是永动机。

### 90 · 图形学方法地图

- 文件：`90-method-map.md`
- 核心概念：光栅化管线 vs 光线追踪两条路线的分诊台；几何问题回到矩阵、颜色问题回到光照模型。
- 边界：讲方法选择与新场景演练；不引入新数学。
- 组件：五组件速览串联收尾。
- 判题 exercise：实现 `recommend(task)`：物体要动起来返回 `affine-transform`，两物体谁挡谁返回 `z-buffer`，Logo 要光滑圆角返回 `bezier`。三个 print 对应三行 @check（`affine-transform` / `z-buffer` / `bezier`）。初始分支全返回 `"wrong"`。
- 必写误区：①先问「实时还是离线」再选管线；②所有炫酷效果最后都是矩阵乘法+插值+查表的组合；③方法地图是导航页，推导细节回各课。

## 5. Front Matter 建议

| 课号 | lesson_id | prereqs | difficulty | introduces_concepts |
| --- | --- | --- | --- | --- |
| 10 | graphics/points-vectors-coords | linalg/vectors, linalg/dot-product | 3 | vertex, screen-coordinates |
| 18 | graphics/homogeneous-affine | graphics/points-vectors-coords, linalg/matrix | 4 | homogeneous-coordinate, affine-transform |
| 19 | graphics/rotation-quaternion | complex/polar, graphics/homogeneous-affine | 5 | quaternion, gimbal-lock |
| 20 | graphics/view-camera | graphics/homogeneous-affine | 4 | view-matrix, look-at |
| 45 | graphics/perspective-frustum | graphics/view-camera | 4 | perspective-projection, view-frustum-clipping |
| 21 | graphics/triangle-rasterization | graphics/perspective-frustum, linalg/dot-product | 4 | rasterization, edge-function |
| 55 | graphics/barycentric-interpolation | graphics/triangle-rasterization | 4 | barycentric-coordinate |
| 22 | graphics/texture-mipmap | graphics/barycentric-interpolation | 3 | texture-sampling, bilinear-filtering, mipmap |
| 65 | graphics/depth-testing | graphics/texture-mipmap | 4 | z-buffer, hidden-surface |
| 23 | graphics/bezier-bspline | graphics/depth-testing, calculus/derivative | 4 | bernstein-polynomial, bezier-curve, b-spline |
| 75 | graphics/tessellation | graphics/bezier-bspline | 4 | curve-subdivision |
| 24 | graphics/phong-lighting | graphics/bezier-bspline, linalg/dot-product | 4 | phong-shading, pbr |
| 85 | graphics/raytracing-intro | algebra/quadratic-formula, graphics/phong-lighting | 5 | ray-intersection, path-tracing |
| 25 | graphics/method-map | graphics/raytracing-intro | 3 | （空） |

import 登记：全章无新增 import（math/matplotlib 均已登记）；30/85 课的复数与求根用 math + 手写公式完成，禁止为省事引入 cmath/numpy。difficulty 主干 4；30（四元数）与 85（路径追踪）为章内双峰 5；入门与方法地图 3。

## 6. 整章验收清单

1. 五个新 renderer 注册且 validate 可识别；`rasterizer-grid`/`spline-editor` 的拖拽必须有 pointer capture 与触屏可用性，`projection-frustum` 环绕动画默认关闭。
2. 每课一个判题 exercise，初始代码能运行但不通过；@check 期望输出与本指南逐字一致（元组列表格式如 `(0.0, 0.0)` 依赖浮点字面量，写作时要落实）。
3. 「小房子贯穿」承诺兑现：10/20/40/45/50 至少五课出现同一模型数据的连续演化。
4. 与卷一第 11 章、卷二 20/21 章的分界声明出现在 10/70 课正文一句带过；不重复推导线性代数。
5. `npm run validate`、`node scripts/gen-graph.mjs`、`npm run build` 全绿；h2 源码/产物计数一致；显示公式单行、花括号 `\lbrace\rbrace`；quiz 内不放 KaTeX。
6. 浏览器手测：五组件（重点拖拽类）、Alt+P 浮窗、路由往返无重复注入；360px + dark 无溢出。
7. 结论合并进 `CONTENT_AUDIT.md`，非阻塞项登记 `AUDIT_REPORTS/OPEN_ITEMS.md`。
