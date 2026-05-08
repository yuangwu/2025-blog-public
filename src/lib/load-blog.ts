import type { BlogConfig } from '@/app/blog/types' // 导入 BlogConfig 类型，需确保此文件存在且别名配置正确

export type { BlogConfig } from '@/app/blog/types' // 重新导出 BlogConfig 类型供外部使用

export type LoadedBlog = { // 定义加载后的博客数据结构
	slug: string
	config: BlogConfig
	markdown: string
	cover?: string
}

/**
 * 从 public/blogs/{slug} 加载博客数据
 * 同时用于查看页面和编辑页面
 * @param slug 博客的唯一标识
 * @returns 包含博客配置、Markdown 内容等信息的 LoadedBlog 对象
 */
export async function loadBlog(slug: string): Promise<LoadedBlog> {
	if (!slug) {
		throw new Error('Slug 参数不能为空') // slug 必须提供
	}

	// 加载 config.json 配置文件（可选）
	let config: BlogConfig = {} // 默认为空对象
	const configRes = await fetch(`/blogs/${encodeURIComponent(slug)}/config.json`)
	if (configRes.ok) {
		try {
			config = await configRes.json() // 解析 JSON 配置
		} catch {
			config = {} // 解析失败时使用默认空对象
		}
	}

	// 加载 index.md 文件（必须存在）
	const mdRes = await fetch(`/blogs/${encodeURIComponent(slug)}/index.md`)
	if (!mdRes.ok) {
		throw new Error('博客未找到') // 如果 index.md 不存在或获取失败，抛出错误
	}
	const markdown = await mdRes.text() // 读取 Markdown 文本内容

	return {
		slug,
		config,
		markdown,
		cover: config.cover // 封面图来自配置
	}
}
