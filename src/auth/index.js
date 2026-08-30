/* ============================================================
 * 数学阶梯 · 本地账号体系
 *
 * 设计定位：本站为静态站 + 私有部署场景。
 * - 不开放公开注册：账号由站方本地 agent 用 scripts/add-user.mjs 统一开通，
 *   账号库是 src/data/accounts.json（构建时打进 bundle，只存 salt + 哈希，不存明文）。
 * - 登录态存 localStorage `ml-auth`（浏览器本机，不上传）。
 * - 受登录门禁的能力：论文 PDF 下载、学习进度的记录与管理（ml-progress / ml-exercises）。
 *   未登录用户可正常浏览全部课程内容与文献页面链接。
 * - 注意：静态站没有服务端会话，这套门禁是「产品级权限入口」而非安全边界；
 *   真正的机密文件应放在未公开的存储位置，链接只发给已授权者。
 * ============================================================ */

export const AUTH_KEY = 'ml-auth';

/* ---------- 精简 SHA-256（同步实现，http 部署下 crypto.subtle 不可用时的兜底） ----------
 * node 端 scripts/add-user.mjs 用 node:crypto 生成同算法哈希，两侧已做一致性测试。 */
function utf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Hex(message) {
  const bytes = utf8Bytes(message);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((i >= 4 ? 0 : (bitLen / 2 ** (i * 8))) & 0xff);
  /* 长度字段（64 位大端）：bitLen 超过 32 位时用除法避免位运算截断 */
  const lenBytes = [];
  let n = bitLen;
  for (let i = 0; i < 8; i++) {
    lenBytes.unshift(n % 256);
    n = Math.floor(n / 256);
  }
  bytes.splice(bytes.length - 8, 8, ...lenBytes);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
    h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Array(64);

  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] =
        (bytes[off + i * 4] << 24) |
        (bytes[off + i * 4 + 1] << 16) |
        (bytes[off + i * 4 + 2] << 8) |
        bytes[off + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => (x >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

export function hashPassword(salt, password) {
  return sha256Hex(salt + ':' + password);
}

/* ---------- 登录态 ---------- */

export function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const a = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
    if (a && a.u && typeof a.u === 'string') return a;
    return null;
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_KEY);
}

/* 供 enhancer / 组件统一使用：是否已登录 */
export function isAuthed() {
  return getAuth() != null;
}

/* 生成跳转登录页的地址，登录成功后回到当前页 */
export function loginUrlFor(currentPath) {
  return '/login?redirect=' + encodeURIComponent(currentPath || '/docs/intro');
}

/* 校验 redirect 参数：只允许站内路径，防 open redirect。
   注意浏览器会把路径里的 `\` 规范化为 `/`，所以 "/\evil.com"
   能绕过 "//" 前缀检查——必须单独拦掉。 */
export function safeRedirect(target) {
  if (
    typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\')
  ) {
    return target;
  }
  return '/';
}
