# AGENTS.md — natare（comardom.top）

本文件供编码助手/协作者在改动前通读，避免破坏 SSR 与 SEO 机制。

## 开发

后台启动 dev server：`astro dev --background`；
管理：`astro dev stop` / `astro dev status` / `astro dev logs`。

端口：astro.config.mjs 里 server.host=true、port=2012
=> dev 地址 http://localhost:2012（局域网可用本机 IP 访问）。

常用命令：
- `pnpm astro check`       类型检查（改代码必跑）
- `pnpm build`             打包到 dist/（client 静态 + server node）
- `pnpm preview --port 2012`  预览构建产物（preview 默认 4321，需用 --port 覆盖）
- `sh deploy.sh`           重新 build 并打包部署线上（每次都会重新构建）

## 项目机制（改动前必读）

### SSR 模式
- output: 'server' + @astrojs/node(standalone)。
- 必须 SSR：① md 文章在请求时实时渲染；② 服务端读主题 cookie 预渲染，防闪屏。
- 不要把文章页改回静态，也别动布局里的主题读取逻辑。

### 主题防闪屏
- 深色模式：cookie `theme` = "dark" 时 `<html lang="zh-CN" class="dark">`，
  见 src/layouts/ScrollablePageLayout.astro:3-14。

### 路由（文件即路由）
- src/pages/ 下的文件名 = 对外 URL。
- 动态伪路由：src/pages/usus/[...slug].astro、src/pages/litterae/[...slug].astro；
  文章页用 getEntry(slug) 取文章，draft 一律 302 回对应列表页。

### 内容集合（content collections）
- src/content.config.ts 转发到 src/utils/content.config.ts。
- 集合 usus / litterae：都用 glob loader 读各自目录下的 **/*.md。
- 条目标识 = 文件名经 Astro 的 github-slugger 处理（ASCII 转小写、标点折叠，
  usus 的子目录并入 id 且以 "/" 分隔）。
  因此拼 URL / 链接一律用 entry.id（首页组件同款写法），不要在文件系统层猜文件名。
- 通过 astro:content 的 getCollection / getEntry 访问；
  凡列表 / 详情 / sitemap 都过滤 data.draft。
- schema：usus 有 updatedDate / aiGenerated；litterae 无 updatedDate（只有 pubDate / excerpt）。
  改动 schema 时要同步 sitemap 的取值。

### SEO / sitemap（勿回退到 @astrojs/sitemap）
- sitemap 由 src/pages/sitemap.xml.ts 端点生成（prerender => build 期固化为静态文件）。
- 域名统一用 src/data/blog.ts 的 url（https://comardom.top）。
- public/robots.txt 指向 https://comardom.top/sitemap.xml。
- 增删 md => 重新 build 即自动更新；改动目录结构 / slug / schema 时要同步改 sitemap.xml.ts。

### 样式与代码约定
- 路径别名 `@/` = src/（astro.config.mjs 的 vite.alias）。
- 注释使用中文；组件 PascalCase；引入 css 参照现有页面写法。
- 新增依赖前先确认是否已在 package.json。

## 验证清单
- 改代码：pnpm astro check
- 涉及构建 / 部署 / sitemap：pnpm build 后检查 dist/client/sitemap.xml 是否含预期文章
- 涉及 SSR 页面：pnpm preview 后 curl 对应 URL（端口用 --port 覆盖）

## 文档
- Astro 官方文档：https://docs.astro.build
- 相关指南：路由 / 内容集合 / SSR 适配器，见 https://docs.astro.build
