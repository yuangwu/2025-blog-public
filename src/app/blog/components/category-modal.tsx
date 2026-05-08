'use client'

import { useCallback, useMemo, useState, type DragEvent } from 'react'
import dayjs from 'dayjs'
import type { BlogIndexItem } from '@/hooks/use-blog-index'
import { DialogModal } from '@/components/dialog-modal'
import { Select } from '@/components/select'
import { X } from 'lucide-react'

// 分类管理弹窗的 props 类型定义
interface CategoryModalProps {
	open: boolean // 弹窗是否可见
	onClose: () => void // 关闭弹窗的回调
	categoryList: string[] // 当前已有分类列表
	newCategory: string // 新分类输入框的值
	onNewCategoryChange: (value: string) => void // 新分类输入变化回调
	onAddCategory: () => void // 新增分类的回调
	onRemoveCategory: (category: string) => void // 删除分类的回调
	onReorderCategories: (nextList: string[]) => void // 拖拽排序后更新分类列表的回调
	editableItems: BlogIndexItem[] // 需要分配分类的文章列表
	onAssignCategory: (slug: string, category?: string) => void // 为文章分配分类的回调
}

export function CategoryModal({
	open,
	onClose,
	categoryList,
	newCategory,
	onNewCategoryChange,
	onAddCategory,
	onRemoveCategory,
	onReorderCategories,
	editableItems,
	onAssignCategory
}: CategoryModalProps) {
	// 当前正在拖拽的元素的索引，null 表示没有拖拽
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

	// 下拉选择框的选项列表，第一项为“未分类”，后续为实际分类
	const categoryOptions = useMemo(
		() => [{ value: '', label: '未分类' }, ...categoryList.map(cat => ({ value: cat, label: cat }))],
		[categoryList]
	)

	// 拖拽开始：记录被拖拽项的索引
	const handleDragStart = useCallback((index: number) => {
		return () => {
			setDraggingIndex(index)
		}
	}, [])

	// 拖拽经过：阻止默认行为使元素可放置，并展示移动图标
	const handleDragOver = useCallback((index: number) => {
		return (event: DragEvent<HTMLSpanElement>) => {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
		}
	}, [])

	// 放置：重新排序分类列表
	const handleDrop = useCallback(
		(index: number) => {
			return (event: DragEvent<HTMLSpanElement>) => {
				event.preventDefault()
				// 如果拖拽索引无效或没有移动，不执行任何操作
				if (draggingIndex === null || draggingIndex === index) return

				// 从数组中移除被拖拽的项，并插入到目标位置
				const next = [...categoryList]
				const [moved] = next.splice(draggingIndex, 1)
				next.splice(index, 0, moved)
				onReorderCategories(next)
				setDraggingIndex(null)
			}
		},
		[categoryList, draggingIndex, onReorderCategories]
	)

	// 拖拽结束：清除拖拽状态
	const handleDragEnd = useCallback(() => {
		setDraggingIndex(null)
	}, [])

	return (
		// 使用弹窗组件包裹，设置宽度和样式
		<DialogModal open={open} onClose={onClose} className='card w-[720px] max-w-[90vw] rounded-2xl p-6'>
			{/* 顶部标题与关闭按钮 */}
			<div className='mb-4 flex items-center justify-between'>
				<div className='text-lg font-semibold'>文章分类</div>
				<button onClick={onClose} className='text-secondary hover:text-brand text-sm'>
					关闭
				</button>
			</div>

			<div className='space-y-4'>
				{/* 新增分类的输入区域 */}
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
					<input
						value={newCategory}
						onChange={e => onNewCategoryChange(e.target.value)}
						placeholder='输入分类名称'
						className='focus:border-brand w-full rounded-lg border px-3 py-2 text-sm outline-none'
					/>
					<button onClick={onAddCategory} className='brand-btn px-4 py-2 text-sm whitespace-nowrap'>
						新增分类
					</button>
				</div>

				{/* 分类标签展示与拖拽排序区域 */}
				<div className='flex flex-wrap gap-2 rounded-lg bg-white/60 p-3 text-sm'>
					{categoryList.length === 0 ? (
						<span className='text-secondary'>暂无分类</span>
					) : (
						categoryList.map((cat, index) => (
							<span
								key={cat}
								draggable // 使元素可拖拽
								onDragStart={handleDragStart(index)} // 开始拖拽
								onDragOver={handleDragOver(index)} // 覆盖拖拽区域
								onDrop={handleDrop(index)} // 放置
								onDragEnd={handleDragEnd} // 拖拽结束
								className={`bg-brand/10 flex cursor-move items-center gap-2 rounded-full border py-1 pr-1.5 pl-3 ${
									draggingIndex === index ? 'ring-brand/60 opacity-60 ring-1' : ''
								}`}>
								<span className='select-none'>{cat}</span>
								{/* 删除分类按钮 */}
								<button
									type='button'
									onClick={() => onRemoveCategory(cat)}
									className='text-secondary hover:text-brand inline-flex h-4 w-4 items-center justify-center'
									aria-label='Remove category'>
									<X className='h-3 w-3' />
								</button>
							</span>
						))
					)}
				</div>

				{/* 文章列表及其分类下拉选择区域 */}
				<div className='max-h-[360px] space-y-2 overflow-y-auto rounded-xl bg-white/60 p-3'>
					{editableItems.map(item => (
						<div
							key={item.slug}
							className='flex flex-col gap-2 rounded-lg border bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
							{/* 文章标题及日期 */}
							<div className='text-sm font-medium'>
								{item.title || item.slug}
								<span className='text-secondary ml-2 text-xs'>
									{/* 使用 dayjs 格式化文章日期 */}
									{dayjs(item.date).format('YYYY-MM-DD')}
								</span>
							</div>
							{/* 分类选择下拉框，绑定当前分类值，选择时触发分配 */}
							<Select
								value={item.category || ''}
								onChange={value => onAssignCategory(item.slug, value)}
								options={categoryOptions}
								className='w-full text-sm sm:w-[180px]'
							/>
						</div>
					))}
					{/* 无文章时的提示 */}
					{editableItems.length === 0 && <div className='text-secondary text-sm'>暂无文章</div>}
				</div>
			</div>
		</DialogModal>
	)
}
