import { MetadataRoute } from 'next'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'

// 强制静态生成（不依赖请求时数据），适合在构建时预渲染 sitemap
export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// 域名优先级配置（适配 Vercel 部署）：
	// 1. SITE_URL：你在 Vercel 环境变量中手动设置的正式域名（如 https://www.example.com）
	// 2. VERCEL_URL：Vercel 自动为每次部署生成的预览域名（不带协议，需手动补 https://）
	// 3. 本地开发回退地址
	const baseUrl = process.env.SITE_URL
		? process.env.SITE_URL
		: process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: 'http://localhost:3000'

	console.log(`[Sitemap] Generating for: ${baseUrl}`)

	// 从 JSON 索引中获取所有博客文章数据
	let posts: BlogIndexItem[] = blogIndex

	// 为每篇文章生成 sitemap 条目
	const postEntries: MetadataRoute.Sitemap = posts.map(post => ({
		url: `${baseUrl}/blog/${post.slug}`,
		lastModified: post.date ? new Date(post.date) : new Date(),
		changeFrequency: 'weekly',
		priority: 0.8
	}))

	// 静态页面条目（目前仅包含首页）
	const staticEntries: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1
		}
	]

	// 合并并返回所有 sitemap 条目
	return [...staticEntries, ...postEntries]
}
