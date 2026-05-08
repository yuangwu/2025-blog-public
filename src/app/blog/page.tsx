'use client'

// -- 外部依赖 --
import Link from 'next/link'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear' // 按周分组时用到
import { motion } from 'motion/react'

dayjs.extend(weekOfYear) // 启用 “一年中的第几周” 插件
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

// -- 项目常量 --
import { INIT_DELAY } from '@/consts' // 初始动画延迟

// -- SVG 资源 --
import ShortLineSVG from '@/svgs/short-line.svg'
import JuejinSVG from '@/svgs/juejin.svg'

// -- 自定义 hooks --
import { useBlogIndex, type BlogIndexItem } from '@/hooks/use-blog-index' // 文章索引列表
import { useCategories } from '@/hooks/use-categories' // 服务端已有分类列表
import { useReadArticles } from '@/hooks/use-read-articles' // 已读文章标记
import { useAuthStore } from '@/hooks/use-auth' // 鉴权状态 & 设置私钥
import { useConfigStore } from '@/app/(home)/stores/config-store' // 站点内容配置

// -- 工具与类型 --
import { readFileAsText } from '@/lib/file-utils' // 客户端读取文件
import { cn } from '@/lib/utils'

// -- 保存编辑的服务方法 --
import { saveBlogEdits } from './services/save-blog-edits'

// -- 图标与子组件 --
import { Check } from 'lucide-react'
import { BlogCoverHoverPreview, useBlogCoverHover } from './components/blog-cover-hover'
import { CategoryModal } from './components/category-modal'

// 展示模式：按天/周/月/年/分类
type DisplayMode = 'day' | 'week' | 'month' | 'year' | 'category'

export default function BlogPage() {
	// ---------- 全局数据 ----------
	const { items, loading } = useBlogIndex()
	const { categories: categoriesFromServer } = useCategories()
	const { isRead } = useReadArticles()
	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false
	const enableCategories = siteContent.enableCategories ?? false

	// ---------- 本地状态 ----------
	const keyInputRef = useRef<HTMLInputElement>(null) // 用于调起密钥文件选择
	const [editMode, setEditMode] = useState(false) // 是否处于编辑模式
	const [editableItems, setEditableItems] = useState<BlogIndexItem[]>([]) // 编辑模式下的可修改文章列表
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set()) // 编辑模式中选中的文章 slug
	const [saving, setSaving] = useState(false) // 是否正在保存
	const [displayMode, setDisplayMode] = useState<DisplayMode>('year') // 当前展示维度
	const [categoryModalOpen, setCategoryModalOpen] = useState(false) // 分类管理弹窗
	const [categoryList, setCategoryList] = useState<string[]>([]) // 当前维护的分类列表
	const [newCategory, setNewCategory] = useState('') // 新增分类输入值

	// 封面预览 hook（编辑模式下隐藏预览）
	const { cancelCoverPreview, onCoverLinkMouseEnter, hoverCoverPreview, mousePosition } = useBlogCoverHover(editMode)

	// ---------- 副作用 ----------
	// 退出编辑模式时重置 editableItems 为原始 items
	useEffect(() => {
		if (!editMode) {
			setEditableItems(items)
		}
	}, [items, editMode])

	// 同步服务端分类到本地 categoryList
	useEffect(() => {
		setCategoryList(categoriesFromServer || [])
	}, [categoriesFromServer])

	// 最终显示用的文章列表：编辑模式用可编辑版本，否则用原始数据
	const displayItems = editMode ? editableItems : items

	// ---------- 分组逻辑（根据 displayMode 对文章分组并排序）----------
	const { groupedItems, groupKeys, getGroupLabel } = useMemo(() => {
		// 按日期倒序复制一份
		const sorted = [...displayItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

		// 按当前展示维度归类
		const grouped = sorted.reduce(
			(acc, item) => {
				let key: string
				let label: string
				const date = dayjs(item.date)

				switch (displayMode) {
					case 'category':
						key = item.category || '未分类'
						label = key
						break
					case 'day':
						key = date.format('YYYY-MM-DD')
						label = date.format('YYYY年MM月DD日')
						break
					case 'week':
						const week = date.week()
						key = `${date.format('YYYY')}-W${week.toString().padStart(2, '0')}`
						label = `${date.format('YYYY')}年第${week}周`
						break
					case 'month':
						key = date.format('YYYY-MM')
						label = date.format('YYYY年MM月')
						break
					case 'year':
					default:
						key = date.format('YYYY')
						label = date.format('YYYY年')
						break
				}

				if (!acc[key]) {
					acc[key] = { items: [], label }
				}
				acc[key].items.push(item)
				return acc
			},
			{} as Record<string, { items: BlogIndexItem[]; label: string }>
		)

		// 对分组进行排序
		const keys = Object.keys(grouped).sort((a, b) => {
			if (displayMode === 'category') {
				// 分类按 categoryList 中的顺序排列，未在列表中的排最后
				const categoryOrder = new Map(categoryList.map((c, index) => [c, index]))
				const aOrder = categoryOrder.has(a) ? categoryOrder.get(a)! : Number.MAX_SAFE_INTEGER
				const bOrder = categoryOrder.has(b) ? categoryOrder.get(b)! : Number.MAX_SAFE_INTEGER
				if (aOrder !== bOrder) return aOrder - bOrder
				return a.localeCompare(b)
			}
			// 时间维度：统一按时间倒序
			if (displayMode === 'week') {
				// 周格式：YYYY-WW
				const [yearA, weekA] = a.split('-W').map(Number)
				const [yearB, weekB] = b.split('-W').map(Number)
				if (yearA !== yearB) return yearB - yearA
				return weekB - weekA
			}
			return b.localeCompare(a)
		})

		return {
			groupedItems: grouped,
			groupKeys: keys,
			getGroupLabel: (key: string) => grouped[key]?.label || key
		}
	}, [displayItems, displayMode, categoryList])

	// ---------- 编辑模式相关操作 ----------
	const selectedCount = selectedSlugs.size
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 打开/关闭编辑模式
	const toggleEditMode = useCallback(() => {
		if (editMode) {
			setEditMode(false)
			setEditableItems(items)
			setSelectedSlugs(new Set())
		} else {
			setEditableItems(items)
			setEditMode(true)
		}
	}, [editMode, items])

	// 切换单篇文章选中状态
	const toggleSelect = useCallback((slug: string) => {
		setSelectedSlugs(prev => {
			const next = new Set(prev)
			if (next.has(slug)) {
				next.delete(slug)
			} else {
				next.add(slug)
			}
			return next
		})
	}, [])

	// 全选所有文章
	const handleSelectAll = useCallback(() => {
		setSelectedSlugs(new Set(editableItems.map(item => item.slug)))
	}, [editableItems])

	// 全选/取消全选某个分组
	const handleSelectGroup = useCallback(
		(groupKey: string) => {
			const group = groupedItems[groupKey]
			if (!group) return

			// 检查该分组是否所有文章都已选中
			const allSelected = group.items.every(item => selectedSlugs.has(item.slug))

			setSelectedSlugs(prev => {
				const next = new Set(prev)
				if (allSelected) {
					// 如果已全选，则取消该分组的选择
					group.items.forEach(item => {
						next.delete(item.slug)
					})
				} else {
					// 如果未全选，则全选该分组
					group.items.forEach(item => {
						next.add(item.slug)
					})
				}
				return next
			})
		},
		[groupedItems, selectedSlugs]
	)

	// 取消全选
	const handleDeselectAll = useCallback(() => {
		setSelectedSlugs(new Set())
	}, [])

	// 文章条目点击（编辑模式下阻止跳转并选中）
	const handleItemClick = useCallback(
		(event: React.MouseEvent, slug: string) => {
			if (!editMode) return
			event.preventDefault()
			event.stopPropagation()
			toggleSelect(slug)
		},
		[editMode, toggleSelect]
	)

	// 删除选中的文章
	const handleDeleteSelected = useCallback(() => {
		if (selectedCount === 0) {
			toast.info('请选择要删除的文章')
			return
		}
		setEditableItems(prev => prev.filter(item => !selectedSlugs.has(item.slug)))
		setSelectedSlugs(new Set())
	}, [selectedCount, selectedSlugs])

	// 给某篇文章分配分类
	const handleAssignCategory = useCallback((slug: string, category?: string) => {
		setEditableItems(prev =>
			prev.map(item => {
				if (item.slug !== slug) return item
				const nextCategory = category?.trim()
				if (!nextCategory) return { ...item, category: undefined }
				return { ...item, category: nextCategory }
			})
		)
	}, [])

	// 新增分类
	const handleAddCategory = useCallback(() => {
		const value = newCategory.trim()
		if (!value) {
			toast.info('请输入分类名称')
			return
		}
		setCategoryList(prev => (prev.includes(value) ? prev : [...prev, value]))
		setNewCategory('')
	}, [newCategory])

	// 移除某个分类
	const handleRemoveCategory = useCallback((category: string) => {
		setCategoryList(prev => prev.filter(item => item !== category))
		setEditableItems(prev => prev.map(item => (item.category === category ? { ...item, category: undefined } : item)))
	}, [])

	// 拖拽/重新排序分类后会触发，这里直接同步
	const handleReorderCategories = useCallback((nextList: string[]) => {
		setCategoryList(nextList)
	}, [])

	// 取消编辑（恢复原始数据）
	const handleCancel = useCallback(() => {
		setEditableItems(items)
		setSelectedSlugs(new Set())
		setEditMode(false)
	}, [items])

	// 保存编辑结果
	const handleSave = useCallback(async () => {
		// 判断是否有已删除的文章
		const removedSlugs = items.filter(item => !editableItems.some(editItem => editItem.slug === item.slug)).map(item => item.slug)
		// 分类列表标准化后再比较是否发生变化
		const normalizedCategoryList = categoryList.map(c => c.trim()).filter(Boolean)
		const categoryListChanged = JSON.stringify(normalizedCategoryList) !== JSON.stringify((categoriesFromServer || []).map(c => c.trim()).filter(Boolean))
		// 是否有文章的分类被修改
		const categoryAssignmentChanged = items.some(origin => {
			const next = editableItems.find(editItem => editItem.slug === origin.slug)
			const originCategory = origin.category || ''
			const nextCategory = next?.category || ''
			return originCategory !== nextCategory
		})
		const hasChanges = removedSlugs.length > 0 || categoryListChanged || categoryAssignmentChanged

		if (!hasChanges) {
			toast.info('没有需要保存的改动')
			return
		}

		try {
			setSaving(true)
			await saveBlogEdits(items, editableItems, normalizedCategoryList)
			setEditMode(false)
			setSelectedSlugs(new Set())
			setCategoryModalOpen(false)
		} catch (error: any) {
			console.error(error)
			toast.error(error?.message || '保存失败')
		} finally {
			setSaving(false)
		}
	}, [items, editableItems, categoryList, categoriesFromServer])

	// 根据鉴权状态决定是保存还是触发密钥导入
	const handleSaveClick = useCallback(() => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		void handleSave()
	}, [handleSave, isAuth])

	// 导入 PEM 私钥文件
	const handlePrivateKeySelection = useCallback(
		async (file: File) => {
			try {
				const pem = await readFileAsText(file)
				setPrivateKey(pem)
				toast.success('密钥导入成功，请再次点击保存')
			} catch (error) {
				console.error(error)
				toast.error('读取密钥失败')
			}
		},
		[setPrivateKey]
	)

	// 全局快捷键：非编辑模式下 Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!editMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				toggleEditMode()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [editMode, toggleEditMode])

	// ---------- 渲染 ----------
	return (
		<>
			{/* 隐藏的文件选择 input，用于导入密钥 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handlePrivateKeySelection(f)
					// 清空 input，确保相同文件可以再次触发
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 主内容区域 */}
			<div className='flex flex-col items-center justify-center gap-6 px-6 pt-24 max-sm:pt-24'>
				{/* 展示模式选择器（有文章时显示，移动端隐藏） */}
				{items.length > 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						className='card btn-rounded relative mx-auto flex items-center gap-1 p-1 max-sm:hidden'>
						{[
							{ value: 'day', label: '日' },
							{ value: 'week', label: '周' },
							{ value: 'month', label: '月' },
							{ value: 'year', label: '年' },
							// 如果启用了分类功能，则加入分类选项
							...(enableCategories ? ([{ value: 'category', label: '分类' }] as const) : [])
						].map(option => (
							<motion.button
								key={option.value}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setDisplayMode(option.value as DisplayMode)}
								className={cn(
									'btn-rounded px-3 py-1.5 text-xs font-medium transition-all',
									displayMode === option.value ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand hover:bg-white/60'
								)}>
								{option.label}
							</motion.button>
						))}
					</motion.div>
				)}

				{/* 按分组渲染文章列表 */}
				{groupKeys.map((groupKey, index) => {
					const group = groupedItems[groupKey]
					if (!group) return null

					return (
						<motion.div
							onMouseLeave={cancelCoverPreview}
							key={groupKey}
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ delay: INIT_DELAY / 2 }}
							className='card relative w-full max-w-[840px] space-y-6'>
							{/* 分组标题栏 */}
							<div className='mb-3 flex items-center justify-between gap-3 text-base'>
								<div className='flex items-center gap-3'>
									<div className='font-medium'>{getGroupLabel(groupKey)}</div>
									<div className='h-2 w-2 rounded-full bg-[#D9D9D9]'></div>
									<div className='text-secondary text-sm'>{group.items.length} 篇文章</div>
								</div>
								{/* 编辑模式下展示分组全选/取消全选按钮 */}
								{editMode &&
									(() => {
										const groupAllSelected = group.items.every(item => selectedSlugs.has(item.slug))
										return (
											<motion.button
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
												onClick={() => handleSelectGroup(groupKey)}
												className={cn(
													'rounded-lg border px-3 py-1 text-xs transition-colors',
													groupAllSelected
														? 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20'
														: 'text-secondary hover:border-brand/40 hover:text-brand border-transparent bg-white/60 hover:bg-white/80'
												)}>
												{groupAllSelected ? '取消全选' : '全选该分组'}
											</motion.button>
										)
									})()}
							</div>
							<div>
								{/* 分组内的文章条目 */}
								{group.items.map(it => {
									const hasRead = isRead(it.slug)
									const isSelected = selectedSlugs.has(it.slug)
									return (
										<Link
											onMouseEnter={() => onCoverLinkMouseEnter(it.cover)}
											onMouseLeave={cancelCoverPreview}
											href={`/blog/${it.slug}`}
											key={it.slug}
											onClick={event => handleItemClick(event, it.slug)}
											className={cn(
												'group flex min-h-10 items-center gap-3 py-3 transition-all',
												editMode
													? cn(
															'rounded-lg border px-3',
															isSelected ? 'border-brand/60 bg-brand/5' : 'hover:border-brand/40 border-transparent hover:bg-white/60'
														)
													: 'cursor-pointer'
											)}>
											{/* 编辑模式的选择框 */}
											{editMode && (
												<span
													className={cn(
														'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold',
														isSelected ? 'border-brand bg-brand text-white' : 'border-[#D9D9D9] text-transparent'
													)}>
													<Check />
												</span>
											)}
											{/* 日期（月-日） */}
											<span className='text-secondary w-[44px] shrink-0 text-sm font-medium'>{dayjs(it.date).format('MM-DD')}</span>

											{/* 时间轴点 */}
											<div className='relative flex h-2 w-2 items-center justify-center'>
												<div className='bg-secondary group-hover:bg-brand h-[5px] w-[5px] rounded-full transition-all group-hover:h-4'></div>
												<ShortLineSVG className='absolute bottom-4' />
											</div>
											{/* 文章标题 */}
											<div
												className={cn(
													'flex-1 truncate text-sm font-medium transition-all',
													editMode ? null : 'group-hover:text-brand group-hover:translate-x-2'
												)}>
												{it.title || it.slug}
												{hasRead && <span className='text-secondary ml-2 text-xs'>[已阅读]</span>}
											</div>
											{/* 标签列表（移动端隐藏） */}
											<div className='flex flex-wrap items-center gap-2 max-sm:hidden'>
												{(it.tags || []).map(t => (
													<span key={t} className='text-secondary text-sm'>
														#{t}
													</span>
												))}
											</div>
										</Link>
									)
								})}
							</div>
						</motion.div>
					)
				})}
				{/* 外部链接：掘金更多文章 */}
				{items.length > 0 && (
					<div className='text-center'>
						<motion.a
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							href='https://juejin.cn/user/2427311675422382/posts'
							target='_blank'
							className='card text-secondary static inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs'>
							<JuejinSVG className='h-4 w-4' />
							更多
						</motion.a>
					</div>
				)}
			</div>

			{/* 空状态 / 加载中提示 */}
			<div className='pt-12'>
				{!loading && items.length === 0 && <div className='text-secondary py-6 text-center text-sm'>暂无文章</div>}
				{loading && <div className='text-secondary py-6 text-center text-sm'>加载中...</div>}
			</div>

			{/* 右上角操作区（桌面端显示） */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex items-center gap-3 max-sm:hidden'>
				{editMode ? (
					<>
						{/* 编辑模式下的工具按钮 */}
						{enableCategories && (
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setCategoryModalOpen(true)}
								disabled={saving}
								className='rounded-xl border bg-white/60 px-4 py-2 text-sm transition-colors hover:bg-white/80'>
								分类
							</motion.button>
						)}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={selectedCount === editableItems.length ? handleDeselectAll : handleSelectAll}
							className='rounded-xl border bg-white/60 px-4 py-2 text-sm transition-colors hover:bg-white/80'>
							{selectedCount === editableItems.length ? '取消全选' : '全选'}
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleDeleteSelected}
							disabled={selectedCount === 0}
							className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-colors disabled:opacity-60'>
							删除(已选:{selectedCount}篇)
						</motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={saving} className='brand-btn px-6'>
							{saving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式且允许显示编辑按钮时
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={toggleEditMode}
							className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			{/* 封面悬浮预览组件 */}
			<BlogCoverHoverPreview preview={hoverCoverPreview} position={mousePosition} />

			{/* 分类管理弹窗（只在编辑模式触发打开） */}
			<CategoryModal
				open={categoryModalOpen}
				onClose={() => setCategoryModalOpen(false)}
				categoryList={categoryList}
				newCategory={newCategory}
				onNewCategoryChange={setNewCategory}
				onAddCategory={handleAddCategory}
				onRemoveCategory={handleRemoveCategory}
				onReorderCategories={handleReorderCategories}
				editableItems={editableItems}
				onAssignCategory={handleAssignCategory}
			/>
		</>
	)
}
