// 声明该组件为客户端组件，确保 Next.js 在客户端执行（使用浏览器 API 和动画库）
'use client'

// 导入 motion 动画组件，用于实现入场动画效果
import { motion } from 'motion/react'
// 导入动画相关的时间常量，用于控制各元素动画的延时
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
// 导入点赞按钮组件
import LikeButton from '@/components/like-button'
// 导入博客文章目录组件
import { BlogToc } from '@/components/blog-toc'
// 导入滚动到顶部的按钮组件
import { ScrollTopButton } from '@/components/scroll-top-button'
// 导入配置状态管理 hook，获取站点全局配置
import { useConfigStore } from '@/app/(home)/stores/config-store'

// 定义目录项的类型结构
type TocItem = {
	id: string // 标题的唯一标识（通常用于锚点）
	text: string // 标题文本内容
	level: number // 标题层级（1-6）
}

// 定义 BlogSidebar 组件的属性类型
type BlogSidebarProps = {
	cover?: string // 可选的封面图片 URL
	summary?: string // 可选的摘要文本内容
	toc: TocItem[] // 文章目录数据，由多个 TocItem 组成
	slug?: string // 可选的文章唯一标识（用于点赞等交互）
}

// 导出博客侧边栏组件，接收封面、摘要、目录和标识作为参数
export function BlogSidebar({ cover, summary, toc, slug }: BlogSidebarProps) {
	// 从全局配置 store 中获取站点内容配置
	const { siteContent } = useConfigStore()
	// 如果配置中未明确设置 summaryInContent，则默认为 false
	// summaryInContent 为 true 时，摘要会在正文中展示，侧边栏不再重复显示
	const summaryInContent = siteContent.summaryInContent ?? false

	return (
		// 侧边栏容器，使用 sticky 定位，在移动端（max-sm）隐藏
		// 固定宽度 200px，不可收缩，纵向弹性布局，顶部间距 24px
		<div
			className='sticky flex w-[200px] shrink-0 flex-col items-start gap-4 self-start max-sm:hidden'
			style={{ top: 24 }}
		>
			{/* 如果有封面图片，则渲染带动画的封面区域 */}
			{cover && (
				<motion.div
					// 初始状态：透明且缩小为 0.8 倍
					initial={{ opacity: 0, scale: 0.8 }}
					// 动画结束状态：完全显示且恢复正常大小
					animate={{ opacity: 1, scale: 1 }}
					// 过渡延时：基础初始延时 + 第一个动画延时
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 1 }}
					// 容器样式：卡片背景、圆角、边框、内边距
					className='bg-card w-full rounded-xl border p-3'
				>
					{/* 封面图片，自适应宽度，圆角边框 */}
					<img
						src={cover}
						alt='cover'
						className='h-auto w-full rounded-xl border object-cover'
					/>
				</motion.div>
			)}

			{/* 如果有摘要，并且未配置在正文中显示摘要，则渲染摘要区域 */}
			{summary && !summaryInContent && (
				<motion.div
					// 摘要的动画初始和结束状态与封面类似
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					// 摘要的动画排在封面之后，使用第二个动画延时
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 2 }}
					// 摘要容器样式，文字大小较小
					className='bg-card w-full rounded-xl border p-3 text-sm'
				>
					{/* 摘要标题，使用次级文本颜色，加粗显示 */}
					<h2 className='text-secondary mb-2 font-medium'>摘要</h2>
					{/* 摘要文本区域，限制最大高度并可滚动，隐藏滚动条，允许文本选中 */}
					<div className='text-secondary scrollbar-none max-h-[240px] cursor-text overflow-auto'>
						{summary}
					</div>
				</motion.div>
			)}

			{/* 目录组件，传入目录数据和递增的延时，使其依次出现 */}
			<BlogToc toc={toc} delay={INIT_DELAY + ANIMATION_DELAY * 3} />

			{/* 点赞按钮，传入文章标识和转换为毫秒的延时（注意这里 delay 属性可能是毫秒单位） */}
			<LikeButton
				slug={slug}
				delay={(INIT_DELAY + ANIMATION_DELAY * 4) * 1000}
			/>

			{/* 回到顶部按钮，按顺序延迟出现 */}
			<ScrollTopButton delay={INIT_DELAY + ANIMATION_DELAY * 5} />
		</div>
	)
}