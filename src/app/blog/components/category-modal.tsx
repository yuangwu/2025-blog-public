// 标记这是一个 Next.js 客户端组件（必须在组件顶部声明）
'use client'

// 从 React 导入必要的钩子和类型
import { useCallback, useMemo, useState, type DragEvent } from 'react'
// 导入 dayjs 用于日期格式化
import dayjs from 'dayjs'
// 导入自定义类型：博客文章索引项
import type { BlogIndexItem } from '@/hooks/use-blog-index'
// 导入自定义组件：对话框模态框
import { DialogModal } from '@/components/dialog-modal'
// 导入自定义组件：选择器
import { Select } from '@/components/select'
// 导入 lucide-react 图标库的关闭图标
import { X } from 'lucide-react'

// 定义组件的 Props 类型接口
interface CategoryModalProps {
	open: boolean
	// 控制模态框显示/隐藏
	onClose: () => void
	// 关闭模态框的回调函数
	categoryList: string[]
	// 现有分类列表
	newCategory: string
	// 新增分类的输入值
	onNewCategoryChange: (value: string) => void
	// 新增分类输入变化的回调
	onAddCategory: () => void
	// 点击「新增分类」的回调
	onRemoveCategory: (category: string) => void
	// 删除分类的回调
	onReorderCategories: (nextList: string[]) => void
	// 分类拖拽排序后的回调
	editableItems: BlogIndexItem[]
	// 可分配分类的文章列表
	onAssignCategory: (slug: string, category?: string) => void
	// 为文章分配分类的回调
}

// 导出分类管理模态框组件
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
	// 状态：当前正在拖拽的分类索引（null 表示未拖拽）
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

	// 使用 useMemo 缓存分类选项（避免重复计算）
	// 格式：[{ value: '', label: '未分类' }, { value: '技术', label: '技术' }, ...]
	const categoryOptions = useMemo(
		() => [{ value: '', label: '未分类' }, ...categoryList.map(cat => ({ value: cat, label: cat }))],
		[categoryList]  // 依赖项：categoryList 变化时重新计算
	)

	// 处理「拖拽开始」事件（useCallback 缓存函数，避免子组件重渲染）
	const handleDragStart = useCallback((index: number) => {
		return () => {
			setDraggingIndex(index)  // 记录当前拖拽的分类索引
		}
	}, [])

	// 处理「拖拽经过」事件（必须 preventDefault 才能触发 drop）
	const handleDragOver = useCallback((index: number) => {
		return (event: DragEvent<HTMLSpanElement>) => {
			event.preventDefault()
			// 阻止默认行为（允许放置）
			event.dataTransfer.dropEffect = 'move'
			// 设置拖拽效果为「移动」
		}
	}, [])

	// 处理「拖拽放置」事件（核心：实现分类排序逻辑）
	const handleDrop = useCallback(
		(index: number) => {
			return (event: DragEvent<HTMLSpanElement>) => {
				event.preventDefault()
				// 如果未拖拽或拖拽到自身位置，直接返回
				if (draggingIndex === null || draggingIndex === index) return

				// 复制分类列表（避免直接修改原数组）
				const next = [...categoryList]
				// 从原位置删除拖拽的分类（splice 返回被删除的元素数组）
				const [moved] = next.splice(draggingIndex, 1)
				// 将拖拽的分类插入到新位置
				next.splice(index, 0, moved)
				// 调用父组件回调，更新排序后的分类列表
				onReorderCategories(next)
				// 重置拖拽状态
				setDraggingIndex(null)
			}
		},
		[categoryList, draggingIndex, onReorderCategories]
		// 依赖项
	)

	// 处理「拖拽结束」事件（无论是否成功放置，都重置拖拽状态）
	const handleDragEnd = useCallback(() => {
		setDraggingIndex(null)
	}, [])

	// 渲染模态框 UI
	return (
		<DialogModal open={open} onClose={onClose} className='card w-[720px] max-w-[90vw] rounded-2xl p-6'>
			{/* 模态框头部：标题 + 关闭按钮 */}
			<div className='mb-4 flex items-center justify-between'>
				<div className='text-lg font-semibold'>文章分类</div>
				<button onClick={onClose} className='text-secondary hover:text-brand text-sm'>
					关闭
				</button>
			</div>

			{/* 主体内容区 */}
			<div className='space-y-4'>
				{/* 新增分类区域：输入框 + 按钮 */}
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

				{/* 分类列表区域：支持拖拽排序 + 删除 */}
				<div className='flex flex-wrap gap-2 rounded-lg bg-white/60 p-3 text-sm'>
					{/* 无分类时的提示 */}
					{categoryList.length === 0 ? (
						<span className='text-secondary'>暂无分类</span>
					) : (
						// 遍历渲染分类标签
						categoryList.map((cat, index) => (
							<span
								key={cat}
								draggable
								// 允许拖拽
								onDragStart={handleDragStart(index)}
								// 拖拽开始
								onDragOver={handleDragOver(index)}
								// 拖拽经过
								onDrop={handleDrop(index)}
								// 拖拽放置
								onDragEnd={handleDragEnd}
								// 拖拽结束
								// 动态样式：拖拽中时添加半透明和边框效果
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

				{/* 文章列表区域：为每篇文章分配分类 */}
				<div className='max-h-[360px] space-y-2 overflow-y-auto rounded-xl bg-white/60 p-3'>
					{/* 遍历渲染可分配分类的文章 */}
					{editableItems.map(item => (
						<div key={item.slug} className='flex flex-col gap-2 rounded-lg border bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
							{/* 文章标题 + 日期 */}
							<div className='text-sm font-medium'>
								{item.title || item.slug}
								<span className='text-secondary ml-2 text-xs'>{dayjs(item.date).format('YYYY-MM-DD')}</span>
							</div>
							{/* 分类选择器 */}
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
