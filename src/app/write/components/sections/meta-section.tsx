import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { TagInput } from '../ui/tag-input'
import { useCategories } from '@/hooks/use-categories'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { Select } from '@/components/select'

// 组件的 props 类型定义
type MetaSectionProps = {
	// 动画延迟时间（秒）
	delay?: number
}

/**
 * 元信息编辑区域组件
 * 包含摘要、标签、分类、日期和隐藏选项
 */
export function MetaSection({ delay = 0 }: MetaSectionProps) {
	// 从写作状态仓库获取表单数据和更新方法
	const { form, updateForm } = useWriteStore()
	// 输出当前表单中的日期值，用于调试
	console.log(form.date)

	// 获取可用分类列表（由 useCategories hook 提供）
	const { categories } = useCategories()
	// 获取站点全局配置
	const { siteContent } = useConfigStore()
	// 是否启用分类功能，默认不启用
	const enableCategories = siteContent.enableCategories ?? false

	// 构造分类选项，第一项为“未分类”，后续项为实际分类
	const categoryOptions = [
		{ value: '', label: '未分类' },
		...categories.map(cat => ({ value: cat, label: cat })),
	]

	return (
		// 使用 motion.div 实现淡入、缩放入场动画
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }}
			className='card relative'
		>
			<h2 className='text-sm'>元信息</h2>

			<div className='mt-3 space-y-2'>
				{/* 摘要输入框 */}
				<textarea
					placeholder='为这篇文章写一段简短摘要'
					rows={2}
					className='bg-card block w-full resize-none rounded-xl border p-3 text-sm'
					value={form.summary}
					onChange={e => updateForm({ summary: e.target.value })}
				/>

				{/* 标签输入组件，传入当前标签数组和更新回调 */}
				<TagInput
					tags={form.tags}
					onChange={tags => updateForm({ tags })}
				/>

				{/* 如果启用了分类功能，显示分类下拉选择 */}
				{enableCategories && (
					<Select
						className='w-full text-sm'
						value={form.category || ''}
						onChange={value => updateForm({ category: value })}
						options={categoryOptions}
					/>
				)}

				{/* 日期选择器 */}
				<input
					type='datetime-local'
					placeholder='日期'
					className='bg-card w-full rounded-lg border px-3 py-2 text-sm'
					value={form.date}
					onChange={e => {
						updateForm({ date: e.target.value })
					}}
				/>

				{/* 隐藏文章选项（仅管理员可见） */}
				<div className='flex items-center gap-2'>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						onChange={e => updateForm({ hidden: e.target.checked })}
						className='h-4 w-4 rounded border-gray-300'
					/>
					<label
						htmlFor='hidden-check'
						className='cursor-pointer text-sm text-gray-600 select-none'
					>
						隐藏此文章（仅管理员可见）
					</label>
				</div>
			</div>
		</motion.div>
	)
}
