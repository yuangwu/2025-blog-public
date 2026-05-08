// 导入 framer-motion 的 motion 组件，用于实现动画效果
import { motion } from 'motion/react'
// 引入写作页面的状态管理 store，通过 zustand 管理表单数据（标题、标签、摘要等）
import { useWriteStore } from '../../stores/write-store'
// 标签输入组件，支持添加/删除标签
import { TagInput } from '../ui/tag-input'
// 自定义 Hook，用于获取文章分类列表
import { useCategories } from '@/hooks/use-categories'
// 全局配置 store，获取站点级设置（如是否启用分类）
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 通用下拉选择组件
import { Select } from '@/components/select'

// 定义 MetaSection 组件的 props 类型
type MetaSectionProps = {
	delay?: number // 控制动画延迟时间（秒），默认 0
}

/**
 * 文章元信息编辑区域组件
 * 包含摘要、标签、分类、发布日期和是否隐藏的设置
 * @param delay 动画延迟，用于与其他元素错开入场动画
 */
export function MetaSection({ delay = 0 }: MetaSectionProps) {
	// 从写作 store 中获取当前表单数据及更新方法
	const { form, updateForm } = useWriteStore()
	// 临时调试日志，输出当前选择的日期
	console.log(form.date)

	// 获取所有可用的分类列表
	const { categories } = useCategories()
	// 获取站点配置内容
	const { siteContent } = useConfigStore()
	// 判断是否启用分类功能（若未配置则默认不启用）
	const enableCategories = siteContent.enableCategories ?? false

	// 构造分类下拉选项，第一项为“未分类”（值为空字符串）
	const categoryOptions = [{ value: '', label: '未分类' }, ...categories.map(cat => ({ value: cat, label: cat }))]

	return (
		// 使用 motion.div 实现带缩放和淡入的动画容器
		// initial：初始状态透明且缩小至 0.8
		// animate：动画结束状态为不透明且原始大小
		// transition：通过 delay 属性控制动画开始时间
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className='card relative'>
			{/* 区域标题 */}
			<h2 className='text-sm'>元信息</h2>

			<div className='mt-3 space-y-2'>
				{/* 摘要输入框，多行文本，可调整高度被禁用 (resize-none) */}
				<textarea
					placeholder='为这篇文章写一段简短摘要'
					rows={2}
					className='bg-card block w-full resize-none rounded-xl border p-3 text-sm'
					value={form.summary}
					// 输入时同步更新 store 中的 summary 字段
					onChange={e => updateForm({ summary: e.target.value })}
				/>

				{/* 标签输入组件，传入当前标签数组和更新回调 */}
				<TagInput tags={form.tags} onChange={tags => updateForm({ tags })} />

				{/* 仅在站点启用了分类时显示分类选择器 */}
				{enableCategories && (
					<Select
						className='w-full text-sm'
						value={form.category || ''}
						// 选项变化时更新 store 中的 category
						onChange={value => updateForm({ category: value })}
						options={categoryOptions}
					/>
				)}

				{/* 日期时间选择器，用于设置文章的发布时间 */}
				<input
					type='datetime-local'
					placeholder='日期'
					className='bg-card w-full rounded-lg border px-3 py-2 text-sm'
					value={form.date}
					onChange={e => {
						updateForm({ date: e.target.value })
					}}
				/>

				{/* 隐藏文章选项：勾选后仅管理员可见 */}
				<div className='flex items-center gap-2'>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						// 切换时更新 hidden 字段
						onChange={e => updateForm({ hidden: e.target.checked })}
						className='h-4 w-4 rounded border-gray-300'
					/>
					<label htmlFor='hidden-check' className='cursor-pointer text-sm text-gray-600 select-none'>
						隐藏此文章（仅管理员可见）
					</label>
				</div>
			</div>
		</motion.div>
	)
}