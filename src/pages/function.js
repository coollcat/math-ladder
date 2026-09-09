import React from 'react';
import Layout from '@theme/Layout';
import FunctionLab from '@site/src/components/FunctionLab';

/* =========================================================================
 * /function 「看见函数」
 * -------------------------------------------------------------------------
 * 不是课程页，是一台随身的看函数机器：左边拼式子，右边立刻看见它的形状，
 * 顺手把零点、极值、单调、积分、交点一并读出来。
 * 页面本身只负责导语与语法说明，交互全部在 FunctionLab / workspace 里。
 * ========================================================================= */

export default function FunctionPage() {
  return (
    <Layout
      title="看见函数"
      description="拼一个式子，立刻看见它的形状：零点、极值、单调区间、导数、积分与交点，一次全给出来">
      <main className="container margin-vert--md ml-fnpage">
        <h1>看见函数</h1>
        <p className="ml-fnpage__lead">
          写下一个式子，它的形状立刻出现在右边——这就是这一页唯一要做的事。
          左边可以直接敲，也可以像微软数学那样用符号键盘一格一格拼：点一下分数就多一个分式，
          方格里的空位填什么由你决定。式子里的 <code>a</code>、<code>b</code>、<code>θ</code>
          这些不是自变量的字母会自动变成滑块，拖一拖，看图形被参数捏成各种样子。
        </p>
        <p className="ml-fnpage__lead">
          切到<strong>「立体 z = f(x, y)」</strong>，同一个输入框就变成了二元函数：
          曲面会立起来，拖动可以绕着它转，滚轮拉近拉远，还可以切到正俯视去看等高线那样的形状。
          曲面的颜色按高度走（低处深紫、高处亮黄），明暗跟着法线走，所以转动时起伏会从光影里「浮」出来。
        </p>

        <FunctionLab />

        <section className="ml-fnpage__help">
          <h2>怎么写</h2>

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
            <li>立体模式只画一条曲面：两个曲面互相穿插时谁在前谁在后算不准，叠着反而是添乱</li>
          </ul>

          <h3>键盘上的小机关</h3>
          <ul>
            <li>先选中一段再点符号，选中的东西会落进新符号的第一个空位——想让 <code>x+1</code> 整个当分子，选中它再点分数</li>
            <li><code>Tab</code> 在空位之间跳（Shift+Tab 往回跳），<code>Enter</code> 再加一条曲线</li>
            <li>退格不是傻删一个字符：<code>{'\\sin'}</code> 会整个删掉，空着的占位框也整个删掉</li>
          </ul>

          <h3>边界</h3>
          <ul>
            <li>平面模式只画一元函数：求和、积分号、极限、矩阵这类符号不支持（会给出提示，不会画错图）</li>
            <li>零点、极值、积分都是数值求出来的：零点二分到 double 精度，极值用抛物线插值细化，积分用复合辛普森；碰到真极点会明说算不出，不给看着像答案的错值</li>
            <li>立体模式不画多个曲面的互相遮挡，也不做等值线填充；要对比就把两式相减（<code>f-g</code>）看高度差</li>
            <li>曲面是 40×40 的规则网格：极陡的峭壁（比如 <code>1/(x^2+y^2)</code> 在原点）会留个洞，那是刻意的——补成平板比留洞更骗人</li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
