import { motion } from 'motion/react' // 导入 motion 动画组件库
// 导入博客预览卡片组件
import { BlogPreview } from '@/components/blog-preview'
// 导入自定义 hook，用于组装待预览的文章数据
import { useWriteData } from '../hooks/use-write-data'
// 导入发布表单的类型定义
import type { PublishForm } from '../types'

// 预览组件接收的属性类型
type WritePreviewProps = {
	form: PublishForm          // 当前编辑的表单数据
	coverPreviewUrl: string | null // 封面预览图的临时 URL，可能为空
	onClose: () => void        // 关闭预览的回调
	slug?: string              // 文章 slug（可选，用于预览链接）
}

/**
 * 文章发布前预览组件
 * 展示最终呈现的博客卡片以及一个带动画的关闭按钮
 */
export function WritePreview({ form, coverPreviewUrl, onClose, slug }: WritePreviewProps) {
	// 获取实时计算的预览数据（markdown 解析结果、标题、日期等）
	const previewData = useWriteData()

	return (
		<div>
			{/*
			  阻止点击内容区域时冒泡到外层遮罩，
			  避免触发关闭（遮罩关闭逻辑由父组件处理）
			*/}
			<div onClick={e => e.stopPropagation()}>
				<BlogPreview
					markdown={previewData.markdown}       // 渲染后的 markdown 内容
					title={previewData.title}             // 文章标题
					tags={form.tags}                      // 标签列表，来自表单
					date={previewData.date}               // 发布日期
					summary={form.summary}                // 摘要，来自表单
					cover={coverPreviewUrl || undefined}   // 封面图（null 时转为 undefined）
					slug={slug}                            // 可选的文章标识
				/>
			</div>

			{/* 带动画的关闭按钮 */}
			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}    // 初始状态：透明且缩小
				animate={{ opacity: 1, scale: 1 }}       // 进入动画：完全显示
				whileHover={{ scale: 1.05 }}             // 悬停时轻微放大
				whileTap={{ scale: 0.95 }}               // 点击时轻微缩小
				className='absolute top-4 right-6 rounded-xl border bg-white/60 px-6 py-2 text-sm'
				onClick={onClose}                        // 点击触发关闭
			>
				关闭预览
			</motion.button>
		</div>
	)
}
