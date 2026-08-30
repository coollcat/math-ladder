---
title: 排队论与吞吐量
lesson_id: engineering-cybernetics/queueing-throughput
prereqs:
  - engineering-cybernetics/optimal-scheduling-allocation
volume: 5
layer: L11
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - queue-utilization
  - throughput-bottleneck
applications:
  - hospital-clinic-flow
  - container-terminal
exits:
  - engineering
---

# 排队论与吞吐量

## 1. 开场钩子

安检口利用率 90% 时队伍可能很长；利用率 99% 时几乎必然拥堵。排队系统关心的不只是平均速度，还有波动被放大后的等待。

## 2. 直觉解释

到达率 $\lambda$ 是单位时间来的任务数，服务率 $\mu$ 是单通道完成率，利用率为 $\rho=\lambda/\mu$。只有 $\rho<1$ 才能长期稳定；接近 1 时小波动造成长队。

## 3. 正式定义与 Little 定律

$$L=\lambda W.$$

$L$ 是平均队长，$W$ 是平均逗留时间。若 $c$ 个通道并行，稳定要求 $\lambda<c\mu$。瓶颈环节决定整线节拍。

## 4. 分步例题

诊室每 6 分钟完成一人，$\mu=10$ 人/小时；到达 $\lambda=8$。则 $\rho=0.8$，简化队长 $L=0.8/(1-0.8)=4$，平均逗留 $W=0.5$ 小时。到达升到 9.5 后，$\rho=0.95$，队长升到 19：到达只增约 19%，等待却近四倍。

## 5. 动手实验

### 实验 1：确定性队列演化

```python title="有限时段的闸口队列"
# sliders: arrival_rate=52 [10:95:1], service_rate=60 [20:100:1]
queue = 0.0                 # 当前排队车辆数
h = 1.0                     # 步长：1 分钟
end_time = 120.0            # 时间终点：两小时
max_steps = int(end_time / h)
peak_queue = 0.0

for step in range(max_steps):
    arrivals = arrival_rate / 60 * h   # 每步平均到达
    served = min(service_rate / 60 * h, queue + arrivals)
    queue = max(0.0, min(120.0, queue + arrivals - served))
    peak_queue = max(peak_queue, queue)

print(f"终点={max_steps*h:.0f}分钟")
print(f"最终队列={queue:.1f}")
print(f"峰值队列={peak_queue:.1f}")
print(f"利用率={arrival_rate/service_rate:.2f}")
```

把到达率拖近服务率，队列迅速上升；真实随机到达会让拥堵更早出现。

### 实验 2：利用率与等待放大

```viz
{
  "type": "plot",
  "title": "简化平均队长随利用率变化",
  "expr": "x/(1-x)",
  "xmin": 0,
  "xmax": 0.95
}
```

曲线右侧陡增，说明不能按“平均值刚好够用”设计产能。想看多通道情形，把横轴换成 λ/(cμ) 后形状不变，临界点仍在利用率 1 处。

## 6. 练习

```exercise
# @title: 练习：判断排队系统是否稳定
# @check: 1.25
# @check: unstable
# @hint: 四个同速通道的总服务率是 c*mu；利用率=lambda/(c*mu)。
lambda_rate = 50
mu_rate = 10
channels = 4
utilization = lambda_rate / channels + mu_rate
verdict = "stable"
print(round(utilization, 2))
print(verdict)
```

<details>
<summary>点开查看逐步解答</summary>

总服务能力是 $4\times10=40$ 人/小时，到达 50 人/小时，所以不稳定；利用率为 $50/40=1.25$。初始代码把总服务率写成加法，又没有真正判断稳定性。

</details>

## 7. 概念快问快答

```quiz
排队系统长期稳定的必要条件是什么？
- 队长必须为零
- 到达率小于总服务率 [*]
- 服务时间完全固定
? 若需求持续超过服务能力，队列没有清空机制，等待会无界增长。
```

## 8. 常见误区

:::warning[常见误区]

**误区一**：你以为低于 100% 利用率就安全。接近满载时波动被强烈放大。

**误区二**：你以为加快非瓶颈工序能提升吞吐。节拍由最慢环节决定。

**误区三**：你以为 Little 定律要求特殊分布。它是长期平衡下的守恒关系。

:::

## 9. 选读：波动成本

<details>
<summary>选读 · 为什么随机性重要</summary>

即使平均值够用，同时到达或服务偶尔变慢都会积压。排队论把波动变成可计算指标，帮助权衡产能、缓冲和响应时间。

</details>

## 10. 下一站

工程反馈也发生在组织里。下一课看信息反馈如何改变团队行为。

→ [信息反馈在组织系统中的作用](./85-information-feedback-organizations.md)
