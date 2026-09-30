# 论文链接与 PDF 归档 · 纪律与操作,,> 从 `AGENTS.md` 下沉而来（2026-09-30 文档瘦身）。**往 `scripts/references-data.json`,> 里加任何 `@f`（PDF）之前必读这份。** 一句话红线仍在 `AGENTS.md`：,> 任何 PDF 链接必须机器验证过，宁缺毋滥，拿不到就留 `@page`。

- **论文链接纪律（2026-08-30 加固）**：arXiv ID 只写验证过的高把握条目（abs 页 + `arxiv.org/pdf/<id>` 下载链）；没把握的文献只给稳定的 Wikipedia/官网页面（`@page`），**宁缺毋滥，不编造 ID**。条目正文不放行内公式（MDX 塌陷风险）。
  **任何 `@f`（PDF）都必须是机器验证过的链接**，不许凭印象填。已验证可用的四条找源路径：

  | 场景 | 接口 | 拿什么 |
  | --- | --- | --- |
  | arXiv 论文 | `http://export.arxiv.org/api/query?id_list=<id>` 或 `?search_query=ti:"标题"` | 先用 **`id_list` 回查标题确认没张冠李戴**（踩过坑：`2312.00916` 根本不是 AlphaGeometry），再拼 `arxiv.org/pdf/<id>` |
  | 公版原著 | Gutenberg（`gutenberg.org/ebooks/search/?query=` → 详情页正则取 `.pdf`）→ 兜底 archive.org（`advancedsearch.php` → `metadata/<id>` → 找 `format` 含 PDF 的 file） | `files/<id>/<id>-pdf.pdf`（文本版，几百 KB）、`archive.org/download/<id>/<file>`（扫描件，10–50 MB） |
  | 现代论文 OA | OpenAlex（`api.openalex.org/works?filter=title.search:`）拿 DOI → Unpaywall（`api.unpaywall.org/v2/<doi>?email=`）拿 OA PDF | 老论文（1950–1990）OA 命中率只有两三成，别指望 |
  | 机构镜像 | 直接 candidate 探测 | 命中率靠运气，**必须验证** |

  验证一律是「`Range: bytes=0-2047` 取前 2 KB 看 `%PDF-` 魔数」；被反爬（返回 `text/html`）就换浏览器 UA 再走一次完整 GET（只读前 2 KB 就 abort）。**典型失败码**：`401/403` = 站点要登录或反爬（ACM `dl.acm.org/doi/pdf/` 恒 403；archive.org 借阅受限的书也 401），`429` = 限流（AMS），`text/html` = 被 Cloudflare 挡。**拿不到就留 `@page`，不要硬凑。**
  **HTTP 200 + `%PDF-` 只证明"那里有个 PDF"，不证明它就是条目要的那篇**——归档后还要做一次**对版核对**，踩过两次坑：
  1. `arxiv:2312.00916` 以为是 AlphaGeometry，用 `id_list` 回查发现是一篇心理学量表论文 → 撤掉；
  2. Hellman 主页 `publications/32.pdf` 以为是 1976 年 *New Directions in Cryptography*，实际是 #32 = 1979 年 *Privacy and Authentication* → 换成 `#24` 对应的 `24.pdf`。
  核对手段按可靠性排序：**来源页面上的标题/编号对照**（Hellman 的 publications.html、RAND 的 P295 页面、archive.org 搜索结果标题）> arXiv `id_list` 回查标题 > 解压 PDF 文本层搜关键词（`zlib.inflate` 各 `stream`，再取 `(...)` 字符串字面量；**扫描件和 CID 字体提取不出**，此时只能靠来源页面）。
  另外下载器 `fetch-papers.mjs` 重试时会轮换浏览器 UA——RAND 一类站点只认浏览器 UA，否则 403。

- **论文下载（2026-08-30 改版：双路门禁）**：paper 卡片的「文献页面」对所有人开放；PDF 按钮由 `enhancer.js` 的 `paintPdfButton()` 决定去向——**已登录且有归档副本** → 虚线转实线、文案「⬇ 本地下载（x.x MB）」、`href` 指向 `/papers/xxx.pdf` 并带 `download`；**未登录**（或该条目没归档）→ 文案「⬇ 原站下载 / ⬇ PDF 下载」、新窗口打开原始地址。登录态在别的页面变化后，靠 `ml-auth-changed` 事件整体重刷按钮（`setAuth`/`clearAuth` 会 dispatch），不必等路由切换。
- **归档现状（2026-08-30）**：211 条条目里 **64 条有 PDF 副本（30.3%）**，共 62 份文件、375 MB（`static/papers/`，不入库）。剩下 147 条绝大多数是「只有 Wikipedia/官网页面」的条目——历史原著只有借阅受限的扫描件、1950–1990 年代期刊论文没有开放获取版本，这些既不编造链接也不硬凑，留 `@page` 即可。
- **归档流程**：`node scripts/fetch-papers.mjs`（增量抓 PDF 到 `static/papers/`，`--force` 全量、`--check` 体检）→ `node scripts/gen-references.mjs`（把 `@local64` + `@lsize` 写进条目）。两个顺序不能反：生成器只在**磁盘上真有该文件**时才写 `@local64`，所以没跑过下载的克隆会自然退化成「全部走原始地址」，绝不出死链。`static/papers/` 已加进 `.gitignore`（375 MB，可随时重抓），清单 `papers-local.json` 入库。`validate.mjs` 挂了第三条检查：副本缺失只**警告**不拦构建。
  **构建体积提醒**：这 375 MB 会原样进 `build/`。嫌大的话按「体积/价值」删（最大的几份：Sutton & Barto 教材 69.7 MB、Stable Diffusion 39 MB、Fourier 33 MB、Ars Conjectandi 28.4 MB、Cauchy 23.9 MB），删完跑一次 `gen-references.mjs` 就会自动不再引用。
