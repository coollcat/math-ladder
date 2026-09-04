async function createConfig() {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const { themes: prismThemes } = await import('prism-react-renderer');

  /** @type {import('@docusaurus/types').Config} */
  const config = {
    title: '数学阶梯',
    /* 2026-09-02：目标已经从「到傅里叶」变成「到人工智能与前沿数学」——
       傅里叶只是卷一信号与变换那一段的枢纽站，不是终点。 */
    tagline: '数学阶梯 · 从数感到前沿——小学直觉、中学工具、大学核心、工程应用，一路长到人工智能与前沿数学',
    url: process.env.URL || 'http://localhost:9452',
    baseUrl: '/',
    /* 默认 throw（构建闸门）。打包部署时若课文还在补写、存在指向未写页面的链接，
       可用 ML_ON_BROKEN_LINKS=warn 临时降级（见 构建Linux部署包.bat --loose）。 */
    onBrokenLinks: process.env.ML_ON_BROKEN_LINKS || 'throw',
    /* Rspack+SWC 构建管线：构建/热更新提速数倍，产物行为与 webpack 等价 */
    future: {
      faster: true,
      v4: true,
    },
    /* Pyodide 运行时按需从这三个 CDN 拉取，提前建连省掉首次运行时
       DNS+TLS 的几百毫秒（wasm 走 CORS fetch，需要 crossorigin 一份；
       pyodide.js 是经典 script，免 crossorigin 一份）。 */
    headTags: [
      { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://registry.npmmirror.com' } },
      { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://registry.npmmirror.com', crossorigin: 'anonymous' } },
      { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: 'anonymous' } },
      { tagName: 'link', attributes: { rel: 'preconnect', href: 'https://gcore.jsdelivr.net', crossorigin: 'anonymous' } },
    ],
    i18n: {
      defaultLocale: 'zh-Hans',
      locales: ['zh-Hans'],
    },
    markdown: {
      format: 'detect',
    },
    presets: [
      [
        'classic',
        {
          docs: {
            path: 'docs',
            routeBasePath: 'docs',
            sidebarPath: './sidebars.js',
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
            showLastUpdateTime: false,
            showLastUpdateAuthor: false,
            sidebarCollapsible: true,
            /* true = 章节默认全部折叠，只自动展开当前课所在的那一条链
               （早期设成 false，展开 76 章会把左侧栏拉成几千像素的滚动条） */
            sidebarCollapsed: true,
          },
          blog: false,
          theme: {
            customCss: './src/css/custom.css',
          },
        },
      ],
    ],
    themes: [
      [
        '@easyops-cn/docusaurus-search-local',
        {
          hashed: true,
          language: ['zh', 'en'],
          indexBlog: false,
          highlightSearchTermsOnTargetPage: true,
        },
      ],
    ],
    themeConfig: {
      colorMode: {
        respectPrefersColorScheme: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: false,
        },
      },
      navbar: {
        /* 2026-09-02：顶栏换成自定义实现（src/theme/Navbar/index.js，swizzle 整体接管），
           链接 / 搜索 / 账号菜单都写在那边的 LINKS 与组件里；这里只留标题，
           items 留空——再加条目也不会被渲染，改导航请去组件。 */
        title: '数学阶梯',
        items: [],
      },
      footer: {
        style: 'dark',
        copyright: '数学阶梯 · 从数感到前沿 · 每个工具都先讲清它从哪来',
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    },
    stylesheets: [
      {
        href: '/katex.min.css',
        type: 'text/css',
      },
    ],
  };

  return config;
}

module.exports = createConfig;
