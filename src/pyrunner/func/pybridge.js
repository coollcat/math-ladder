/* =========================================================================
 * 浮窗 Python 里的 see() / seen() —— 由 enhancer.js 的 ensurePreamble 装进 Pyodide
 * -------------------------------------------------------------------------
 *   see(*fs, mode=None, x=None, domain=None, t=None, u=None, v=None,
 *       theta=None, phi=None, add=False, **params)
 *       fs 可以是：式子字符串 / sympy 表达式（含 sp.Eq）/ Python 函数 / 元组（参数式）/ 它们的列表
 *   seen(i=None)  取回工作区里的函数：可调用（numpy 向量化），.sym 给 sympy 形式
 *
 * 两个名字挂在 builtins 上：浮窗命名空间被「重置变量」清空后照样能用，
 * 课文判题用的 _ml_run 也看得见（不影响判题，只是多两个内置名）。
 *
 * Python 函数的采样走 _ml_fn_sample：JS 端（bridge.js 的 samplePy）同步调它，
 * 一次给一整排 x（或一张 x-y 网格），numpy 向量化算完按逗号串回去——
 * 'nan' 正好能被 JS 的 parseFloat 读成 NaN，不用另做转义。
 * ========================================================================= */

import { getHub } from './bridge.js';

export const PY_FN_HELPERS = String.raw`
import builtins as _ml_bi
import json as _ml_json

_ml_fn_reg = {}
_ml_fn_n = [0]

def _ml_fn_is_sympy(o):
    return type(o).__module__.split('.')[0] == 'sympy'

def _ml_fn_src(o):
    """sympy 表达式 → 看见函数认识的式子文本"""
    import re
    if getattr(o, 'is_Relational', False) and hasattr(o, 'lhs'):
        return _ml_fn_src(o.lhs) + ' = ' + _ml_fn_src(o.rhs)
    s = str(o)
    s = s.replace('**', '^')
    s = re.sub(r'\blog\(', 'ln(', s)          # sympy 的 log 是自然对数；本站单参 log 是常用对数
    s = re.sub(r'\bAbs\(', 'abs(', s)
    s = re.sub(r'\bceiling\(', 'ceil(', s)
    s = re.sub(r'\bMax\(', 'max(', s)
    s = re.sub(r'\bMin\(', 'min(', s)
    s = re.sub(r'\bE\b', 'e', s)
    s = re.sub(r'\boo\b', 'inf', s)
    return s

def _ml_fn_register(f, pvals):
    import inspect
    _ml_fn_n[0] += 1
    fid = 'py%d' % _ml_fn_n[0]
    _ml_fn_reg[fid] = f
    while len(_ml_fn_reg) > 48:
        _ml_fn_reg.pop(next(iter(_ml_fn_reg)))
    nargs, kw = 1, {}
    try:
        pos = []
        for p in inspect.signature(f).parameters.values():
            if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD) and p.default is p.empty:
                pos.append(p.name)
            elif p.default is not p.empty and isinstance(p.default, (int, float)) and not isinstance(p.default, bool):
                kw[p.name] = float(p.default)
        if pos:
            nargs = 2 if len(pos) >= 2 else 1
    except (TypeError, ValueError):
        pass
    for k, val in kw.items():
        pvals.setdefault(k, val)
    name = getattr(f, '__name__', 'f') or 'f'
    if name == '<lambda>':
        name = 'lambda'
    return {'py': {'id': fid, 'name': name, 'nargs': nargs, 'params': kw}}

def _ml_fn_one(f, args, p):
    try:
        return float(f(*args, **p))
    except Exception:
        return float('nan')

def _ml_fn_sample(fid, req):
    import numpy as np
    f = _ml_fn_reg.get(fid)
    if f is None:
        return ''
    r = _ml_json.loads(req)
    p = {k: float(v) for k, v in (r.get('params') or {}).items()}
    with np.errstate(all='ignore'):
        if r.get('kind') == 'xy':
            xs = np.linspace(r['x0'], r['x1'], int(r['nx']) + 1)
            ys = np.linspace(r['y0'], r['y1'], int(r['ny']) + 1)
            X, Y = np.meshgrid(xs, ys, indexing='ij')   # 行沿 x：与 analyze.grid2 的 i*(ny+1)+j 布局一致
            try:
                Z = np.asarray(f(X, Y, **p), dtype=float)
                Z = np.broadcast_to(Z, X.shape)
            except Exception:
                Z = np.array([[_ml_fn_one(f, (a, b), p) for b in ys] for a in xs], dtype=float)
            vals = Z.ravel()
        else:
            xs = np.linspace(r['x0'], r['x1'], int(r['n']) + 1)
            try:
                y = np.asarray(f(xs, **p), dtype=float)
                y = np.broadcast_to(y, xs.shape)
            except Exception:
                y = np.array([_ml_fn_one(f, (a,), p) for a in xs], dtype=float)
            vals = y
    return ','.join(repr(float(v)) for v in vals)

_ML_FN_MSG = {
    'page': '→ 已画进本页的「看见函数」',
    'inline': '→ 已画在下方（本页没有「看见函数」工作区，就内嵌在这次运行的输出里）',
    'tab': '→ 已在新标签页打开「看见函数」',
}

def see(*fs, mode=None, x=None, domain=None, t=None, u=None, v=None, theta=None, phi=None, add=False, **params):
    """把式子画进「看见函数」。

    see("sin(x)/x")                      字符串式子（与看见函数输入框同一套写法）
    see(sp.diff(f, x))                   sympy 表达式；sp.Eq(x**2 + y**2, 1) 是隐函数
    see(lambda x, a=1: a*np.sin(x))      Python 函数：带默认值的数值参数会变成滑块
    see(("cos(t)", "sin(t)"), t=(0, 6.3))  元组 = 参数曲线；三个分量是空间曲线/参数曲面
    see(f, g, add=True)                  add=True：叠加到已有曲线上，而不是替换
    其余关键字：mode='2d'/'3d'、x=(x0, x1) 横向视野、domain=立体的 xy 半边长、a=2 这类参数初值
    """
    import js
    items = []
    for o in fs:
        if isinstance(o, list):
            items.extend(o)
        else:
            items.append(o)
    funcs, pvals = [], {}
    for o in items:
        if isinstance(o, str):
            funcs.append({'src': o})
        elif isinstance(o, tuple):
            parts = [p if isinstance(p, str) else _ml_fn_src(p) for p in o]
            funcs.append({'src': '(' + ', '.join(parts) + ')'})
        elif _ml_fn_is_sympy(o):
            funcs.append({'src': _ml_fn_src(o)})
        elif callable(o):
            funcs.append(_ml_fn_register(o, pvals))
        else:
            raise TypeError('see() 认识：字符串式子、sympy 表达式、Python 函数（或它们的列表/元组），这里是 %s' % type(o).__name__)
    if not funcs:
        raise ValueError('see() 至少要给一个式子或函数')
    for k, val in params.items():
        try:
            pvals[k] = float(val)
        except (TypeError, ValueError):
            raise TypeError('参数 %s 要给数值，这里是 %r' % (k, val))
    spec = {'funcs': funcs, 'params': pvals, 'add': bool(add)}
    if mode:
        spec['mode'] = str(mode).lower()
    if x is not None:
        spec['view'] = [float(x[0]), float(x[1])]
    if domain is not None:
        spec['domain'] = float(domain)
    rng = {}
    for key, val in (('t', t), ('u', u), ('v', v), ('theta', theta), ('phi', phi)):
        if val is not None:
            rng[key] = [float(val[0]), float(val[1])]
    if rng:
        spec['ranges'] = rng
    hub = getattr(js.window, '__mlFnHub', None)
    if hub is None:
        raise RuntimeError('页面上的「看见函数」桥还没准备好：刷新页面再试')
    res = str(hub.push(_ml_json.dumps(spec)))
    if res not in _ML_FN_MSG:
        raise RuntimeError(res.replace('error:', '', 1) or 'see() 没画出来')
    print(_ML_FN_MSG[res])

_ML_FN_KIND = {
    'fx': 'y = f(x)', 'py': 'Python 函数', 'polar': '极坐标 r(θ)', 'param2': '参数曲线',
    'implicit': '隐函数 F(x,y)=0', 'fxy': '曲面 z = f(x,y)', 'psurf': '参数曲面',
    'curve3': '空间曲线', 'sph': '球坐标 r(θ,φ)',
}

class SeenFunction:
    """seen() 取回的函数：f(x) 直接按 numpy 求值（参数取看见函数里此刻的值，也可 f(x, a=2) 临时改）"""

    def __init__(self, d):
        self.label = d.get('label', 'f')
        self.kind = d.get('kind', 'fx')
        self.src = d.get('src', '')
        self.params = {k: float(v) for k, v in (d.get('params') or {}).items()}
        self.args = list(d.get('args') or ['x'])
        self.ranges = d.get('ranges') or {}
        self._np = d.get('numpy') or []
        self._sp = d.get('sympy') or []
        self._needs = d.get('needs') or []
        self._py = (d.get('py') or {}).get('id')
        self._fn = None

    def _build(self):
        if self._fn is not None:
            return self._fn
        if self._py:
            f = _ml_fn_reg.get(self._py)
            if f is None:
                raise RuntimeError('这个 Python 函数已经不在了（浮窗重置过？）：重新 see() 一次')
            self._fn = f
            return f
        import numpy as np
        ns = {'np': np}
        if 'gamma' in self._needs:
            from scipy.special import gamma as _g
            ns['_gamma'] = _g
        body = self._np[0] if len(self._np) == 1 else '(' + ', '.join(self._np) + ')'
        sig = ', '.join(self.args + ['%s=%r' % (k, v) for k, v in self.params.items()])
        self._fn = eval('lambda %s: %s' % (sig, body), ns)
        return self._fn

    def __call__(self, *a, **kw):
        import numpy as np
        f = self._build()
        if self._py:
            p = dict(self.params)
            p.update(kw)
            return f(*a, **p)
        with np.errstate(all='ignore'):
            return f(*a, **kw)

    @property
    def sym(self):
        """sympy 形式（要先 import sympy，浮窗才会装它）"""
        if self._py or not self._sp:
            raise ValueError('Python 函数没有符号形式')
        import sympy as sp
        ns = {'sp': sp}
        for n in self.args + list(self.params):
            ns[n] = sp.Symbol(n, real=True)
        parts = [eval(s, ns) for s in self._sp]
        return parts[0] if len(parts) == 1 else tuple(parts)

    def __repr__(self):
        ps = ', '.join('%s=%g' % kv for kv in self.params.items())
        return '<%s · %s：%s%s>' % (self.label, _ML_FN_KIND.get(self.kind, self.kind), self.src,
                                    ('  [' + ps + ']') if ps else '')

def seen(i=None):
    """取回「看见函数」里此刻的函数。只有一条时直接返回它，多条返回列表；seen(0) 取第一条"""
    import js
    hub = getattr(js.window, '__mlFnHub', None)
    raw = str(hub.pull()) if hub is not None else ''
    if not raw:
        raise RuntimeError('本页没有「看见函数」工作区：打开 /function 页面，或先用 see(...) 画一个')
    snap = _ml_json.loads(raw)
    fs = [SeenFunction(d) for d in snap.get('funcs', [])]
    if i is not None:
        return fs[i]
    if len(fs) == 1:
        return fs[0]
    return fs

_ml_bi.see = see
_ml_bi.seen = seen
`;

/** 装桥：跑一遍 Python 端定义，再把采样入口交给总线 */
export async function installPyFnBridge(py) {
  if (!py || py.__mlFnBridge) return;
  const hub = getHub();
  await py.runPythonAsync(PY_FN_HELPERS);
  const fn = py.globals.get('_ml_fn_sample');
  if (hub) {
    hub.pySample = fn;
    hub.preload();
  }
  py.__mlFnBridge = true;
}

/** 源码里用到了 see( / seen(：浮窗要先把 numpy 装上（采样与 seen() 的求值都靠它） */
export const USES_FN_BRIDGE = /\b(?:see|seen)\s*\(/;
