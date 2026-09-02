---
title: Astro content.config.ts 详解
author: Comardom
description: 详细介绍 Astro 内容集合配置文件 content.config.ts 的作用、字段校验方式，以及它与 Markdown 文章和博客页面之间的关系。
pubDate: 2026-09-02
draft: false
aiGenerated: true
---

## 文件作用

`src/content.config.ts` 是 Astro 内容集合的配置和校验中心，主要负责三件事：

1. 告诉 Astro 去哪里查找 Markdown 文件。
2. 定义每篇文章需要有哪些 frontmatter 字段。
3. 检查 Markdown 文件中的字段是否符合预期格式。

当前配置如下：

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blog = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/blog',
    }),
    schema: z.object({
        title: z.string(),
        author: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        aiGenerated: z.boolean().default(false),
    }),
})

export const collections = { blog }
```

可以把它简单理解为：

```text
content.config.ts = 文章格式规则
*.md              = 文章内容
index.astro       = 文章列表模板
[...slug].astro   = 文章详情模板
```

## Markdown 文章的位置

配置中的：

```ts
base: './src/content/blog'
```

表示文章根目录是：

```text
src/content/blog/
```

例如：

```text
src/content/blog/first-post.md
src/content/blog/AI总结/content-config详解.md
```

配置中的：

```ts
pattern: '**/*.md'
```

表示匹配这个目录及其子目录下的所有 Markdown 文件。

其中：

- `**/` 表示任意层级的目录。
- `*.md` 表示所有以 `.md` 结尾的文件。

因此，文章可以直接放在 `src/content/blog/` 中，也可以按照分类放在子目录中。

## `blog` 内容集合

```ts
const blog = defineCollection({
```

这里定义了一个名为 `blog` 的内容集合。

这个名字会在页面中使用：

```ts
getCollection('blog')
getEntry('blog', slug)
```

`blog` 代表全部博客文章，而不是某一篇具体文章。例如：

```text
blog 集合
├── first-post.md
├── astro-note.md
└── AI总结/content-config详解.md
```

如果把集合名称改成 `articles`，页面中的读取代码也必须同步改为：

```ts
getCollection('articles')
getEntry('articles', slug)
```

## 字段校验规则

```ts
schema: z.object({
```

`schema` 定义了每篇文章 frontmatter 的数据结构。

它可以防止不同作者提交格式不一致的文章。例如，文章必须填写作者和发布日期，否则类型检查或构建时会提示错误。

## `title` 标题

```ts
title: z.string(),
```

`title` 是必填字段，并且必须是字符串：

```md
title: Astro 入门
```

文章页面会通过以下方式读取：

```ts
post.data.title
```

它可以用于：

- 博客列表中的文章标题。
- 文章详情页的一级标题。
- HTML 页面的 `<title>`。
- 搜索引擎的页面标题。

## `author` 作者

```ts
author: z.string(),
```

`author` 是必填字符串，用来记录文章作者：

```md
author: Comardom
```

朋友投稿时可以写成：

```md
author: 张三
```

或者：

```md
author: 李四、王五
```

页面通过以下方式读取：

```ts
post.data.author
```

当前会显示在博客列表和文章详情页中：

```text
作者：Comardom
```

作者字段没有使用 `.optional()`，所以每篇文章都必须填写作者。这样可以避免文章发布后出现作者缺失的情况。

## `description` 摘要

```ts
description: z.string().optional(),
```

`description` 是可选字符串。

可以填写：

```md
description: 这是文章摘要。
```

也可以省略：

```md
---
title: 一篇文章
author: Comardom
pubDate: 2026-09-02
---
```

如果填写，它会用于：

- 博客列表中的文章摘要。
- HTML 的 `meta description`。

如果文章没有填写摘要，文章详情页会使用文章标题作为备用描述：

```ts
const description = post.data.description ?? post.data.title
```

## `pubDate` 发布日期

```ts
pubDate: z.coerce.date(),
```

`pubDate` 是必填日期：

```md
pubDate: 2026-09-02
```

`z.coerce.date()` 会尝试把 Markdown 中的日期值转换成 JavaScript 的 `Date` 对象。因此页面可以调用：

```ts
post.data.pubDate.toISOString()
post.data.pubDate.toLocaleDateString('zh-CN')
```

发布日期有两个用途：

1. 在文章页面显示发布时间。
2. 让博客列表按照新文章在前、旧文章在后的顺序排列。

排序代码如下：

```ts
.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
```

## `updatedDate` 修改日期

```ts
updatedDate: z.coerce.date().optional(),
```

`updatedDate` 是可选的最后修改日期：

```md
updatedDate: 2026-09-10
```

它适合用于区分：

```text
文章最初发布于哪一天
文章最后修改于哪一天
```

目前这个字段已经配置，但页面暂时还没有显示它。以后可以在文章详情页中增加：

```astro
{post.data.updatedDate && (
    <time datetime={post.data.updatedDate.toISOString()}>
        更新于 {post.data.updatedDate.toLocaleDateString('zh-CN')}
    </time>
)}
```

## `draft` 草稿状态

```ts
draft: z.boolean().default(false),
```

`draft` 表示文章是否为草稿，值必须是布尔值：

```md
draft: true
```

或者：

```md
draft: false
```

`.default(false)` 表示如果没有填写 `draft`，就自动当作 `false`。

所以以下文章默认会发布：

```md
---
title: 一篇文章
author: Comardom
pubDate: 2026-09-02
---
```

以下写法会让文章保持草稿状态：

```md
---
title: 一篇草稿
author: Comardom
pubDate: 2026-09-02
draft: true
---
```

博客列表页会过滤掉草稿：

```ts
const posts = await getCollection(
    'blog',
    ({ data }) => !data.draft,
)
```

文章详情页也会检查草稿。如果直接访问草稿 URL，会被重定向回 `/blog`，而不会显示正文。

## `aiGenerated` AI 生成标记

```ts
aiGenerated: z.boolean().default(false),
```

`aiGenerated` 用来明确标记文章是否由 AI 生成或参与生成。默认值是 `false`，因此普通文章不需要额外填写。

AI 参与生成的文章，在 frontmatter 中写：

```md
aiGenerated: true
```

文章列表和文章详情页都会显示“AI 生成”标签。

完全由作者独立创作的文章，可以写：

```md
aiGenerated: false
```

## 导出内容集合

```ts
export const collections = { blog }
```

这句代码把 `blog` 集合注册到 Astro 中。

页面中的：

```ts
getCollection('blog')
```

和：

```ts
getEntry('blog', slug)
```

都依赖这个导出配置。

`{ blog }` 是对象属性简写，等价于：

```ts
{ blog: blog }
```

## 与博客列表页的关系

博客列表页使用：

```ts
import { getCollection } from 'astro:content'
```

然后读取文章集合：

```ts
const posts = await getCollection(
    'blog',
    ({ data }) => !data.draft,
)
```

每篇文章的元数据通过 `post.data` 访问：

```ts
post.data.title
post.data.author
post.data.description
post.data.pubDate
post.data.draft
```

这些字段都来自 `content.config.ts` 中的 schema 定义。

## 与文章详情页的关系

文章详情页使用：

```ts
import { getEntry, render } from 'astro:content'
```

根据 URL 中的 slug 查找文章：

```ts
const post = await getEntry('blog', slug)
```

例如访问：

```text
/blog/first-post
```

其中 `slug` 是：

```text
first-post
```

Astro 会查找：

```text
src/content/blog/first-post.md
```

Markdown 的元数据通过 `post.data` 读取，正文则通过以下代码转换：

```ts
const { Content } = await render(post)
```

最后使用：

```astro
<Content />
```

把 Markdown 正文渲染成 HTML。

## 文件名与网址

文件：

```text
src/content/blog/first-post.md
```

对应的文章地址是：

```text
/blog/first-post
```

子目录也会参与生成路径。例如：

```text
src/content/blog/AI总结/content-config详解.md
```

对应的地址通常是：

```text
/blog/AI总结/content-config详解
```

## 一篇完整文章的格式

最少需要填写三个字段：

```md
---
title: 文章标题
author: 作者名字
pubDate: 2026-09-02
---

# 文章标题

这里是 Markdown 正文。
```

完整推荐格式：

```md
---
title: 文章标题
author: 作者名字
description: 文章摘要
pubDate: 2026-09-02
updatedDate: 2026-09-10
draft: false
---

# 文章标题

这里是 Markdown 正文。
```

## 创建文章时的完整流程

新建文件：

```text
src/content/blog/my-note.md
```

写入 frontmatter：

```md
---
title: 我的笔记
author: 张三
pubDate: 2026-09-02
draft: false
---
```

Astro 构建时会执行：

```text
1. glob 找到 my-note.md
2. 读取文件顶部的 frontmatter
3. 使用 schema 检查字段格式
4. 把 pubDate 转换成 Date
5. 把文章注册到 blog 集合
6. /blog 读取文章并显示列表
7. /blog/my-note 读取文章并显示正文
```

如果字段写错，例如：

```md
pubDate: not-a-date
```

或者缺少必填字段：

```md
title: 没有作者的文章
```

Astro 的内容校验会报错，提醒作者修正文章。

## 当前文件不负责的内容

`content.config.ts` 不负责：

- 页面布局。
- 博客列表样式。
- Markdown 正文样式。
- 作者头像。
- 文章导航。
- 分页和搜索。
- 评论功能。

这些功能由其他文件负责：

```text
content.config.ts                    文章格式规则
src/content/blog/*.md                文章内容
src/pages/blog/index.astro           文章列表
src/pages/blog/[...slug].astro       文章详情
src/css/blog.css                     博客样式
src/layouts/ScrollablePageLayout.astro 页面公共布局
```
