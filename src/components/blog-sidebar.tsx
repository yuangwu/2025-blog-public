'use client'

import { motion } from 'motion/react'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import LikeButton from '@/components/like-button'
import { BlogToc } from '@/components/blog-toc'
import { ScrollTopButton } from '@/components/scroll-top-button'
import { useConfigStore } from '@/app/(home)/stores/config-store'

// 目录项的类型定义
type TocItem = {
	id: string
	text: string
	level: number
}

// 博客侧边栏组件的属性类型
type BlogSidebarProps = {
	cover?: string       // 封面图片URL
	summary?: string     // 文章摘要文本
	toc: TocItem[]       // 目录项列表
	slug?: string        // 文章唯一标识，用于点赞等功能
}

/**
 * 博客侧边栏组件
 * 在桌面端显示文章的封面、摘要、目录、点赞和返回顶部按钮
 * 移动端会隐藏（max-sm:hidden）
 */
export function BlogSidebar({ cover, summary, toc, slug }: BlogSidebarProps) {
	const { siteContent } = useConfigStore()
	// 从全局配置中获取是否在正文中展现摘要，若 siteContent 未加载则默认 false
	const summaryInContent = siteContent?.summaryInContent ?? false

	return (
		<div
			className='sticky flex w-[200px] shrink-0 flex-col items-start gap-4 self-start max-sm:hidden'
			style={{ top: 24 }} // 距离顶部 24px 固定定位
		>
			{/* 封面区域：当传入 cover 时显示，带有渐入 + 缩放动画 */}
			{cover && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 1 }}
					className='bg-card w-full rounded-xl border p-3'
				>
					<img
						src={cover}
						alt='封面图片'
						className='h-auto w-full rounded-xl border object-cover'
					/>
				</motion.div>
			)}

			{/* 摘要区域：仅在提供了摘要且全局配置未要求在正文显示摘要时渲染 */}
			{summary && !summaryInContent && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 2 }}
					className='bg-card w-full rounded-xl border p-3 text-sm'
				>
					<h2 className='text-secondary mb-2 font-medium'>摘要</h2>
					<div className='text-secondary scrollbar-none max-h-[240px] cursor-text overflow-auto'>
						{summary}
					</div>
				</motion.div>
			)}

			{/* 文章目录 */}
			<BlogToc toc={toc} delay={INIT_DELAY + ANIMATION_DELAY * 3} />

			{/* 点赞按钮 */}
			<LikeButton slug={slug} delay={INIT_DELAY + ANIMATION_DELAY * 4} />

			{/* 返回顶部按钮 */}
			<ScrollTopButton delay={INIT_DELAY + ANIMATION_DELAY * 5} />
		</div>
	)
}
