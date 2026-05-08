// 声明这是一个客户端组件（Next.js App Router），仅在浏览器端运行
'use client'

import { motion } from 'motion/react'
import { INIT_DELAY } from '@/consts'
import { useMarkdownRender } from '@/hooks/use-markdown-render'
import { useSize } from '@/hooks/use-size'
import { BlogSidebar } from '@/components/blog-sidebar'
import { useConfigStore } from '@/app/(home)/stores/config-store'

// 博客预览组件的 Props 类型定义
type BlogPreviewProps = {
	markdown: string
	// Markdown 原始字符串
	title: string
	// 文章标题
	tags: string[]
	// 标签列表
	date: string
	// 发布日期字符串
	summary?: string
	// 文章摘要（可选）
	cover?: string
	// 封面图片地址（可选）
	slug?: string
	// 文章唯一标识（可选）
}

// 博客预览组件：展示文章的主体内容、标签、日期以及可选侧边栏
export function BlogPreview({ markdown, title, tags, date, summary, cover, slug }: BlogPreviewProps) {
	// 获取是否处于移动端视口（通过 maxSM 断点判断）
	const { maxSM: isMobile } = useSize()
	// 解析 Markdown，返回渲染后的 React 内容、目录和加载状态
	const { content, toc, loading } = useMarkdownRender(markdown)
	// 从全局配置中获取站点内容设置
	const { siteContent } = useConfigStore()
	// 决定是否在正文区域内展示摘要（由站点配置控制）
	const summaryInContent = siteContent.summaryInContent ?? false

	// 如果 Markdown 仍在解析渲染，显示加载提示
	if (loading) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>渲染中...</div>
	}

	// 主渲染内容
	return (
		// 外层容器：居中、最大宽度 1140px，水平内边距与顶部留白
		<div className='mx-auto flex max-w-[1140px] justify-center gap-6 px-6 pt-28 pb-12 max-sm:px-0'>
			{/* 文章主体区域，使用 framer-motion 实现淡入动画 */}
			<motion.article
				initial={{ opacity: 0 }}
				// 动画初始状态：透明
				animate={{ opacity: 1 }}
				// 动画结束状态：完全可见
				transition={{ delay: INIT_DELAY }}
				// 动画延迟，使用全局定义的延迟常量
				className='card bg-article static flex-1 overflow-auto rounded-xl p-8'
			>
				<div>
					{/* 文章标题 */}
					<div className='text-center text-2xl font-semibold'>{title}</div>

					{/* 标签行，每个标签前添加 # 号 */}
					<div className='text-secondary mt-4 flex flex-wrap items-center justify-center gap-3 px-8 text-center text-sm'>
						{tags.map(t => (
							<span key={t}>#{t}</span>
						))}
					</div>

					{/* 发布日期 */}
					<div className='text-secondary mt-3 text-center text-sm'>{date}</div>

					{/* 如果启用了“正文内显示摘要”，则渲染摘要文字 */}
					{summary && summaryInContent && (
						<div className='text-secondary mt-6 cursor-text text-center text-sm'>“{summary}”</div>
					)}

					{/* Markdown 渲染后的正文内容，采用 prose 排版样式 */}
					<div className='prose mt-6 max-w-none cursor-text'>{content}</div>
				</div>
			</motion.article>

			{/* 非移动端时，显示侧边栏（包含封面、摘要、目录等） */}
			{!isMobile && <BlogSidebar cover={cover} summary={summary} toc={toc} slug={slug} />}
		</div>
	)
}
