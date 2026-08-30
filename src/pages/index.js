import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { drawSinesFrame } from '../pyrunner/viz';
import { openInConsole } from '../pyrunner/enhancer';
import { CHAPTERS, allChapterGroups, siteStats } from '@site/src/components/ml-home/data';
import HomeTree from '@site/src/components/ml-home/HomeTree';
import '../css/home.css';

function HeroWave() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = null;
    let t = 0;
    let W = 800;
    const H = 170;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = Math.max(320, canvas.parentElement.clientWidth || 800);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const terms = [1, 3, 5, 7, 9];
    const frame = () => {
      if (!document.body.contains(canvas)) { raf = null; return; }
      drawSinesFrame(ctx, W, H, t, terms);
      t += 0.03;
      raf = requestAnimationFrame(frame);
    };
    if (reduced) drawSinesFrame(ctx, W, H, 0, terms);
    else raf = requestAnimationFrame(frame);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className="ml-hero__canvas"
      aria-label="动画：多个正弦波叠加逼近方波"
      role="img"
    />
  );
}

/* ---- 首页试玩：把一段示例代码装进浮窗控制台 ---- */

const TRY_SOURCE = [
  '# 随手改、随手跑——这就是全书的上课方式',
  'phi = (1 + 5 ** 0.5) / 2   # 黄金比',
  'print(phi)',
  '',
  '# 它满足 x^2 = x + 1？验一下：',
  'print(phi ** 2 - phi - 1)',
].join('\n');

function TryButton() {
  return (
    <button
      type="button"
      className="button button--primary button--sm ml-demo__run"
      onClick={() =>
        openInConsole({ key: 'py-home-try', title: '首页试玩', source: TRY_SOURCE })
      }
    >
      ▶ 在浮窗里跑一下
    </button>
  );
}

/* ---- 迷你选择题：现场演示 quiz 组件 ---- */

function MiniQuiz() {
  const [picked, setPicked] = React.useState(null);
  const opts = ['True', 'False'];
  return (
    <fieldset className="ml-demo__quiz">
      <legend className="ml-quiz__q">Python 里 0.1 + 0.2 == 0.3 的结果是？</legend>
      <div className="ml-quiz__opts">
        {opts.map((t) => (
          <label key={t} className="ml-quiz__opt">
            <input
              type="radio"
              name="home-quiz"
              checked={picked === t}
              onChange={() => setPicked(t)}
            />
            <span>{t}</span>
          </label>
        ))}
      </div>
      {picked && (
        <div
          role="status"
          className={'ml-quiz__fb ' + (picked === 'False' ? 'ml-quiz__fb--ok' : 'ml-quiz__fb--no')}
        >
          {picked === 'False'
            ? '答对了！浮点有尾差：实际是 0.30000000000000004。第 2 章小数课专门拆招。'
            : '不对哦——打印 0.1 + 0.2 看看尾巴。第 2 章小数课专门拆招。'}
        </div>
      )}
    </fieldset>
  );
}

/* ---- 章节芯片墙：按卷分组的全站章节速览 ---- */

function ChapterWall() {
  const groups = React.useMemo(allChapterGroups, []);
  return (
    <div className="ml-wall">
      {groups.map((g) => (
        <div key={g.n} className={'ml-wall__group' + (g.status === 'done' ? '' : ' ml-wall__group--plan')}>
          <div className="ml-wall__head">
            <h3 className="ml-wall__vol">{g.n} · {g.title}</h3>
            <span className={'badge ' + (g.status === 'done' ? 'badge--primary' : 'badge--secondary')}>
              {g.rangeLabel}{g.status !== 'done' && ' 已开课'}
            </span>
          </div>
          <p className="ml-wall__desc">{g.desc}</p>
          <div className="ml-wall__chips">
            {g.chapters.map((c) => (
              <Link key={c.n} to={c.to} className="ml-wall__chip" title={`${c.title} · ${c.count} 门课`}>
                <span className="ml-wall__chip-num">{String(c.n).padStart(2, '0')}</span>
                {c.short}
                <span className="ml-wall__chip-count">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const randomChapter = () => {
    const ch = CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)];
    window.location.href = ch.to;
  };
  const s = siteStats();
  return (
    <Layout
      title="数学阶梯 · 从数感到前沿"
      description={`从 1+1 出发的交互式数学路径：五卷 ${s.chapters} 章 ${s.lessons} 门课持续生长，每一步都踩在已学的知识上`}
    >
      <div className="ml-home">
        <header className="ml-hero ml-gridbg">
          <span className="ml-hero__spine" aria-hidden="true">从一加一到人工智能</span>
          <div className="container ml-hero__grid">
            <p className="ml-hero__kicker">交互式数学教程 · 每一步都可运行</p>
            <h1 className="ml-hero__title">
              数学阶梯
              <span className="ml-seal" aria-hidden="true">阶</span>
            </h1>
            <p className="ml-hero__subtitle">从 1+1 出发，每一级台阶都亲手踩上去——一路长到现代数学与 AI 的地基。</p>
            <p className="ml-hero__note">
              内容按五卷组织：卷一《数学地基》已完成；卷二高等核心、卷三离散计算、卷四概率信息、卷五应用 AI
              已开放大部分正式课。每个概念配一个能动手的交互，新工具先讲它的来历，代码块都能当场修改运行。
            </p>
            <div className="ml-hero__btns">
              <Link className="button button--primary button--lg" to="/docs/python-tools/conventions">
                从第 0 课开始
              </Link>
              <Link className="button button--secondary button--lg button--outline" to="/tree">
                看知识树生长
              </Link>
              <button type="button" className="button button--secondary button--lg button--outline" onClick={randomChapter}>
                随机翻一章
              </button>
            </div>
          </div>
          <div className="container">
            <figure className="ml-hero__scope">
              <HeroWave />
              <figcaption>示波器纸带 · 方波 = 一串正弦波的叠加，卷一路上的风景；这架阶梯的顶端在更远处——现代 AI 的数学。</figcaption>
            </figure>
          </div>
        </header>

        <main>
          <section className="container margin-vert--lg">
            <div className="ml-tree-head">
              <div>
                <h2>一棵会生长的知识树</h2>
                <p className="ml-section__lead">
                  根是「算术四则」，每往下一层，先修链就长一代——从加法一路长到强化学习与工程控制。
                  点击任意章节：只保留它的先修（绿）与托起（橙），无关章节隐去、相关层自动居中；
                  双击进入本章。想逐课细看，去知识树和知识图谱。
                </p>
              </div>
              <div className="ml-tree-head__links">
                <Link className="button button--primary button--sm" to="/tree">
                  打开知识树 →
                </Link>
                <Link className="button button--secondary button--sm button--outline" to="/graph">
                  逐课依赖图谱 →
                </Link>
              </div>
            </div>
            <HomeTree />
          </section>

          <section className="container margin-vert--lg">
            <h2>这个站怎么读</h2>
            <p className="ml-section__lead">三种互动方式贯穿全书——现在就能各试一口。</p>
            <div className="row">
              <div className="col col--4 margin-bottom--md">
                <div className="card ml-demo ml-gridbg">
                  <div className="card__body">
                    <h3 className="ml-demo__title">网页组件 · 打开就能玩</h3>
                    <p>
                      数轴、分数盘、单位圆、矩阵变形机……正文里的实验全部即时响应，
                      不装任何东西，拖动滑杆或圆点即可。
                    </p>
                    <Link className="button button--secondary button--sm button--outline" to="/docs/arithmetic/addition">
                      去玩一个 →
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--4 margin-bottom--md">
                <div className="card ml-demo ml-gridbg">
                  <div className="card__body">
                    <h3 className="ml-demo__title">浮窗 Python · 免安装真跑</h3>
                    <p>
                      每个代码块都有「▶ 浮窗运行」按钮：代码装进浮窗随便改，
                      变量跨运行保留，matplotlib 出图直接显示。
                    </p>
                    <TryButton />
                  </div>
                </div>
              </div>
              <div className="col col--4 margin-bottom--md">
                <div className="card ml-demo ml-gridbg">
                  <div className="card__body">
                    <h3 className="ml-demo__title">判题与测验 · 即时反馈</h3>
                    <MiniQuiz />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="container margin-vert--lg">
            <h2>五卷路线图</h2>
            <p className="ml-section__lead">从地基到前沿的完整阶梯；已开课的章节都能直接进。</p>
            <ChapterWall />
          </section>

          <section className="container margin-vert--lg">
            <div className="ml-cta-band ml-gridbg">
              <span className="ml-cta-band__glyph" aria-hidden="true">∫</span>
              <div>
                <h2>不知道从哪开始？</h2>
                <p>跟着知识树的箭头走就不会漏：每一课的先修都排在它前面，学到哪都能随时回溯来路。</p>
              </div>
              <div className="ml-cta-band__btns">
                <Link className="button button--primary button--lg" to="/docs/python-tools/conventions">
                  从第 0 课开始 →
                </Link>
                <Link className="button button--secondary button--lg button--outline" to="/graph">
                  查依赖图谱
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
}
