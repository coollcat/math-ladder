---
title: 系统、环境、信息和调节
lesson_id: engineering-cybernetics/systems-information-regulation
prereqs:
  - engineering-cybernetics/feedback-to-engineering-cybernetics
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - system-boundary
  - regulated-variable
applications:
  - urban-traffic-control
  - production-line-balance
exits:
  - engineering
---

# 系统、环境、信息和调节

## 1. 开场钩子

高峰期一个路口延长红灯，几条街外的车流也会变化。工程师必须先决定边界画在哪里：只研究一个路口，还是把上游到达率也算进系统。边界不同，“扰动”和“可控变量”会互换。

## 2. 直觉解释

系统是被边界选出来的变量集合；环境是边界外影响它但不由它直接决定的部分。信息是能减少不确定性的观测；调节是让关键变量留在允许范围内的持续动作。

生产线也是一样：节拍时间是受控变量，订单波动和物料延迟是环境扰动，工位传感器提供信息，调整工人或缓冲区是调节。

## 3. 正式定义

取队列长度 $q$ 为状态：

$$\frac{dq}{dt}=u(t)+d(t)-w(t).$$

$u$ 是可控流入，$d$ 是环境流入，$w$ 是服务流出。平衡时 $u+w$ 的关系必须抵消 $d$；若要主动消散队列，净流出还必须为正。

## 4. 分步例题

某路口排队 $18$ 辆，目标 $12$ 辆，服务率 $w=0.40$ 车/秒，环境驶入 $d=0.26$ 车/秒。

1. 维持现状需要 $u=0.40-0.26=0.14$ 车/秒；
2. 若希望每秒净减少 $0.05$ 辆，需要 $u=0.14-0.05=0.09$ 车/秒；
3. 若上游已经没有可控流入空间，只能缩短绿灯提高 $w$；
4. 已排好的车不能凭空消失，控制改变的是后续进入率和离开率；
5. 调节动作要周期性重复，因为需求和信号灯状态持续变化。

## 5. 动手实验

### 实验 1：有限时段的队列仿真

```python title="城市路口的两分钟调节"
# sliders: target=12 [4:24:1], demand=0.26 [0.05:0.50:0.01], service=0.38 [0.10:0.60:0.01]
q = 18.0                 # 当前排队长度
h = 2.0                  # 步长：每个控制周期 2 秒
end_time = 120.0         # 时间终点：只观察两分钟
max_steps = int(end_time / h)
capacity = 28.0          # 物理上限：路段容纳的车辆数

for step in range(max_steps):
    outflow = min(service, q / h)           # min 取较小值：服务不能超过现存车辆
    desired_in = max(outflow - demand, 0.0) # max 取较大值：先用流出需求决定放行量，且不为负
    correction = 0.03 * (target - q)        # 队列过高时进一步压低流入
    controlled_in = max(desired_in + correction, 0.0)
    dq = controlled_in + demand - outflow
    q = max(0.0, min(capacity, q + h * dq))

print(f"终点时间={max_steps*h:.0f}s")
print(f"最终排队={q:.1f}")
print(f"维持平衡所需流入={max(service-demand,0):.2f}")
```

提高需求滑块，最终队列上升；提高服务率，队列下降。这里先去掉随机扰动，看清确定性趋势。

### 实验 2：把偏差变成方向场

```viz
{
  "type": "slope-field",
  "title": "队列高于目标后逐渐消散",
  "expr": "-0.03*(y-12)",
  "t0": 0,
  "y0": 18,
  "ymin": 0,
  "ymax": 30
}
```

横轴是时间，纵轴是队列长度。箭头向下表示队列减少；靠近目标线后变化变缓。

## 6. 练习

```exercise
# @title: 练习：区分维持与消散
# @check: 0.12
# @check: 0.00
# @hint: 维持时 dq/dt=0；主动消散要求负净流入，但受控流入最小只能是零。
demand = 0.26
service = 0.38
maintain_in = service - demand            # 维持平衡：u+d-w=0
dissipate_rate = 0.15                     # 想让队列每秒净减少的量
dissipate_in = service - demand           # 错：这是维持的流入，不是消散的
print(f"{maintain_in:.2f}")
print(f"{max(dissipate_in, 0.0):.2f}")
```

初始代码把"维持"的流入直接当成了"消散"的流入。先算出理论值再判断要不要截断。

<details>
<summary>点开查看逐步解答</summary>

维持平衡要求 $u+d-w=0$，所以 $u=0.12$。若要每秒净减少 $0.15$，则 $u+0.26-0.38=-0.15$，理论值是 $u=-0.03$；受控流入最小只能是零，因此打印 0.00——想真正实现这个消散速度必须提高服务率或限制驶入。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为系统边界天然存在。其实它是建模选择，边界不同，扰动和可控变量会互换。

**误区二**：你以为测得多就一定调节得好。信息要准时、准确、相关，否则只增加噪声和负担。

**误区三**：你以为调节是一次性优化。持续系统需要反复测量、决策、执行和复盘。

:::

## 8. 选读：正反馈与负反馈

<details>
<summary>选读 · 符号决定命运</summary>

负反馈把偏差反向送回输入端，通常起稳定作用；正反馈把变化继续放大，可能形成增长、拥堵扩散或振荡。大系统常同时包含两种回路，例如事故导致减速，减速又引发更多事故。识别主导回路是系统工程的第一层判断。

</details>

## 9. 下一站

如果无法打开机器内部，还能通过输入输出认识它吗？下一课讲黑箱建模。

→ [黑箱建模与输入输出关系](./20-blackbox-input-output.md)
