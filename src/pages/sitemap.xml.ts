/**
 * /sitemap.xml 生成器（Astro 端点路由）
 *
 * ▍为什么需要这个文件
 *   本项目是 SSR（output: 'server'）。文章页 /usus/xxx、/litterae/xxx 由
 *   src/pages/usus/[...slug].astro、src/pages/litterae/[...slug].astro
 *   在“请求到达时”按 slug 动态渲染，构建期并不存在这些具体 URL，
 *   所以原来的 @astrojs/sitemap 插件扫描不到文章，只会输出首页等 3 条。
 *   因此改成自建本端点：它和文章列表/详情页读取同一份“内容集合”，
 *   用内容层给出的 entry.id 生成 URL，保证 sitemap 里的地址与站点真实链接完全一致。
 *
 * ▍何时触发（文件即路由）
 *   Astro 约定：src/pages/ 下的文件名 = 对外 URL 路径，无需手动调用。
 *   本文件对外就对应 https://comardom.top/sitemap.xml。
 *   export const prerender = true  =>  pnpm build 时执行一次 GET，
 *   把结果固化为静态文件 dist/client/sitemap.xml，之后请求直接返回它。
 *   （若删掉 prerender，则变成每次访问 /sitemap.xml 时实时执行 GET。）
 *
 * ▍维护提醒
 *   - 增删 md 文章 => 重新 pnpm build（deploy.sh 每次都先 build）即自动更新 sitemap；
 *   - 若改了文章目录结构 / content schema / URL 规则，务必同步本文件的拼 URL 与取值逻辑；
 *   - 域名统一取 src/data/blog.ts 的 url，不要在此写死。
 */
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content' // 与文章列表/详情页同一数据源
import { blog } from '@/data/blog.ts' // 站点域名与名称的唯一来源

// 逐段 percent-encode：保留 id 里的 "/"（usus 多级目录用 "/" 拼接），其余交给 encodeURIComponent
const encodeSegment = (segment: string) => encodeURIComponent(segment)

// 防止 URL/日期里出现 & < > 时破坏 XML 结构
const xmlEscape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 固定页面（/、/usus/、/litterae/）：域名 + 路径即可
const pageUrl = (pathname: string) => xmlEscape(`${blog.url}${pathname}`)

// 文章页：拼法与首页卡片链接完全一致（/usus|/litterae + entry.id），
// 保证 sitemap 与真实可访问链接同源，不会出现文件名 slug 处理不一致导致的错位
const entryUrl = (collectionPath: string, id: string) =>
    xmlEscape(`${blog.url}/${collectionPath}/${id.split('/').map(encodeSegment).join('/')}`)

const iso = (date: Date) => date.toISOString()

// 关键：构建期预生成静态文件，而不是每次请求时动态渲染
export const prerender = true

export const GET: APIRoute = async () => {
    // 两个集合都读，且按首页列表同样的规则过滤 draft:true 的文章（草稿不进 sitemap）
    const usus = (await getCollection('usus', ({ data }) => !data.draft)).sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    )
    const litterae = (await getCollection('litterae', ({ data }) => !data.draft)).sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    )

    // 三个固定页没有文章日期，统一用“本次构建时间”当 lastmod
    const builtAt = iso(new Date())

    // usus 的 schema 有 updatedDate，取“更新日期 ?? 发布日期”，
    // 与正文页“参考日期”（updatedDate ?? pubDate）的口径保持一致
    const ususEntry = (entry: (typeof usus)[number]) => [
        entryUrl('usus', entry.id),
        iso(entry.data.updatedDate ?? entry.data.pubDate),
    ]

    // litterae 的 schema 没有 updatedDate（只有 pubDate），单独处理避免类型报错
    const litteraeEntry = (entry: (typeof litterae)[number]) => [
        entryUrl('litterae', entry.id),
        iso(entry.data.pubDate),
    ]

    const urls = [
        [pageUrl('/'), builtAt], // 首页
        [pageUrl('/usus/'), builtAt], // usus 列表页
        ...usus.map(ususEntry), // 所有非草稿技术文章
        [pageUrl('/litterae/'), builtAt], // litterae 列表页
        ...litterae.map(litteraeEntry), // 所有非草稿诗歌
    ]

    // 手工拼 <urlset> 结构，返回 application/xml
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
        .map(
            ([loc, lastmod]) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
        )
        .join('\n')}
</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
        },
    })
}
