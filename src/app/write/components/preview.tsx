import { motion } from 'motion/react'
import { BlogPreview } from '@/components/blog-preview'
import { useWriteData } from '../hooks/use-write-data'
import type { PublishForm } from '../types'

// 组件 Props 类型
type WritePreviewProps = {
	/** 写作表单数据，目前用于取 tags 和 summary */
	form: PublishForm
	/** 封面图片的预览 URL，为 null 时不显示封面 */
	coverPreviewUrl: string | null
	/** 关闭预览的回调，通常用于关闭弹窗/路由返回 */
	onClose: () => void
	/** 可选的文章 slug，用于预览跳转或标识 */
	slug?: string
}

/**
 * 写作页的文章预览弹窗组件
 * - 左侧/中央展示 BlogPreview 卡片
 * - 右上角有一个带动画的关闭按钮
 */
export function WritePreview({ form, coverPreviewUrl, onClose, slug }: WritePreviewProps) {
	// 通过 hook 获取实时预览所需的核心数据：markdown、title、date
	const previewData = useWriteData()

	return (
		<div>
			{/* 点击卡片内容区域时阻止事件冒泡，避免触发外层关闭逻辑（例如遮罩点击关闭） */}
			<div onClick={e => e.stopPropagation()}>
				<BlogPreview
					markdown={previewData.markdown}
					title={previewData.title}
					tags={form.tags}
					date={previewData.date}
					summary={form.summary}
					// 如果 coverPreviewUrl 为 null 则传 undefined，让 BlogPreview 使用默认占位
					cover={coverPreviewUrl || undefined}
					slug={slug}
				/>
			</div>

			{/* 带动画的关闭按钮，使用 motion/react 实现 */}
			<motion.button
				// 入场动画：从透明且缩小到正常
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				// 鼠标悬停时微微放大
				whileHover={{ scale: 1.05 }}
				// 点击时缩小反馈
				whileTap={{ scale: 0.95 }}
				// 样式：绝对定位在右上角，毛玻璃效果 + 圆角边框
				className="absolute top-4 right-6 rounded-xl border bg-white/60 px-6 py-2 text-sm"
				onClick={onClose}
			>
				关闭预览
			</motion.button>
		</div>
	)
}