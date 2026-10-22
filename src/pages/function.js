import React from 'react';
import Layout from '@theme/Layout';
import FunctionLab from '@site/src/components/FunctionLab';

/* 八种形态各一句话：右上那块跟着「此刻是哪种形态」换，不再是写死的一段说明。
   文案分寸：说清这个形态在画什么、哪个字母在变，不重复下面「怎么写」那一节。 */
const ARG_CN = { x: 'x', y: 'y', t: 't', u: 'u', v: 'v', theta: 'θ', phi: 'φ' };
const FORM_INTRO = {
  fx: {
    h: '函数 y = f(x)',
    p: '横轴 x 从头扫到尾，每个 x 给一个 y。零点、极值、单调、∫ 面积只在这种形态下有意义。',
  },
  polar: {
    h: '极坐标 r(θ)',
    p: '不是「先 x 后 y」，而是「朝 θ 方向走 r 那么远」。r 随角度变，就画出花瓣、蜗线与心形。',
  },
  param2: {
    h: '参数曲线',
    p: 'x、y 各自跟着 t 走：t 从起点扫到终点，能画出打圈、自交的曲线；穿过无穷的地方会自己断开。',
  },
  implicit: {
    h: '隐函数 F(x, y) = 0',
    p: '不写成 y = …，而要「同时满足这个等式的所有点」。圆、椭圆、双纽线都归这里，只在看得见的那一块描。',
  },
  fxy: {
    h: '曲面 z = f(x, y)',
    p: 'xy 平面上每一点给一个高度，合起来是一张曲面；光影按坡度算，起伏被放大过，否则看上去就是块平板。',
  },
  psurf: {
    h: '参数曲面',
    p: '两把尺子 u、v 把整张面铺出来——球面、环面、莫比乌斯带都能这么写。',
  },
  curve3: {
    h: '空间曲线',
    p: '三个分量都跟着 t 变，一条线悬在空间里：螺线、纽结、空间中的轨迹。',
  },
  sph: {
    h: '球坐标 r(θ, φ)',
    p: 'θ 是绕 z 轴一圈的方位角，φ 是从 z 轴量下来的极角；r 随它们变，就是一朵会呼吸的球面。',
  },
  py: {
    h: '浮窗里的 Python 函数',
    p: '这条不是式子，是 Py 浮窗里的一个函数：图上每个点都回浮窗里算一次，带数值默认值的参数会变成这里的滑块。',
  },
};

function NowBox({ info }) {
  const f = info && info.kind ? FORM_INTRO[info.kind] : null;
  const err = info && info.error;
  return (
    <div className={'ml-fnpage__now' + (err ? ' is-err' : '')} aria-live="polite">
      <div className="ml-fnpage__now-k">此刻这张图</div>
      <div className="ml-fnpage__now-h">
        {err ? '这条式子画不出来' : (f ? f.h : '还没有式子')}
      </div>
      <p className="ml-fnpage__now-p">
        {err || (f ? f.p
          : '在左边写一个式子，或点下面的「试试这些」。这块随时说清它属于哪一种形态、哪个字母是自变量、哪些会变成滑块。')}
      </p>
      {f && !err ? (
        <ul className="ml-fnpage__now-meta">
          {info.args.length ? <li>自变量 {info.args.map((a) => ARG_CN[a] || a).join('、')}</li> : null}
          {info.params.length ? <li>可调参数 {info.params.join('、')}</li> : null}
          <li>{info.mode === '3d' ? '立体' : '平面'} · {info.count} 条</li>
        </ul>
      ) : null}
      {f && !err ? (
        <p className="ml-fnpage__now-tip">
          {info.mode === '3d'
            ? '拖动绕着转 · 滚轮缩放 · 双击回默认视角；「→ Python」把这条式子译成 numpy / sympy 送进浮窗。'
            : '「→ Python」把这条式子译成 numpy / sympy 送进浮窗，浮窗里写 see(...) 又能画回来。'}
        </p>
      ) : null}
    </div>
  );
}

/* 导语：桌面整段（两段并排成 1.9fr/1fr，与工作区同宽），
   手机上**收成一行摘要**——首屏要留给输入框与图形区，
   原先两段说明（约 400 字）把工作区推到 y≈740 去。
   折叠实现只写在 ≤996px 的媒体查询里，桌面端不会少一段话。
   右格不放固定文案：交给 NowBox，随「此刻是哪种形态」变。 */
function Lead({ intro }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={'ml-fnpage__intro' + (open ? ' is-open' : '')}>
      <div className="ml-page-intro">
        <p className="ml-fnpage__lead">
          写下一个式子，它的形状立刻出现在右边——这就是这一页唯一要做的事。
          左边可以直接敲，也可以像微软数学那样用符号键盘一格一格拼：点一下分数就多一个分式，
          方格里的空位填什么由你决定。式子里的 <code>a</code>、<code>b</code>、<code>θ</code>
          这些不是自变量的字母会自动变成滑块，拖一拖，看图形被参数捏成各种样子。
        </p>
        <NowBox info={intro} />
      </div>
      <button
        type="button"
        className="ml-fnpage__leadbtn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '收起说明' : '这一页怎么玩 · 展开说明'}
      </button>
    </div>
  );
}

/* =========================================================================
 * /function 「看见函数」
 * -------------------------------------------------------------------------
 * 不是课程页，是一台随身的看函数机器：左边拼式子，右边立刻看见它的形状，
 * 顺手把零点、极值、单调、积分、交点一并读出来。
 * 页面本身只负责导语与语法说明，交互全部在 FunctionLab / workspace 里。
 * ========================================================================= */

export default function FunctionPage() {
  /* 右上那块介绍跟着工作区走：workspace.js 通过 onIntro 把「此刻的形态」送上来 */
  const [intro, setIntro] = React.useState(null);
  return (
    <Layout
      title="看见函数"
      description="拼一个式子，立刻看见它的形状：零点、极值、单调区间、导数、积分与交点，一次全给出来">
      <main className="container margin-vert--md ml-fnpage">
        <h1>看见函数</h1>
        <Lead intro={intro} />

        <FunctionLab fromUrl onIntro={setIntro} />

        <section className="ml-fnpage__help">
          <h2>怎么写</h2>

          <h3>一个输入框，八种形态</h3>
          <ul>
            <li>平面 · 函数：<code>sin(x)/x</code>、<code>y = x^2</code>、<code>f(x) = 2^x</code></li>
            <li>平面 · 极坐标：<code>r = cos(3θ)</code>（θ 也可写 <code>theta</code>），卡片下方的范围框改 θ 的起止，默认 [0, 2π]</li>
            <li>平面 · 参数曲线：<code>(cos(t), sin(t))</code>、<code>(t - sin(t), 1 - cos(t))</code>，t 的范围同样可改</li>
            <li>平面 · 隐函数：带等号且不是 y = … 的都是，如 <code>x^2 + y^2 = 4</code>、<code>(x^2+y^2-1)^3 = x^2 y^3</code></li>
            <li>立体 · 曲面：<code>x*y</code>、<code>z = sin(x)cos(y)</code></li>
            <li>立体 · 参数曲面：三个分量里用到 u 或 v，如 <code>(cos(u)sin(v), sin(u)sin(v), cos(v))</code></li>
            <li>立体 · 空间曲线：三个分量只用 t，如 <code>(cos(t), sin(t), t/6)</code></li>
            <li>立体 · 球坐标：<code>r = 1 + 0.2 sin(5θ)</code>（θ 方位角、φ 与 z 轴夹角），默认 θ∈[0,2π]、φ∈[0,π]</li>
            <li>不会写就点卡片下面的形态按钮（「极坐标 r(θ)」「参数曲面」……），会新开一张带例子的卡片</li>
          </ul>

          <h3>和 Python 互通</h3>
          <ul>
            <li><strong>→ Python 作图</strong>：译成 numpy + matplotlib 代码送进 Py 浮窗并运行，式子里的参数变成浮窗的滑块，视野、视角都对齐</li>
            <li><strong>→ sympy 推导</strong>：译成 sympy 代码——函数给导数、积分、极限、驻点；参数曲线给切线斜率与弧长；曲面给梯度与黑塞矩阵；空间曲线给速度与曲率</li>
            <li>浮窗里 <code>see("x^2 - 1")</code>、<code>see(sp.diff(f, x))</code>、<code>see(lambda x, a=1: a*np.sin(x))</code> 把东西画回本页；Python 函数带默认值的数值参数会变成这里的滑块</li>
            <li><code>seen()</code> 取回本页此刻的函数：可直接 <code>f(np.linspace(0, 1, 5))</code> 求值，<code>f.sym</code> 拿 sympy 形式</li>
            <li>不在本页时，浮窗里的 <code>see()</code> 会把工作区内嵌进那次运行的输出；「复制链接」能把这一屏原样分享出去</li>
          </ul>

          <h3>两种写法都认</h3>
          <ul>
            <li>普通算式：<code>sin(x)/x</code>、<code>x^2-4</code>、<code>e^-x^2</code>、<code>2x/(x-1)</code></li>
            {/* LaTeX 里有花括号和反斜杠，JSX 会当表达式/转义，一律走字符串 */}
            <li>LaTeX：<code>{'\\frac{\\sin x}{x}'}</code>、<code>{'x^{2}-4'}</code>、<code>{'\\sqrt{x+1}'}</code></li>
            <li>乘号可省：<code>2x</code>、<code>3(x+1)</code>、<code>x sin(x)</code> 都是乘法</li>
          </ul>

          <h3>对数按中国教材的口径</h3>
          <ul>
            <li><code>ln(x)</code> 自然对数 · <code>lg(x)</code> 与 <code>log(x)</code> 常用对数（底 10）</li>
            <li><code>log(2, x)</code> 或 <code>{'\\log_2 x'}</code> 指定底数 · <code>log2(x)</code> 底 2</li>
          </ul>

          <h3>常量、参数与函数</h3>
          <ul>
            <li>常量：<code>pi</code>（也可写 <code>π</code>）、<code>e</code>、<code>tau</code>、<code>inf</code></li>
            <li>参数：除 x 外任何字母都行，包括 <code>theta</code>、<code>alpha</code> 这类希腊字母名，会自动变成滑块</li>
            <li>
              函数：<code>sin cos tan cot sec csc</code>、<code>asin acos atan</code>（也可写
              <code>arcsin</code> 等）、<code>sinh cosh tanh</code>、<code>sqrt abs exp ln lg log log2 log10</code>、
              <code>floor ceil round sign</code>、<code>max min mod gcd pow root hypot atan2</code>
            </li>
            <li>阶乘：<code>5!</code>、<code>n!</code>（走伽马函数，<code>0.5!</code> 也能算）</li>
          </ul>

          <h3>画布上能做什么</h3>
          <ul>
            <li>滚轮缩放（按在以光标为锚的地方）、拖动平移、双击重置</li>
            <li>Shift+滚轮只横向缩放，Ctrl/⌘+滚轮只纵向缩放</li>
            <li>打开「∫ 面积」后，在画布上横向拖一段，就能量出这一段的定积分并填色</li>
            <li>公式里的 <code>f′</code> 按钮会同时画出导函数（虚线）</li>
          </ul>

          <h3>立体模式</h3>
          <ul>
            <li>式子写成 <code>z = f(x, y)</code> 的样子：<code>x*y</code>（马鞍面）、<code>x^2+y^2</code>（抛物面）、<code>sin(x)*cos(y)</code>（波浪）、<code>exp(-x^2-y^2)</code>（钟形）</li>
            <li><strong>拖动旋转</strong>、滚轮缩放、双击回到默认视角；「俯视」看等高线形状，「平视」侧看起伏</li>
            <li>光标放在画布上，会从底面竖起一根探针，读数行给出这一点的 f(x, y)——想量哪一点就指哪一点（压到正平视时指不准，属正常）</li>
            <li>「域」滑块调 xy 平面上取多大的方块——涟漪要调到 10 才铺得开几个波；「高度」滑块把 z 方向拉高或压扁，起伏太扁看不见就拉高</li>
            <li>颜色按高度走，明暗按法线走；「网格线」能勾出曲面的经纬，「参照框」画出底面与包围盒</li>
            <li>最多叠三个对象：比如一张曲面加一条贴在它上面的路径（预设「曲面上的路径」）。只有参数曲面 / 曲线时按真实比例画，球就是球</li>
            <li>光标放在参数曲面或曲线上，读数行同时报坐标和对应的参数值（u, v 或 t）</li>
          </ul>

          <h3>键盘上的小机关</h3>
          <ul>
            <li>先选中一段再点符号，选中的东西会落进新符号的第一个空位——想让 <code>x+1</code> 整个当分子，选中它再点分数</li>
            <li><code>Tab</code> 在空位之间跳（Shift+Tab 往回跳），<code>Enter</code> 再加一条曲线</li>
            <li>退格不是傻删一个字符：<code>{'\\sin'}</code> 会整个删掉，空着的占位框也整个删掉</li>
          </ul>

          <h3>边界</h3>
          <ul>
            <li>求和、积分号、极限、矩阵这类符号不支持（会给出提示，不会画错图）；隐式曲面 F(x, y, z) = 0 暂不支持</li>
            <li>隐函数只在看得见的那块描（平移缩放后重描）；零点、极值、交点、∫ 面积只对 y = f(x) 有意义，其余形态改报弧长、围成面积、包围盒</li>
            <li>零点、极值、积分都是数值求出来的：零点二分到 double 精度，极值用抛物线插值细化，积分用复合辛普森；碰到真极点会明说算不出，不给看着像答案的错值</li>
            <li>立体里多个对象按面片深度排序（没有逐像素深度测试）：两张面真正穿插的交线附近，前后遮挡可能错一两格</li>
            <li>曲面是 40×40 的规则网格：极陡的峭壁（比如 <code>1/(x^2+y^2)</code> 在原点）会留个洞，那是刻意的——补成平板比留洞更骗人</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
