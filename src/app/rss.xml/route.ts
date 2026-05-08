// 引入 Node.js 文件系统与路径处理模块（仅在构建阶段使用，Vercel 静态生成时安全）
import fs from 'node:fs'
import path from 'node:path'

// 站点元数据 JSON，部署前请确认 @/config/site-content.json 存在，否则构建失败
import siteContent from '@/config/site-content.json'
// 博客索引 JSON，路径依赖别名 @ 通常指向 src 目录，确保 public/blogs/index.json 存在
import blogIndex from '@/../public/blogs/index.json'
// 博客数据的 TypeScript 类型，请确保 @/app/blog/types 导出 BlogIndexItem
import type { BlogIndexItem } from '@/app/blog/types'

// 站点基础地址，优先使用环境变量 NEXT_PUBLIC_SITE_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yysuni.com'
// RSS 订阅路径
const FEED_PATH = '/rss.xml'
// 去除末尾斜杠的站点根地址
const SITE_ORIGIN = SITE_URL.replace(/\/$/, '')
// 完整的 RSS 订阅地址
const FEED_URL = `${SITE_ORIGIN}${FEED_PATH}`
// public 目录的绝对路径，用于在构建时读取静态文件
const PUBLIC_DIR = path.join(process.cwd(), 'public')

// 将导入的博客索引断言为 BlogIndexItem 数组（运行时不做额外转换）
const blogs = blogIndex as BlogIndexItem[]

/**
 * 转义 XML 特殊字符，防止 RSS 解析错误
 */
const escapeXml = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/**
 * 将文本包裹在 CDATA 段中，避免内容中包含的 HTML 或特殊字符影响 XML 结构
 */
const wrapCdata = (value: string): string => `<![CDATA[${value}]]>`

/**
 * 提取 URL 中文件扩展名（忽略查询与哈希部分）
 */
const getExtension = (input: string): string | undefined => {
	const clean = input.split(/[?#]/)[0]
	return clean.split('.').pop()?.toLowerCase()
}

/**
 * 根据图片 URL 返回 MIME 类型，用于 RSS <enclosure> 标签
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
 * 构造 RSS <enclosure> 元素
 * 仅当封面为本地图片且文件确实存在时，才输出包含文件大小的 enclosure 标签
 * 远程图片因无法在构建时获取大小而忽略 enclouse，避免 RSS 校验错误
 */
const buildEnclosure = (cover?: string): string | null => {
	if (!cover) return null
	// 确保图片地址为完整 URL
	const absoluteUrl = /^https?:\/\//.test(cover) ? cover : `${SITE_ORIGIN}${cover}`
	const type = getMimeTypeFromUrl(absoluteUrl)
	if (!type) return null

	let length: number | null = null

	// 本地图片：尝试读取实际文件大小，构建失败时返回 null（不会导致部署中断）
	if (!/^https?:\/\//.test(cover)) {
		const filePath = path.join(PUBLIC_DIR, cover.replace(/^\/+/, ''))
		try {
			const stat = fs.statSync(filePath)
			if (stat.isFile()) {
				length = stat.size
			}
		} catch {
			length = null
		}
	}

	// 文件大小未知时不输出 enclosure，避免 RSS 阅读器解析问题
	if (length === null) {
		return null
	}

	return `<enclosure url="${escapeXml(absoluteUrl)}" type="${type}" length="${length}" />`
}

/**
 * 将单篇博客数据序列化为 RSS <item> 条目
 */
const serializeItem = (item: BlogIndexItem): string => {
	const link = `${SITE_ORIGIN}/blog/${item.slug}`
	const title = escapeXml(item.title || item.slug)
	const description = wrapCdata(item.summary || '')
	const pubDate = new Date(item.date).toUTCString()
	const categories = (item.tags || [])
		.filter(Boolean)
		.map(tag => `<category>${escapeXml(tag)}</category>`)
		.join('')

	const enclosure = buildEnclosure(item.cover)

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

// 指定该路由为静态生成（SSG），在构建时一次性生成 XML 文件
export const dynamic = 'force-static'
// 禁用增量再验证，纯静态资源
export const revalidate = false

/**
 * 生成 RSS 2.0 订阅源的 GET 处理器
 * Vercel 部署时会在构建阶段执行并输出静态 rss.xml 文件
 */
export function GET(): Response {
	const title = siteContent.meta?.title || '2025 Blog'
	const description = siteContent.meta?.description || 'Latest updates from 2025 Blog'

	// 过滤无效数据并序列化所有博客条目
	const items = blogs
		.filter(item => item?.slug)
		.map(serializeItem)
		.join('')

	// RSS 2.0 模板
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

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate'
		}
	})
}
