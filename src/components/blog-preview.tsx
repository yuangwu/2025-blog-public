'use client'

// 引入 framer-motion 的 motion 组件，用于页面动画效果
import { motion } from 'motion/react'
// 从项目常量配置中引入初始动画延迟时间（需确保该常量文件存在）
import { INIT_DELAY } from '@/consts'
// 自定义 Hook：将 Markdown 字符串转换为 HTML 内容并提取目录（需确保该 Hook 文件存在）
import { useMarkdownRender } from '@/hooks/use-markdown-render'
// 自定义 Hook：响应式获取当前屏幕尺寸（需确保该 Hook 文件存在）
import { useSize } from '@/hooks/use-size'
// 博客侧边栏组件，用于显示封面、摘要、目录和 slug 信息（需确保该组件文件存在）
import { BlogSidebar } from '@/components/blog-sidebar'
// 全局配置 store，用于获取站点配置（需确保该 store 文件存在且导出 useConfigStore）
import { useConfigStore } from '@/app/(home)/stores/config-store'

// 定义博客预览组件接收的属性类型
type BlogPreviewProps = {
	markdown: string    // 博客正文的 Markdown 原文字符串
	title: string       // 博客标题
	tags: string[]      // 标签数组
	date: string        // 发布日期
	summary?: string    // 摘要（可选）
	cover?: string      // 封面图片 URL（可选）
	slug?: string       // 博客唯一标识符（可选，用于侧边栏链接）
}

/**
 * 博客预览组件
 * 功能：渲染单篇博客的完整内容，包括标题、标签、日期、摘要、正文（Markdown 转 HTML）以及右侧侧边栏（非移动端）
 * 注意：依赖的常量、Hooks、子组件、Store 均需在项目中存在，否则 Vercel 构建会失败。
 *       请确保以下路径正确：
 *       - @/consts 导出 INIT_DELAY
 *       - @/hooks/use-markdown-render 导出 useMarkdownRender
 *       - @/hooks/use-size 导出 useSize
 *       - @/components/blog-sidebar 导出 BlogSidebar
 *       - @/app/(home)/stores/config-store 导出 useConfigStore
 */
export function BlogPreview({ markdown, title, tags, date, summary, cover, slug }: BlogPreviewProps) {
	// 获取当前是否为移动端（屏幕宽度小于 sm 断点）
	const { maxSM: isMobile } = useSize()
	// 调用 Markdown 解析 Hook，返回解析后的 HTML 内容(content)、目录结构(toc)和加载状态(loading)
	const { content, toc, loading } = useMarkdownRender(markdown)
	// 获取全局站点配置（zustand store）
	const { siteContent } = useConfigStore()
	// 判断是否需要在内容区域显示摘要（配置项默认为 false）
	const summaryInContent = siteContent.summaryInContent ?? false

	// 如果 Markdown 还在解析中，显示加载提示
	if (loading) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>渲染中...</div>
	}

	return (
		<div className='mx-auto flex max-w-[1140px] justify-center gap-6 px-6 pt-28 pb-12 max-sm:px-0'>
			{/* 文章主体区域，添加淡入动画效果 */}
			<motion.article
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: INIT_DELAY }}
				className='card bg-article static flex-1 overflow-auto rounded-xl p-8'>
				<div>
					{/* 文章标题 */}
					<div className='text-center text-2xl font-semibold'>{title}</div>

					{/* 标签列表，每个标签前加 # 号 */}
					<div className='text-secondary mt-4 flex flex-wrap items-center justify-center gap-3 px-8 text-center text-sm'>
						{tags.map(t => (
							<span key={t}>#{t}</span>
						))}
					</div>

					{/* 发布日期 */}
					<div className='text-secondary mt-3 text-center text-sm'>{date}</div>

					{/* 如果提供了摘要且配置允许在内容中显示，则展示带引号的摘要 */}
					{summary && summaryInContent && <div className='text-secondary mt-6 cursor-text text-center text-sm'>“{summary}”</div>}

					{/* Markdown 解析后的正文内容，使用 prose 类优化排版 */}
					<div className='prose mt-6 max-w-none cursor-text'>{content}</div>
				</div>
			</motion.article>

			{/* 非移动端时渲染侧边栏：传递封面、摘要、目录和 slug */}
			{!isMobile && <BlogSidebar cover={cover} summary={summary} toc={toc} slug={slug} />}
		</div>
	)
}
