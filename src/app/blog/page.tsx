// 标记这是一个 Next.js 客户端组件（仅在浏览器端渲染）
'use client'

// 导入 Next.js 路由链接组件
import Link from 'next/link'
// 导入日期处理库 dayjs 及其周数插件
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
// 导入 Framer Motion 动画库的 React 版本
import { motion } from 'motion/react'

// 扩展 dayjs 以支持周数计算
dayjs.extend(weekOfYear)
// 导入 React 核心 Hooks
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// 导入 Sonner 消息提示库
import { toast } from 'sonner'
// 导入项目常量（如初始动画延迟）
import { INIT_DELAY } from '@/consts'
// 导入自定义 SVG 组件
import ShortLineSVG from '@/svgs/short-line.svg'
// 导入自定义 Hooks：博客索引、分类、已读文章状态
import { useBlogIndex, type BlogIndexItem } from '@/hooks/use-blog-index'
import { useCategories } from '@/hooks/use-categories'
import { useReadArticles } from '@/hooks/use-read-articles'
// 导入掘金 SVG 图标
import JuejinSVG from '@/svgs/juejin.svg'
// 导入认证状态管理 Hook
import { useAuthStore } from '@/hooks/use-auth'
// 导入站点配置状态管理 Hook
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 导入文件读取工具函数
import { readFileAsText } from '@/lib/file-utils'
// 导入 Tailwind CSS 类名合并工具
import { cn } from '@/lib/utils'
// 导入博客编辑保存服务
import { saveBlogEdits } from './services/save-blog-edits'
// 导入 Lucide React 图标库的勾选图标
import { Check } from 'lucide-react'
// 导入博客封面悬停预览组件及其 Hook
import { BlogCoverHoverPreview, useBlogCoverHover } from './components/blog-cover-hover'
// 导入分类管理弹窗组件
import { CategoryModal } from './components/category-modal'

// 定义文章显示模式的联合类型
type DisplayMode = 'day' | 'week' | 'month' | 'year' | 'category'

// 博客页面主组件
export default function BlogPage() {
	// 获取博客文章列表及加载状态
	const { items, loading } = useBlogIndex()
	// 获取从服务器端加载的分类列表
	const { categories: categoriesFromServer } = useCategories()
	// 获取文章已读状态检查函数
	const { isRead } = useReadArticles()
	// 获取认证状态及私钥设置函数
	const { isAuth, setPrivateKey } = useAuthStore()
	// 获取站点配置内容
	const { siteContent } = useConfigStore()
	// 从配置中读取是否隐藏编辑按钮（默认 false）
	const hideEditButton = siteContent.hideEditButton ?? false
	// 从配置中读取是否启用分类功能（默认 false）
	const enableCategories = siteContent.enableCategories ?? false

	// 私钥文件输入框的 Ref
	const keyInputRef = useRef<HTMLInputElement>(null)
	// 编辑模式开关状态
	const [editMode, setEditMode] = useState(false)
	// 编辑模式下的可编辑文章列表
	const [editableItems, setEditableItems] = useState<BlogIndexItem[]>([])
	// 已选中的文章 Slug 集合
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
	// 保存中状态
	const [saving, setSaving] = useState(false)
	// 当前文章显示模式（默认按年）
	const [displayMode, setDisplayMode] = useState<DisplayMode>('year')
	// 分类管理弹窗开关状态
	const [categoryModalOpen, setCategoryModalOpen] = useState(false)
	// 本地分类列表状态
	const [categoryList, setCategoryList] = useState<string[]>([])
	// 新建分类的输入值
	const [newCategory, setNewCategory] = useState('')

	// 使用博客封面悬停预览 Hook
	const { cancelCoverPreview, onCoverLinkMouseEnter, hoverCoverPreview, mousePosition } = useBlogCoverHover(editMode)

	// 当退出编辑模式或文章列表更新时，同步可编辑文章列表
	useEffect(() => {
		if (!editMode) {
			setEditableItems(items)
		}
	}, [items, editMode])

	// 当服务器端分类列表加载完成时，同步本地分类列表
	useEffect(() => {
		setCategoryList(categoriesFromServer || [])
	}, [categoriesFromServer])

	// 根据是否在编辑模式，选择显示原始文章列表还是可编辑列表
	const displayItems = editMode ? editableItems : items

	// 核心计算逻辑：对文章进行分组、排序及生成标签
	const { groupedItems, groupKeys, getGroupLabel } = useMemo(() => {
		// 1. 先对所有文章按日期倒序排序（最新的在前）
		const sorted = [...displayItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

		// 2. 根据当前显示模式对文章进行分组
		const grouped = sorted.reduce(
			(acc, item) => {
				let key: string
				let label: string
				const date = dayjs(item.date)

				// 根据不同显示模式计算分组 Key 和显示标签
				switch (displayMode) {
					case 'category':
						// 按分类分组，无分类则归为“未分类”
						key = item.category || '未分类'
						label = key
						break
					case 'day':
						// 按日分组（如：2024-05-20）
						key = date.format('YYYY-MM-DD')
						label = date.format('YYYY年MM月DD日')
						break
					case 'week':
						// 按周分组（如：2024-W21）
						const week = date.week()
						key = `${date.format('YYYY')}-W${week.toString().padStart(2, '0')}`
						label = `${date.format('YYYY')}年第${week}周`
						break
					case 'month':
						// 按月分组（如：2024-05）
						key = date.format('YYYY-MM')
						label = date.format('YYYY年MM月')
						break
					case 'year':
					default:
						// 按年分组（默认，如：2024）
						key = date.format('YYYY')
						label = date.format('YYYY年')
						break
				}

				// 将文章推入对应分组
				if (!acc[key]) {
					acc[key] = { items: [], label }
				}
				acc[key].items.push(item)
				return acc
			},
			{} as Record<string, { items: BlogIndexItem[]; label: string }>
		)

		// 3. 对分组 Key 进行排序（决定页面上分组的显示顺序）
		const keys = Object.keys(grouped).sort((a, b) => {
			if (displayMode === 'category') {
				// 分类模式：按预设的分类顺序排序，未在列表中的分类排最后
				const categoryOrder = new Map(categoryList.map((c, index) => [c, index]))
				const aOrder = categoryOrder.has(a) ? categoryOrder.get(a)! : Number.MAX_SAFE_INTEGER
				const bOrder = categoryOrder.has(b) ? categoryOrder.get(b)! : Number.MAX_SAFE_INTEGER
				if (aOrder !== bOrder) return aOrder - bOrder
				return a.localeCompare(b) // 顺序相同则按字典序
			}
			// 时间模式：按时间倒序排序
			if (displayMode === 'week') {
				// 周格式特殊处理（YYYY-WW）
				const [yearA, weekA] = a.split('-W').map(Number)
				const [yearB, weekB] = b.split('-W').map(Number)
				if (yearA !== yearB) return yearB - yearA
				return weekB - weekA
			}
			// 年/月/日直接字符串比较即可（因为格式是 ISO 标准的）
			return b.localeCompare(a)
		})

		return {
			groupedItems: grouped, // 分组后的数据对象
			groupKeys: keys, // 排序后的分组 Key 数组
			getGroupLabel: (key: string) => grouped[key]?.label || key // 获取分组显示标签的函数
		}
	}, [displayItems, displayMode, categoryList]) // 依赖项：文章列表、显示模式、分类列表

	// 计算已选中的文章数量
	const selectedCount = selectedSlugs.size
	// 根据认证状态确定保存按钮的文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 切换编辑模式
	const toggleEditMode = useCallback(() => {
		if (editMode) {
			// 退出编辑模式：重置状态
			setEditMode(false)
			setEditableItems(items)
			setSelectedSlugs(new Set())
		} else {
			// 进入编辑模式：同步可编辑列表
			setEditableItems(items)
			setEditMode(true)
		}
	}, [editMode, items])

	// 切换单篇文章的选中状态
	const toggleSelect = useCallback((slug: string) => {
		setSelectedSlugs(prev => {
			const next = new Set(prev)
			if (next.has(slug)) {
				next.delete(slug) // 取消选中
			} else {
				next.add(slug) // 选中
			}
			return next
		})
	}, [])

	// 全选所有文章
	const handleSelectAll = useCallback(() => {
		setSelectedSlugs(new Set(editableItems.map(item => item.slug)))
	}, [editableItems])

	// 全选/取消全选某个特定分组
	const handleSelectGroup = useCallback(
		(groupKey: string) => {
			const group = groupedItems[groupKey]
			if (!group) return

			// 检查该分组是否已被全选
			const allSelected = group.items.every(item => selectedSlugs.has(item.slug))

			setSelectedSlugs(prev => {
				const next = new Set(prev)
				if (allSelected) {
					// 已全选则取消该分组
					group.items.forEach(item => {
						next.delete(item.slug)
					})
				} else {
					// 未全选则选中该分组所有文章
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

	// 处理文章链接点击（编辑模式下用于选中文章）
	const handleItemClick = useCallback(
		(event: React.MouseEvent, slug: string) => {
			if (!editMode) return // 非编辑模式不拦截
			event.preventDefault() // 阻止跳转
			event.stopPropagation()
			toggleSelect(slug) // 切换选中状态
		},
		[editMode, toggleSelect]
	)

	// 删除已选中的文章（仅在本地状态中删除，未保存）
	const handleDeleteSelected = useCallback(() => {
		if (selectedCount === 0) {
			toast.info('请选择要删除的文章')
			return
		}
		// 从可编辑列表中过滤掉已选中的文章
		setEditableItems(prev => prev.filter(item => !selectedSlugs.has(item.slug)))
		setSelectedSlugs(new Set()) // 清空选中
	}, [selectedCount, selectedSlugs])

	// 为单篇文章分配/移除分类
	const handleAssignCategory = useCallback((slug: string, category?: string) => {
		setEditableItems(prev =>
			prev.map(item => {
				if (item.slug !== slug) return item
				const nextCategory = category?.trim()
				if (!nextCategory) return { ...item, category: undefined } // 移除分类
				return { ...item, category: nextCategory } // 设置分类
			})
		)
	}, [])

	// 添加新分类
	const handleAddCategory = useCallback(() => {
		const value = newCategory.trim()
		if (!value) {
			toast.info('请输入分类名称')
			return
		}
		// 避免添加重复分类
		setCategoryList(prev => (prev.includes(value) ? prev : [...prev, value]))
		setNewCategory('') // 清空输入框
	}, [newCategory])

	// 删除分类（并移除所有文章对该分类的引用）
	const handleRemoveCategory = useCallback((category: string) => {
		setCategoryList(prev => prev.filter(item => item !== category))
		// 同时将属于该分类的文章的分类清空
		setEditableItems(prev => prev.map(item => (item.category === category ? { ...item, category: undefined } : item)))
	}, [])

	// 重新排序分类列表（拖拽后调用）
	const handleReorderCategories = useCallback((nextList: string[]) => {
		setCategoryList(nextList)
	}, [])

	// 取消编辑（重置所有状态）
	const handleCancel = useCallback(() => {
		setEditableItems(items)
		setSelectedSlugs(new Set())
		setEditMode(false)
	}, [items])

	// 保存编辑结果到服务器
	const handleSave = useCallback(async () => {
		// 1. 计算差异：找出被删除的文章 Slug
		const removedSlugs = items.filter(item => !editableItems.some(editItem => editItem.slug === item.slug)).map(item => item.slug)
		
		// 2. 检查分类列表是否有变动
		const normalizedCategoryList = categoryList.map(c => c.trim()).filter(Boolean)
		const categoryListChanged = JSON.stringify(normalizedCategoryList) !== JSON.stringify((categoriesFromServer || []).map(c => c.trim()).filter(Boolean))
		
		// 3. 检查文章分类分配是否有变动
		const categoryAssignmentChanged = items.some(origin => {
			const next = editableItems.find(editItem => editItem.slug === origin.slug)
			const originCategory = origin.category || ''
			const nextCategory = next?.category || ''
			return originCategory !== nextCategory
		})
		
		// 4. 判断是否真的有改动
		const hasChanges = removedSlugs.length > 0 || categoryListChanged || categoryAssignmentChanged

		if (!hasChanges) {
			toast.info('没有需要保存的改动')
			return
		}

		try {
			setSaving(true)
			// 调用服务保存改动
			await saveBlogEdits(items, editableItems, normalizedCategoryList)
			// 保存成功后退出编辑模式
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

	// 保存按钮点击事件处理
	const handleSaveClick = useCallback(() => {
		if (!isAuth) {
			// 未认证：触发私钥文件选择
			keyInputRef.current?.click()
			return
		}
		// 已认证：直接保存
		void handleSave()
	}, [handleSave, isAuth])

	// 处理私钥文件选择
	const handlePrivateKeySelection = useCallback(
		async (file: File) => {
			try {
				const pem = await readFileAsText(file)
				setPrivateKey(pem) // 设置私钥到状态
				toast.success('密钥导入成功，请再次点击保存')
			} catch (error) {
				console.error(error)
				toast.error('读取密钥失败')
			}
		},
		[setPrivateKey]
	)

	// 注册键盘快捷键：Ctrl/Cmd + , 切换编辑模式
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

	// --- 渲染部分 ---
	return (
		<>
			{/* 隐藏的私钥文件输入框 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.currentTarget.files?.[0]
					if (f) await handlePrivateKeySelection(f)
					if (e.currentTarget) e.currentTarget.value = '' // 重置 input 以允许重复选择同一文件
				}}
			/>

			{/* 主内容区域 */}
			<div className='flex flex-col items-center justify-center gap-6 px-6 pt-24 max-sm:pt-24'>
				{/* 显示模式切换按钮组（仅在有文章且非移动端时显示） */}
				{items.length > 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						className='card btn-rounded relative mx-auto flex items-center gap-1 p-1 max-sm:hidden'>
						{/* 生成切换按钮：日、周、月、年、分类（可选） */}
						{[
							{ value: 'day', label: '日' },
							{ value: 'week', label: '周' },
							{ value: 'month', label: '月' },
							{ value: 'year', label: '年' },
							...(enableCategories ? ([{ value: 'category', label: '分类' }] as const) : [])
						].map(option => (
							<motion.button
								key={option.value}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setDisplayMode(option.value as DisplayMode)}
								className={cn(
									'btn-rounded px-3 py-1.5 text-xs font-medium transition-all',
									// 当前选中的按钮样式
									displayMode === option.value ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand hover:bg-white/60'
								)}>
								{option.label}
							</motion.button>
						))}
					</motion.div>
				)}

				{/* 遍历渲染每个分组 */}
				{groupKeys.map((groupKey, index) => {
					const group = groupedItems[groupKey]
					if (!group) return null

					return (
						<motion.div
							onMouseLeave={cancelCoverPreview} // 鼠标离开分组区域取消封面预览
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
								{/* 编辑模式下的“全选该分组”按钮 */}
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

							{/* 分组内的文章列表 */}
							<div>
								{group.items.map(it => {
									const hasRead = isRead(it.slug) // 是否已读
									const isSelected = selectedSlugs.has(it.slug) // 是否选中（编辑模式）
									return (
										<Link
											// 鼠标悬停事件：用于封面预览
											onMouseEnter={() => onCoverLinkMouseEnter(it.cover)}
											onMouseLeave={cancelCoverPreview}
											href={`/blog/${it.slug}`}
											key={it.slug}
											// 点击事件：编辑模式下拦截
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
											{/* 编辑模式下的勾选框 */}
											{editMode && (
												<span
													className={cn(
														'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold',
														isSelected ? 'border-brand bg-brand text-white' : 'border-[#D9D9D9] text-transparent'
													)}>
													<Check />
												</span>
											)}
											{/* 文章日期 */}
											<span className='text-secondary w-[44px] shrink-0 text-sm font-medium'>{dayjs(it.date).format('MM-DD')}</span>

											{/* 时间线装饰点 */}
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
												{/* 已读标记 */}
												{hasRead && <span className='text-secondary ml-2 text-xs'>[已阅读]</span>}
											</div>
											{/* 文章标签（仅非移动端显示） */}
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

				{/* 底部“更多”链接（跳转到掘金） */}
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

			{/* 加载状态或空状态提示 */}
			<div className='pt-12'>
				{!loading && items.length === 0 && <div className='text-secondary py-6 text-center text-sm'>暂无文章</div>}
				{loading && <div className='text-secondary py-6 text-center text-sm'>加载中...</div>}
			</div>

			{/* 右上角编辑工具栏（仅非移动端显示） */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex items-center gap-3 max-sm:hidden'>
				{editMode ? (
					<>
						{/* 分类管理按钮（如果启用了分类功能） */}
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
						{/* 取消编辑按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						{/* 全选/取消全选按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={selectedCount === editableItems.length ? handleDeselectAll : handleSelectAll}
							className='rounded-xl border bg-white/60 px-4 py-2 text-sm transition-colors hover:bg-white/80'>
							{selectedCount === editableItems.length ? '取消全选' : '全选'}
						</motion.button>
						{/* 删除选中按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleDeleteSelected}
							disabled={selectedCount === 0}
							className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-colors disabled:opacity-60'>
							删除(已选:{selectedCount}篇)
						</motion.button>
						{/* 保存/导入密钥按钮 */}
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={saving} className='brand-btn px-6'>
							{saving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式：显示“编辑”按钮（如果未隐藏）
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

			{/* 博客封面悬停预览组件 */}
			<BlogCoverHoverPreview preview={hoverCoverPreview} position={mousePosition} />

			{/* 分类管理弹窗组件 */}
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