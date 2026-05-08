// 导入 Node.js 内置文件系统模块，用于读取本地文件（如获取封面图片大小）
import fs from 'node:fs'
// 导入 Node.js 内置路径处理模块，用于拼接安全的文件路径
import path from 'node:path'

// 站点全局配置，假设存放在 src/config/site-content.json，包含 meta 等字段
import siteContent from '@/config/site-content.json'
// 博客索引文件，位于 public/blogs/index.json，在构建时读取
import blogIndex from '@/../public/blogs/index.json'
// TypeScript 类型定义，描述博客索引项的结构（slug, title, summary, date, tags, cover 等）
import type { BlogIndexItem } from '@/app/blog/types'

// 站点完整 URL，优先使用环境变量，否则回退到默认域名
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yuangwu.com'
// RSS 订阅文件的路径，将生成在站点根目录下的 rss.xml
const FEED_PATH = '/rss.xml'
// 去除站点 URL 末尾可能存在的斜杠，保证拼接时不出现双斜杠
const SITE_ORIGIN = SITE_URL.replace(/\/$/, '')
// RSS 文件的完整访问 URL（用于 atom:link 自引用）
const FEED_URL = `${SITE_ORIGIN}${FEED_PATH}`
// Next.js 项目的 public 目录的绝对路径，用于定位静态资源
const PUBLIC_DIR = path.join(process.cwd(), 'public')

// 将索引 JSON 数据断言为博客项数组，方便后续映射
const blogs = blogIndex as BlogIndexItem[]

/**
 * 转义 XML 中的特殊字符，防止破坏 RSS 结构
 */
const escapeXml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')

/**
 * 将内容包裹在 <![CDATA[...]]> 中，避免对特殊字符进行二次转义，适合放置摘要等可能包含 HTML 的文本
 */
const wrapCdata = (value: string): string => `<![CDATA[${value}]]>`

/**
 * 从 URL 字符串中提取文件扩展名（忽略查询参数和哈希）
 * 例如 'https://example.com/image.jpg?w=200' -> 'jpg'
 */
const getExtension = (input: string): string | undefined => {
	// 先移除 ? 或 # 及之后的部分
	const clean = input.split(/[?#]/)[0]
	// 取最后一个点之后的部分作为扩展名，并转为小写
	return clean.split('.').pop()?.toLowerCase()
}

/**
 * 根据图片 URL 推测其 MIME 类型，仅支持常见图片格式
 * 返回 null 表示类型未知或无法识别
 */
const getMimeTypeFromUrl = (url?: string): string | null => {
	if (!url) return null
	const ext = getExtension(url)
	if (!ext) return null
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
	if (ext === 'png') return 'image/png'
	if (ext === 'gif') return 'image/gif'
	if (ext === 'webp') return 'image/webp'
	if (ext === 'svg') return 'image/svg+xml'
	return null
}

/**
 * 构建 RSS <enclosure> 元素，用于播客或资源的附件信息（此处用于博客封面）
 * 只有当能成功获取文件大小时才会返回 enclosure 标签，否则返回 null 表示不添加该元素
 */
const buildEnclosure = (cover?: string): string | null => {
	if (!cover) return null

	// 如果是相对路径，则拼接为完整 URL；否则直接使用
	const absoluteUrl = /^https?:\/\//.test(cover)
		? cover
		: `${SITE_ORIGIN}${cover}`
	// 获取该图片的 MIME 类型
	const type = getMimeTypeFromUrl(absoluteUrl)
	if (!type) return null

	let length: number | null = null

	// 仅当封面为相对路径（本地文件）时，尝试读取文件大小
	if (!/^https?:\/\//.test(cover)) {
		// 构建文件在 public 目录下的绝对路径（去掉前导斜杠）
		const filePath = path.join(PUBLIC_DIR, cover.replace(/^\/+/, ''))
		try {
			// 同步获取文件状态信息
			const stat = fs.statSync(filePath)
			if (stat.isFile()) {
				length = stat.size // 字节数
			}
		} catch {
			// 文件不存在或无法读取时，放弃添加 enclosure
			length = null
		}
	}

	// 如果无法获得有效的文件长度，则不输出 enclosure
	if (length === null) {
		return null
	}

	// 返回符合 RSS 2.0 规范的 enclosure 标签，URL 中的特殊字符已经转义
	return `<enclosure url="${escapeXml(absoluteUrl)}" type="${type}" length="${length}" />`
}

/**
 * 将单篇博客的索引项序列化为 RSS <item> 字符串
 */
const serializeItem = (item: BlogIndexItem): string => {
	// 博客详情页的完整链接
	const link = `${SITE_ORIGIN}/blog/${item.slug}`
	// 标题转义
	const title = escapeXml(item.title || item.slug)
	// 摘要用 CDATA 包裹，支持 HTML
	const description = wrapCdata(item.summary || '')
	// 发布日期转为符合 RSS 标准的 RFC-822 时间格式
	const pubDate = new Date(item.date).toUTCString()
	// 将标签数组转换为多个 <category> 元素，过滤掉空值
	const categories = (item.tags || [])
		.filter(Boolean)
		.map(tag => `<category>${escapeXml(tag)}</category>`)
		.join('')

	// 尝试生成封面图片的 enclosure 元素
	const enclosure = buildEnclosure(item.cover)

	// 返回完整的 <item> 结构，注意 guid 使用了固定链接，并以 isPermaLink=false 指明它是字符串标识
	return `
		<item>
			<title>${title}</title>
			<link>${link}</link>
			<guid isPermaLink="false">${escapeXml(link)}</guid>
			<description>${description}</description>
			<pubDate>${pubDate}</pubDate>
			${categories}
			${enclosure ?? ''}
		</item>`.trim()
}

// 强制此路由在构建时静态生成（不依赖请求时的动态数据）
export const dynamic = 'force-static'
// 禁止增量静态再验证，RSS 文件只在构建时生成一次
export const revalidate = false

/**
 * Next.js 路由处理函数，响应 GET 请求，返回 RSS 2.0 格式的 XML 文档
 */
export function GET(): Response {
	// 从站点配置中获取 title 与 description，若未配置则使用默认值
	const title = siteContent.meta?.title || '2025 Blog'
	const description = siteContent.meta?.description || 'Latest updates from 2025 Blog'

	// 从博客索引中筛选出包含 slug 的有效条目，映射为 RSS item 字符串再拼接
	const items = blogs
		.filter(item => item?.slug)
		.map(serializeItem)
		.join('')

	// 组装完整的 RSS XML 文档
	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel xmlns:atom="http://www.w3.org/2005/Atom">
		<title>${escapeXml(title)}</title>
		<link>${SITE_ORIGIN}</link>
		<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
		<description>${escapeXml(description)}</description>
		<language>zh-CN</language>
		<docs>https://www.rssboard.org/rss-specification</docs>
		<ttl>60</ttl>
		<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
		${items}
	</channel>
</rss>`

	// 返回带有正确 Content-Type 和缓存控制的 HTTP 响应
	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			// 允许公共缓存，但每次都得重新验证（适用于 RSS 阅读器频繁检查）
			'Cache-Control': 'public, max-age=0, must-revalidate'
		}
	})
}