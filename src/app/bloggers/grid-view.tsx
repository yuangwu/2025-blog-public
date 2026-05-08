'use client'

import { useCallback, useMemo, useState, type DragEvent } from 'react'
import dayjs from 'dayjs'
import type { BlogIndexItem } from '@/hooks/use-blog-index'
import { DialogModal } from '@/components/dialog-modal'
import { Select } from '@/components/select'
import { X } from 'lucide-react'

// 分类管理弹窗的 props 类型定义
interface CategoryModalProps {
	open: boolean // 控制弹窗显示/隐藏
	onClose: () => void // 关闭弹窗的回调函数
	categoryList: string[] // 当前所有分类的数组
	newCategory: string // 新分类输入框的受控值
	onNewCategoryChange: (value: string) => void // 新分类输入变化时的回调
	onAddCategory: () => void // 点击“新增分类”按钮的回调
	onRemoveCategory: (category: string) => void // 删除某个分类的回调
	onReorderCategories: (nextList: string[]) => void // 拖拽排序完成后更新分类列表的回调
	editableItems: BlogIndexItem[] // 可分配分类的文章列表
	onAssignCategory: (slug: string, category?: string) => void // 为指定文章分配分类（或取消分类）
}

/**
 * 分类管理弹窗组件
 * 提供分类的增、删、拖拽排序，以及为文章分配分类的功能
 */
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
	// 记录当前正在拖拽的元素的索引，null 表示没有在拖拽
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

	// 分类下拉选项列表：第一项固定为“未分类”，后续项来自 categoryList
	const categoryOptions = useMemo(
		() => [{ value: '', label: '未分类' }, ...categoryList.map(cat => ({ value: cat, label: cat }))],
		[categoryList]
	)

	// 拖拽开始事件处理
	const handleDragStart = useCallback((index: number) => {
		return () => {
			setDraggingIndex(index) // 设置当前拖拽项的索引
		}
	}, [])

	// 拖拽经过事件处理：阻止默认行为以允许放置，并设置光标为移动图标
	const handleDragOver = useCallback((index: number) => {
		return (event: DragEvent<HTMLSpanElement>) => {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
		}
	}, [])

	// 放置事件处理：将拖拽的分类插入到新位置，并调用回调更新列表
	const handleDrop = useCallback(
		(index: number) => {
			return (event: DragEvent<HTMLSpanElement>) => {
				event.preventDefault()
				// 如果没有拖拽项或拖拽到了自身的位置，直接返回
				if (draggingIndex === null || draggingIndex === index) return

				// 深拷贝分类数组，移动被拖拽项到目标位置
				const next = [...categoryList]
				const [moved] = next.splice(draggingIndex, 1)
				next.splice(index, 0, moved)
				onReorderCategories(next) // 通知父组件更新分类顺序
				setDraggingIndex(null) // 清除拖拽状态
			}
		},
		[categoryList, draggingIndex, onReorderCategories]
	)

	// 拖拽结束事件处理：重置拖拽状态
	const handleDragEnd = useCallback(() => {
		setDraggingIndex(null)
	}, [])

	return (
		// DialogModal 为项目内部的弹窗容器组件
		<DialogModal open={open} onClose={onClose} className='card w-[720px] max-w-[90vw] rounded-2xl p-6'>
			{/* 头部：标题和关闭按钮 */}
			<div className='mb-4 flex items-center justify-between'>
				<div className='text-lg font-semibold'>文章分类</div>
				<button onClick={onClose} className='text-secondary hover:text-brand text-sm'>
					关闭
				</button>
			</div>

			<div className='space-y-4'>
				{/* 新增分类区域 */}
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

				{/* 分类标签展示区，支持拖拽排序 */}
				<div className='flex flex-wrap gap-2 rounded-lg bg-white/60 p-3 text-sm'>
					{categoryList.length === 0 ? (
						<span className='text-secondary'>暂无分类</span>
					) : (
						categoryList.map((cat, index) => (
							<span
								key={cat}
								draggable // 使元素可拖拽
								onDragStart={handleDragStart(index)} // 开始拖拽
								onDragOver={handleDragOver(index)} // 拖拽悬浮
								onDrop={handleDrop(index)} // 放置
								onDragEnd={handleDragEnd} // 拖拽结束
								className={`bg-brand/10 flex cursor-move items-center gap-2 rounded-full border py-1 pr-1.5 pl-3 ${
									draggingIndex === index ? 'ring-brand/60 opacity-60 ring-1' : ''
								}`}
							>
								<span className='select-none'>{cat}</span>
								{/* 删除当前分类的按钮 */}
								<button
									type='button'
									onClick={() => onRemoveCategory(cat)}
									className='text-secondary hover:text-brand inline-flex h-4 w-4 items-center justify-center'
									aria-label='Remove category'
								>
									<X className='h-3 w-3' />
								</button>
							</span>
						))
					)}
				</div>

				{/* 文章列表及分类分配下拉框 */}
				<div className='max-h-[360px] space-y-2 overflow-y-auto rounded-xl bg-white/60 p-3'>
					{editableItems.map(item => (
						<div
							key={item.slug}
							className='flex flex-col gap-2 rounded-lg border bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between'
						>
							{/* 文章标题与发布日期 */}
							<div className='text-sm font-medium'>
								{item.title || item.slug}
								<span className='text-secondary ml-2 text-xs'>
									{/* 使用 dayjs 格式化日期，格式为 YYYY-MM-DD */}
									{dayjs(item.date).format('YYYY-MM-DD')}
								</span>
							</div>
							{/* 分类选择下拉组件，绑定当前文章的分类，选中后调用 onAssignCategory */}
							<Select
								value={item.category || ''}
								onChange={value => onAssignCategory(item.slug, value)}
								options={categoryOptions}
								className='w-full text-sm sm:w-[180px]'
							/>
						</div>
					))}
					{/* 无文章时的占位提示 */}
					{editableItems.length === 0 && <div className='text-secondary text-sm'>暂无文章</div>}
				</div>
			</div>
		</DialogModal>
	)
}
