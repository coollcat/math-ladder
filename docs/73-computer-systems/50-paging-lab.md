---
title: 虚拟内存与分页
lesson_id: computer-systems/paging-lab
prereqs:
  - computer-systems/scheduler-lab
  - probability-advanced/expectation
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L4
track:
  - discrete-computing
  - probability-statistics
stage: university-core
difficulty: 3
introduces_concepts:
  - virtual-address-translation
  - multi-level-page-table
  - tlb-effective-access-time
  - belady-anomaly
applications:
  - memory-management
  - cache-design
  - performance-tuning
exits:
  - engineering
---
## 1. 从一个场景开始
一台 8 GB 内存的笔记本，同时开着浏览器、IDE、虚拟机——它们加起来申请了 40 GB。机器没有崩，每个程序都觉得自己独占了整块内存。
更奇怪的是：**两个程序完全可以同时使用地址 `0x401000`**，且互不干扰。地址到底是什么东西，凭什么能被"重复"使用？
## 2. 直觉解释
把物理内存想成**一排书架的格子**（页帧），每个程序拿到的是**一本自己编了页码的笔记本**（虚拟地址空间）：
- 程序永远只在自己的笔记本上写字，页码从 1 到几百万；
- 操作系统手里有一张**对照表**（页表）：笔记本第 37 页 → 书架第 205 格；
- 两本不同的笔记本都可以有"第 37 页"，只要对照表里指向不同的格子就行；
- CPU 每次查表太慢，于是把最近用过的几条抄在一张**便签**上贴在手边——这就是 **TLB**。
于是虚拟内存白送了你四件礼物：**隔离**（看不到别人的格子）、**超额分配**（40 GB 逻辑地址映射到 8 GB 物理内存）、**共享**（同一份 libc 映射给一千个进程）、**按需调页**（真正用到的页才从磁盘搬进来）。
## 3. 正式定义
**分页**：把虚拟地址空间与物理内存都切成固定大小的块，分别叫**页（page）**与**页帧（frame）**。x86-64 上页大小 $P = 2^{12}$ 字节 = **4 KB**。
虚拟地址 $v$ 拆成两部分：
$v = \underbrace{v_{\text{VPN}}}_{\text{虚拟页号}} \times P + \underbrace{v_{\text{off}}}_{\text{页内偏移}}, \qquad v_{\text{off}} = v \bmod P,\quad v_{\text{VPN}} = \lfloor v / P \rfloor$
| 符号 | 含义 | 典型取值 |
| --- | --- | --- |
| $P$ | 页大小 | 4 KB（$2^{12}$），大页 2 MB / 1 GB |
| $v_{\text{off}}$ | 页内偏移 | 低 12 位 |
| $v_{\text{VPN}}$ | 虚拟页号 | 48 位地址时为高 36 位 |
| $\ell$ | 页表级数 | x86-64 为 4 级，每级索引 9 位（512 项 × 8 B = 4 KB，正好一页） |
| PTE | 页表项 | 8 字节：物理帧号 + 权限位（R/W/X、U/S、脏位、访问位） |
**有效访问时间（EAT）**：设 TLB 查找耗时 $t_{\text{TLB}}$、一次内存访问 $t_m$、TLB 命中率 $h$：
$\text{EAT} = h\,(t_{\text{TLB}} + t_m) + (1-h)\,\bigl(t_{\text{TLB}} + (\ell + 1)\,t_m\bigr)$
代入 $t_{\text{TLB}} = 1$ ns、$t_m = 100$ ns、$h = 0.99$、$\ell = 4$：
$\text{EAT} = 0.99 \times 101 + 0.01 \times 501 = 105\ \text{ns}$
**缺页（page fault）**：页表项的"存在位"为 0 时触发异常，内核从磁盘调入该页。磁盘约 **10 ms**，是命中的 $10^5$ 倍——**缺页率是内存系统里最重要的那个百分比**。
**页面置换**：当没有空闲帧时，必须挑一页"牺牲"。三种经典策略：
| 策略 | 挑谁 | 性质 |
| --- | --- | --- |
| FIFO | 最早进来的 | 简单，但会 **Belady 异常** |
| LRU | 最久没被访问的 | 基于局部性，效果好，实现有开销 |
| OPT（MIN） | 未来最晚才被用到的 | 理论最优，需要预知未来，只能离线用 |
## 4. 分步例题
**例**：访问序列 $1,2,3,4,1,2,5,1,2,3,4,5$，物理帧数 3。分别求 FIFO、LRU、OPT 的缺页次数。
1. **前三次**（1,2,3）必然缺页，帧满为 $\lbrace1,2,3\rbrace$，共 3 次；
2. **FIFO**：第 4 次访问 4，淘汰最早进来的 1 → $\lbrace4,2,3\rbrace$（4 次）；访问 1 淘汰 2（5 次）；访问 2 淘汰 3（6 次）；访问 5 淘汰 4（7 次）；1、2 命中；访问 3 淘汰 1（8 次）；访问 4 淘汰 2（9 次）；5 命中 → **9 次**；
3. **LRU**：第 4 次淘汰最久未用的 1 → $\lbrace4,2,3\rbrace$（4 次）；访问 1 淘汰 2（5 次）；访问 2 淘汰 3（6 次）；访问 5 淘汰 4（7 次）；1、2 命中；访问 3 淘汰 5（8 次）；访问 4 淘汰 1（9 次）；访问 5 淘汰 2（10 次）→ **10 次**；
4. **OPT**：第 4 次看未来，1 在第 5 位、2 在第 6 位、3 在第 10 位 → 淘汰 3（4 次）；访问 5 时淘汰 4（5 次）；访问 3 时淘汰 1 或 2（6 次）；访问 4 时淘汰 3（7 次）；最后的 5 命中 → **7 次**；
5. **Belady 异常**：把帧数加到 4，FIFO 的缺页次数变成 **10 次**——**内存变多，缺页反而变多了**。
## 5. 动手实验
### 实验 1（lab）：把帧数从 3 拖到 4，看 FIFO 翻车
```lab
{
  "type": "paging-lab",
  "title": "页面置换：FIFO / LRU / OPT 的每一次命中与缺页",
  "sliders": [
    { "name": "frames", "label": "物理帧数", "min": 1, "max": 6, "step": 1, "value": 3 }
  ]
}
```
上方是当前帧的内容，下方矩阵的行是帧、列是访问序列，红色格子表示"这一列发生了缺页"。用"单步 / 上一步"逐格走，或直接看读数里的 **Belady** 一栏——它会把 1~6 帧的 FIFO 缺页次数全列出来，并标出"⚠ N→N+1 帧反而变多"。
做三组对照：
- 预设"经典 Belady 序列"，FIFO、3 帧：缺页 9。把帧数拖到 4：**10 次**，读数栏亮起警告；
- 同样序列换 **LRU**：3 帧 10 次、4 帧 8 次 → 帧多缺页少，**LRU 没有 Belady 异常**（它属于"栈算法"，帧集单调包含）；
- 预设"局部性良好"（`1,1,2,2,1,3,1,2,7,7,1,2`）：同样 3 帧，缺页数远低于循环扫描序列。**局部性比帧数更值钱。**
### 实验 2（python）：三种策略一起跑一遍
```python title="FIFO / LRU / OPT：同一个序列，三种挑法"
refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
def fifo(refs, n):
    frames = []
    order = []                   # 按进入先后排队的队列
    faults = 0
    for p in refs:
        if p in frames:
            continue             # 命中，什么都不做
        faults = faults + 1
        if len(frames) < n:
            frames.append(p)
            order.append(p)
        else:
            old = order.pop(0)   # pop(0)：弹出队首，即最早进入的那一页
            frames[frames.index(old)] = p
            order.append(p)
    return faults
def lru(refs, n):
    frames = []
    last = {}                    # 页 → 最后一次被访问的时刻
    faults = 0
    for i, p in enumerate(refs):   # enumerate：同时给出下标 i 与元素 p
        if p in frames:
            last[p] = i          # 命中也必须刷新时间戳
            continue
        faults = faults + 1
        if len(frames) < n:
            frames.append(p)
        else:
            v = min(frames, key=lambda q: last[q])   # 淘汰 last 最小的，即最久未用
            frames[frames.index(v)] = p
        last[p] = i
    return faults
def opt(refs, n):
    frames = []
    faults = 0
    for i, p in enumerate(refs):
        if p in frames:
            continue
        faults = faults + 1
        if len(frames) < n:
            frames.append(p)
        else:
            # 淘汰「下一次被用到最晚」的页；以后都不再用的，记成 len(refs)（无穷大）
            v = max(frames, key=lambda q: refs.index(q, i + 1) if q in refs[i + 1:] else len(refs))
            frames[frames.index(v)] = p
    return faults
print("帧数  FIFO  LRU  OPT")
for n in [3, 4]:
    print(f"{n:>3}  {fifo(refs, n):>5} {lru(refs, n):>5} {opt(refs, n):>5}")
```
输出 `3 → 9 / 10 / 7` 与 `4 → 10 / 8 / 6`。第二行第一列那个 **10 > 9** 就是 Belady 异常的现场：**FIFO 不具有"栈性质"**——4 帧里的页集合不一定包含 3 帧时的页集合，所以"多给一帧"可能把刚要用的页挤出去。
### 快问快答
```quiz
为什么 FIFO 会出 Belady 异常，而 LRU 不会？
- 因为 LRU 的实现更复杂，考虑了更多情况
- 因为 LRU 属于栈算法：帧数增加时，任一时刻留在内存里的页集合必然包含帧数更少时的页集合 [*]
- 因为 FIFO 在帧数变多时会重复淘汰同一页
? 「栈性质」指的是：对任意时刻 t 和帧数 k，内存中的页集合 S(k,t) 满足 S(k,t) ⊆ S(k+1,t)。FIFO 按进入顺序淘汰，与「最近是否用过」无关，帧数一变，淘汰顺序跟着整体错位，这个包含关系就断了。
```
:::warning[常见误区]
**误区一**："物理内存越大，缺页一定越少。" 你以为帧数与缺页率单调负相关——**Belady 异常用 12 个数字就推翻了它**（3 帧 9 次、4 帧 10 次）。真正单调的策略需要"栈性质"（LRU、OPT 都有）。工程上这提醒你：**调大内存后性能反而下降，不一定是玄学，先去查置换策略。**
**误区二**："LRU 是最优置换算法。" 你以为它最好——最优的是 **OPT（淘汰未来最晚用到的）**，但它要求预知未来，只能用于离线分析。LRU 只是"用过去预测未来"的近似，其有效性完全建立在**时间局部性**这条经验规律上。对"循环扫描一个大数组"这种局部性极差的模式，LRU 会退化到和 FIFO 一样糟（去实验室里切到"循环扫描"预设看看）。
**误区三**："缺页只在第一次访问某页时发生。" 你以为缺页就是"还没调进来"——实际上缺页异常有三大类：**① 真缺页**（页不在内存，要读盘）；**② 写时复制**（fork 后的页是只读共享的，第一次写要触发一次复制）；**③ 保护违例**（越权访问，直接 SIGSEGV）。同样是 `__handle_mm_fault`，走的路径完全不同，耗时也差几个数量级。
:::
## 6. 练习
**练习 1**：这台 LRU 模拟器报出的缺页数是 12（等于访问次数），可正确答案是 10。修到输出 `10`：
```exercise
# @title: 练习：命中时忘了刷新时间戳
# @check: 10
# @hint: last[p] 记录 p 最后一次被访问的时刻，命中时也要刷新——否则命中的页会被当成「最久没用」而被淘汰。把 last[p] = i 挪到 continue 之前
refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
n = 3
frames = []
last = {}
faults = 0
for i, p in enumerate(refs):
    if p in frames:
        continue             # ← 问题在这：命中就跳走了，没刷新 last[p]
    faults = faults + 1
    if len(frames) < n:
        frames.append(p)
    else:
        victim = min(frames, key=lambda q: last[q])   # 淘汰最久未用的
        frames[frames.index(victim)] = p
    last[p] = i
print(faults)
```
**练习 2**：内存访问 100 ns，磁盘 10 ms。若某程序每 1000 次访问发生 1 次缺页（其余全部命中 TLB，忽略页表遍历），它的平均访问时间是多少纳秒？比"永不缺页"慢了多少倍？
<details>
<summary>点开查看逐步解答</summary>
1. 命中的 999 次：每次约 101 ns，共 $999 \times 101 = 100\,899$ ns；
2. 缺页的那 1 次：约 $10\ \text{ms} = 10^7$ ns（处理开销相对可忽略）；
3. 平均：$\dfrac{100899 + 10^7}{1000} \approx 10\,101$ ns；
4. 与"永不缺页"的 101 ns 相比，慢了约 **100 倍**；
5. 反过来看：**缺页率只要到 0.1%，性能就掉两个数量级。** 这就是为什么"把热数据控制在内存里"是数据库与缓存系统的第一性原则——第 100 课的 B 树把树高压到 3 层，本质上就是在压这个缺页率。
</details>
## 7. 选读：工作集、颠簸与局部性
<details>
<summary>选读 · 为什么「多开一个程序」会让整台机器卡死</summary>
**工作集（working set）**：进程在最近 $\Delta$ 次访问中实际用到的页集合 $W(t, \Delta)$。它度量的是"这个进程此刻真正需要多少内存才能不缺页"。
**颠簸（thrashing）**：当所有进程的工作集之和超过物理内存时，每个进程都在不停缺页；刚调进来的页马上又因为别人缺页被淘汰，CPU 全花在 I/O 等待上，吞吐骤降到零。
$\sum_i |W_i(t, \Delta)| > \text{物理帧总数} \implies \text{颠簸}$
解法不是"多买内存"（治标），而是**控制并发度**：内核检测到缺页率过高时，把部分进程**换出（swap out）**挂起，等内存宽裕再换回来。这就是"多道程序度（degree of multiprogramming）"需要被动态调节的原因——它由 L=S 准则（缺页间隔 ≈ 换页耗时）给出最优工作点。
**局部性**是这一切的地基：时间局部性（刚用过的马上还会用）与空间局部性（用了这一页就会用邻近页）。它没有严格的数学证明，是六十年来对真实程序行为的经验总结——而 B 树、缓存行、预取器，全都是在押注这条经验。
</details>
## 8. 下一站
内存是易失的，断电就没了。那么"下次开机还能找到这个文件"，靠的是什么结构？
→ [文件系统与持久化](60-filesystem-lab.md)
