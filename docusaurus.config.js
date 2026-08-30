async function createConfig() {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const { themes: prismThemes } = await import('prism-react-renderer');

  /** @type {import('@docusaurus/types').Config} */
  const config = {
    title: '数学阶梯',
    tagline: '数学阶梯 · 从数感到前沿——覆盖小学直觉、中学工具、大学核心、工程应用与现代 AI 数学的全域数学路径；傅里叶是卷一信号与变换枢纽站而非终点',
    url: process.env.URL || 'http://localhost:9452',
    baseUrl: '/',
    onBrokenLinks: 'throw',
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
      navbar: {
        title: '数学阶梯',
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/intro', label: '怎么用本站', position: 'left' },
          { to: '/graph', label: '知识图谱', position: 'left' },
          { to: '/tree', label: '知识树', position: 'left' },
          { to: '/login', label: '登录', position: 'right' },
          { type: 'search', position: 'right' },
        ],
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
