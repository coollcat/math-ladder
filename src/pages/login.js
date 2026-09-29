import React, { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import {
  getAuth,
  setAuth,
  clearAuth,
  safeRedirect,
  loginRemote,
  failCooldown,
  noteFailure,
  clearFailures,
} from '../auth';
import { syncHint, onSyncChange, syncNow } from '../sync';

import '../css/auth.css';

/* =========================================================================
 * 数据面板（备份 / 还原 / 空间搬家）的登录页入口
 * -------------------------------------------------------------------------
 * 2026-09-29 二次搬迁：面板本体已经搬到**页面右上角**（顶栏那颗「数据」钮，
 *   见 src/theme/Navbar/DataMenu.js）——登录后任何页面随手可得，面板就落在
 *   钮的下方。这一块不再自己挂一份面板，只留一句说明 + 一颗按钮把人送过去。
 *
 * 为什么不再内嵌一份：同一套 UI 两个落点，改一处忘一处是迟早的事；而且
 *   「登录后进度看着像没了」这个时刻，右上角那颗钮离眼睛更近。
 * ========================================================================= */
function DataEntry({ authed }) {
  return (
    <section className="ml-auth__data" id="ml-data-panel">
      <div className="ml-auth__data-head">
        <h2 className="ml-auth__data-title">数据 · 备份与搬家</h2>
        <p className="ml-auth__data-lead">
          学习进度、笔记本、代码仓库都存在这台浏览器的「空间」里。换设备、清缓存之前，
          用<strong>导出成文件</strong>把它们带走；{authed ? '登录前后数据不互通时，用' : '登录之后，用'}
          <strong>搬家</strong>把游客空间的数据挪进账号。
        </p>
        <button
          type="button"
          className="ml-auth__data-open"
          onClick={() => window.dispatchEvent(new Event('ml-open-data'))}
        >
          打开数据面板（页面右上角）
        </button>
      </div>
    </section>
  );
}

/* 失败提示只有这一句。绝不区分「没这个账号」和「密码不对」——
   分两句等于把账号名单摆出来让人一个个试。
   服务端对这两种情况返回的也是同一个错，前端只是照着念。 */
const BAD_CREDENTIALS = '用户名或密码不对，请重试。';

/* 连不上服务器不是「登录失败」，也不是「可以放行」：没有服务器可问，
   就没有人能核对账号——这条路上**不登录**，站点退回本地（游客）模式，
   课程、浮窗、判题、进度记录照常开放，只是数据留在这台浏览器。
   刻意不做本地校验兜底：账号库一旦回到前端，bundle 里就又有账号哈希了。 */
const OFFLINE_NOTICE = '连不上服务器，已切换到本地模式（数据只存这台浏览器）';

function SyncLine() {
  /* 初始值必须是 null：SSR 与客户端首帧都渲染「没有这一行」，挂载后才填内容，
     否则会水合失配（服务端没有 localStorage 可读，两边必然不一样）。
     文案与状态判定一律走 syncHint()——「数据」面板用的是同一个函数，
     两处各写一遍的结果必然是文案漂移。 */
  const [hint, setHint] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const read = () => setHint(syncHint());
    read(); /* 订阅前可能已经变过，补一次 */
    return onSyncChange(read);
  }, []);

  if (!hint) return null;
  return (
    <p className={'ml-auth__hint' + (hint.tone === 'muted' ? ' ml-auth__muted' : '')}>
      {hint.text}
      {hint.action && (
        <button type="button" className="button button--link button--sm" onClick={() => syncNow()}>
          {hint.action}
        </button>
      )}
    </p>
  );
}

function LoginForm({ onOk }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [cool, setCool] = useState(0);
  const userRef = React.useRef(null);
  const alive = React.useRef(true);

  useEffect(() => {
    /* SSR 下用 autoFocus 会有 React 警告，改为挂载后手动聚焦 */
    userRef.current?.focus();
    setCool(Math.ceil(failCooldown() / 1000));
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (cool <= 0) return undefined;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || cool > 0) return;
    const left = Math.ceil(failCooldown() / 1000);
    if (left > 0) {
      setCool(left);
      setErr('尝试太频繁，请稍后再试。');
      return;
    }
    setErr('');
    setInfo('');
    setBusy(true);
    /* 校验在服务端做，来回一趟网络本身就是延迟来源，不必再人为加延迟；
       限流由服务端按 IP 记（连错 5 次起冷却），本地这份只用来驱动按钮的冷却读秒。 */
    const r = await loginRemote(user, pass);
    if (!alive.current) return;
    setBusy(false);

    if (r.ok) {
      clearFailures();
      setPass('');
      onOk({ u: r.user, name: r.name, token: r.token, at: Date.now() });
      return;
    }
    if (r.reason === 'nobackend') {
      /* 没有服务器可问：不登录、不记失败次数（这不是密码错了，
         记了只会白白挡住用户），只把站点切到本地模式这件事说清楚。 */
      setErr('');
      setInfo(OFFLINE_NOTICE);
      setPass('');
      return;
    }
    /* 服务端限流（429）时把它的 retryAfter 喂给本地节流一起记：
       只驱动界面上的读秒是不够的，刷新页面就绕过去了；
       记进 localStorage 后 failCooldown() 在下次进入/提交时也会拦住。 */
    const wait = Math.ceil(noteFailure(r.reason === 'ratelimited' ? (r.retryAfter || 0) * 1000 : 0) / 1000);
    if (wait > 0) setCool(wait);
    setErr(wait > 0 ? `尝试太频繁，请 ${wait} 秒后再试。` : BAD_CREDENTIALS);
    setPass('');
  };

  return (
    <form className="ml-auth__form" onSubmit={submit}>
      <label className="ml-auth__field">
        <span>用户名</span>
        <input
          ref={userRef}
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          placeholder="用户名"
        />
      </label>
      <label className="ml-auth__field">
        <span>密码</span>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          placeholder="·"
        />
      </label>
      {err && <p className="ml-auth__error">{err}</p>}
      {info && <p className="ml-auth__hint ml-auth__muted">{info}</p>}
      <button
        className="button button--primary button--lg ml-auth__submit"
        disabled={busy || cool > 0}
      >
        {cool > 0 ? `请 ${cool} 秒后再试` : busy ? '正在登录…' : '登录'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const history = useHistory();
  const [auth, setAuthState] = useState(null);
  const [redirect, setRedirect] = useState('/');
  const dataAnchor = useRef(null);

  useEffect(() => {
    setAuthState(getAuth());
    const params = new URLSearchParams(window.location.search);
    setRedirect(safeRedirect(params.get('redirect')));
    /* ?panel=data：这块说明滚到眼前（面板本体在右上角，顶栏会自己打开它） */
    if (params.get('panel') === 'data' && dataAnchor.current) {
      dataAnchor.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleOk = (a) => {
    setAuth(a);
    setAuthState(a);
    history.replace(redirect);
  };

  const handleLogout = () => {
    clearAuth();
    setAuthState(null);
  };

  return (
    <Layout title="登录" description="数学阶梯 · 登录（账号由站方开通）">
      <main className="container margin-vert--lg">
        <div className="ml-auth">
          <h1 className="ml-auth__title">登录 · 数学阶梯</h1>
          {auth ? (
            <div className="ml-auth__card">
              <p className="ml-auth__hello">
                你好，<strong>{auth.name}</strong>
              </p>
              <p className="ml-auth__hint">
                已登录（进度空间 <code>{auth.u}</code>）。学习进度记在你的账号空间里，与游客空间互不混淆。
                {redirect !== '/' && (
                  <>
                    {' '}
                    <Link to={redirect}>回到刚才的页面</Link>
                  </>
                )}
              </p>
              <SyncLine />
              <p className="ml-auth__hint ml-auth__muted">
                登录只是换了一个抽屉：登录前在游客状态下攒的进度、笔记本和代码还在游客空间里，
                不会自动跟过来。下面「数据 · 备份与搬家」那一块就是干这个的——一键搬进当前账号，
                也能导出成文件带走。
              </p>
              <div className="ml-auth__actions">
                <Link className="button button--primary" to="/docs/intro">
                  开始学习
                </Link>
                <button className="button button--secondary" onClick={handleLogout}>
                  退出登录
                </button>
              </div>
            </div>
          ) : (
            <div className="ml-auth__card">
              <LoginForm onOk={handleOk} />
              <div className="ml-auth__note">
                <p>
                  不登录也能学习：文献页面随时可看，PDF 下载按钮会带你去<strong>原始出处</strong>
                  ，练习作答与进度记录同样开放，进度保存在本机游客空间。
                </p>
                <p>
                  登录后：带归档副本的论文可以直接<strong>从本站下载</strong>
                  ，进度存入你的账号空间，与游客空间分开管理（同一浏览器多账号互不混淆）。
                </p>
                <p className="ml-auth__muted">
                  登录后，学习进度、数学笔记本和代码仓库会跟着账号在你的设备之间自动同步。
                  本站没有部署同步服务（或它没起来）时登录不可用，一切按游客处理：课程、浮窗、
                  判题、进度记录照常开放，只是数据留在这台浏览器——换设备请用下面
                  「数据 · 备份与搬家」里的<strong>导出备份</strong>。
                </p>
                <p className="ml-auth__muted">
                  账号由站方开通，不对外公开注册，凭据请联系本站维护者索取。
                </p>
              </div>
            </div>
          )}

          {/* 数据面板说明：面板本体在页面右上角（顶栏「数据」钮），这里只负责
              把「东西在哪、怎么带走」说清楚，并给一颗直达按钮。 */}
          <div ref={dataAnchor}>
            <DataEntry authed={!!auth} />
          </div>
        </div>
      </main>
    </Layout>
  );
}
