import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import { getAuth, setAuth, clearAuth, safeRedirect, hashPassword } from '../auth';
import ACCOUNTS from '../data/accounts.json';

import '../css/auth.css';

function findAccount(user) {
  return ACCOUNTS.find((a) => a.user === user);
}

function LoginForm({ onOk }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const userRef = React.useRef(null);

  useEffect(() => {
    /* SSR 下用 autoFocus 会有 React 警告，改为挂载后手动聚焦 */
    userRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    const acct = findAccount(user.trim());
    if (!acct) {
      setErr('没有这个账号，或者账号还没开通。');
      return;
    }
    setBusy(true);
    /* hashPassword 是同步的（自实现 SHA-256），setBusy 只为禁用按钮一帧 */
    setTimeout(() => {
      const got = hashPassword(acct.salt, pass);
      if (got !== acct.hash) {
        setErr('密码不对，再想想。');
        setBusy(false);
        return;
      }
      onOk({ u: acct.user, name: acct.name || acct.user, at: Date.now() });
    }, 0);
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
      <button className="button button--primary button--lg ml-auth__submit" disabled={busy}>
        {busy ? '正在核对…' : '登录'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const history = useHistory();
  const [auth, setAuthState] = useState(null);
  const [redirect, setRedirect] = useState('/');

  useEffect(() => {
    setAuthState(getAuth());
    const params = new URLSearchParams(window.location.search);
    setRedirect(safeRedirect(params.get('redirect')));
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
                你好，<strong>{auth.name}</strong>（{auth.u}）
              </p>
              <p className="ml-auth__hint">
                已登录。学习进度现在记在你的账号空间里（本浏览器内保存），与游客空间互不混淆。
                {redirect !== '/' && (
                  <>
                    {' '}
                    <Link to={redirect}>回到刚才的页面</Link>
                  </>
                )}
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
                  账号由站方开通，不对外公开注册，凭据请联系本站维护者索取。
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
