// 仅导入类型 BlogConfig（编译后不会包含实际代码，减少打包体积）
import type { BlogConfig } from '@/app/blog/types'

// 重新导出 BlogConfig 类型，方便其他模块直接从当前文件引入
export type { BlogConfig } from '@/app/blog/types'

// 定义加载后博客的数据结构
export type LoadedBlog = {
	slug: string
	// 博客的唯一标识（slug）
	config: BlogConfig
	// 博客的配置对象（从 config.json 解析而来）
	markdown: string
	// 博客的 Markdown 正文内容
	cover?: string
	// 可选封面图，通常来自 config.cover
}

/**
 * 从 public/blogs/{slug} 目录加载博客数据
 * 该函数同时被浏览页面和编辑页面使用
 * @param slug - 博客的唯一标识
 * @returns 解析完成的博客数据，包括 slug、配置、Markdown 内容及封面
 */
export async function loadBlog(slug: string): Promise<LoadedBlog> {
	// slug 参数必须为真值，否则无法确定要加载哪个博客
	if (!slug) {
		throw new Error('Slug is required')
	}

	// 加载博客配置文件 config.json
	let config: BlogConfig = {}
	const configRes = await fetch(`/blogs/${encodeURIComponent(slug)}/config.json`)
	if (configRes.ok) {
		try {
			// 成功获取时尝试解析 JSON
			config = await configRes.json()
		} catch {
			// JSON 解析失败时回退为空对象，保证程序继续运行
			config = {}
		}
	}
	// 注意：如果 config.json 不存在（非 2xx），config 将保持初始的空对象
	// 这种设计允许博客在没有配置文件时仍能正常展示

	// 加载博客正文 Markdown 文件 index.md
	const mdRes = await fetch(`/blogs/${encodeURIComponent(slug)}/index.md`)
	if (!mdRes.ok) {
		// 若 Markdown 文件加载失败则认为博客不存在，抛出错误中断流程
		throw new Error('Blog not found')
	}
	const markdown = await mdRes.text()

	// 返回组装好的博客数据，cover 字段直接取自 config.cover
	return {
		slug,
		config,
		markdown,
		cover: config.cover
	}
}
