// 声明这是一个客户端组件（在 Next.js App Router 中用于标记该组件只在浏览器端运行）
'use client'

import { motion } from 'motion/react' // 动画库 motion 的导入（当前代码中未直接使用，可能为后续动画预留）
import { useConfigStore, type CardStyles } from '../stores/config-store' // 全局配置状态管理，导入卡片样式类型
import { useLayoutEditStore } from '../stores/layout-edit-store' // 布局编辑状态管理
import cardStylesDefault from '@/config/card-styles-default.json' // 默认卡片样式配置

// 卡片名称映射表，用于将英文 key 转换为中文显示名称
const CARD_LABELS: Record<string, string> = {
	artCard: '首图',
	hiCard: '中心',
	clockCard: '时钟',
	calendarCard: '日历',
	musicCard: '音乐',
	socialButtons: '联系',
	shareCard: '分享',
	articleCard: '文章',
	writeButtons: '写作',
	navCard: '导航',
	likePosition: '点赞',
	hatCard: '帽子',
	beianCard: '备案'
}

// HomeLayout 组件的 Props 类型定义
interface HomeLayoutProps {
	cardStylesData: CardStyles // 当前编辑中的卡片样式数据（通常由父组件状态管理）
	setCardStylesData: React.Dispatch<React.SetStateAction<CardStyles>> // 更新卡片样式数据的函数
	onClose?: () => void // 可选的关闭回调，例如用于关闭面板或弹窗
}

/**
 * HomeLayout 组件
 * 提供主页中所有卡片布局参数的编辑表格，包括宽高、顺序、偏移量及启用状态，
 * 并支持重置为默认样式或进入拖拽布局模式。
 */
export function HomeLayout({ cardStylesData, setCardStylesData, onClose }: HomeLayoutProps) {
	// 从全局配置 store 中获取设置卡片样式的方法（最终确认保存）
	const { setCardStyles } = useConfigStore()
	// 从布局编辑 store 中获取开始编辑的方法
	const startEditing = useLayoutEditStore(state => state.startEditing)
	// 获取当前是否正处于编辑状态（用于禁用按钮，避免重复操作）
	const editing = useLayoutEditStore(state => state.editing)

	// 处理“进入主页拖拽布局”：先将当前编辑数据写入全局 store，再开启编辑模式，最后触发关闭回调
	const handleStartManualLayout = () => {
		setCardStyles(cardStylesData)  // 将面板中的临时样式提交到全局配置
		startEditing()                // 启动拖拽布局编辑模式
		onClose?.()                   // 关闭当前编辑面板（如果有）
	}

	// 重置所有卡片样式为默认配置
	const handleReset = () => {
		setCardStylesData(cardStylesDefault as CardStyles)
	}

	return (
		<div className='overflow-x-auto'> {/* 外层容器允许水平滚动，避免表格在小屏幕溢出不显示 */}
			{/* 工具栏：显示说明文字与操作按钮 */}
			<div className='flex items-center justify-between'>
				<div className='text-secondary text-sm'>（偏移代表相对中心的偏移）</div>
				<div className='flex shrink-0 items-center gap-2 whitespace-nowrap'>
					{/* 重置按钮 */}
					<button type='button' onClick={handleReset} className='bg-card rounded-xl border px-3 py-1.5 text-xs font-medium'>
						重置
					</button>
					{/* 进入拖拽布局按钮，编辑中时禁用 */}
					<button
						type='button'
						onClick={handleStartManualLayout}
						disabled={editing}
						className='bg-card rounded-xl border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
						{editing ? '主页正在编辑中' : '进入主页拖拽布局'}
					</button>
				</div>
			</div>

			{/* 卡片属性编辑表格 */}
			<table className='mt-3 w-full border-collapse text-sm whitespace-nowrap'>
				<thead>
					<tr className='border-b text-xs text-gray-500'>
						<th className='px-3 py-2 text-left font-medium'>卡片</th>
						<th className='px-3 py-2 text-left font-medium'>宽度</th>
						<th className='px-3 py-2 text-left font-medium'>高度</th>
						<th className='px-3 py-2 text-left font-medium'>显示顺序</th>
						<th className='px-3 py-2 text-left font-medium'>横向偏移</th>
						<th className='px-3 py-2 text-left font-medium'>纵向偏移</th>
						<th className='px-3 py-2 text-left font-medium'>启用</th>
					</tr>
				</thead>
				<tbody>
					{/* 遍历所有卡片样式条目，生成对应的编辑行 */}
					{Object.entries(cardStylesData).map(([key, cardStyle]: [string, any]) => (
						<tr key={key} className='border-b last:border-0'>
							{/* 卡片名称列：优先使用中文映射，否则将驼峰命名转换为空格分隔的文本 */}
							<td className='px-3 py-2 align-middle whitespace-nowrap'>
								{CARD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()}
							</td>

							{/* 宽度输入列：若卡片样式中定义了宽度则显示数字输入框，否则显示占位符 */}
							<td className='px-3 py-2'>
								{cardStyle.width !== undefined ? (
									<input
										type='number'
										value={cardStyle.width}
										onChange={e =>
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													width: parseInt(e.target.value) || 0
												}
											}))
										}
										className='no-spinner bg-secondary/10 w-full rounded-lg border px-3 py-1.5 text-xs'
									/>
								) : (
									<span className='text-xs text-gray-400'>-</span>
								)}
							</td>

							{/* 高度输入列 */}
							<td className='px-3 py-2'>
								{cardStyle.height !== undefined ? (
									<input
										type='number'
										value={cardStyle.height}
										onChange={e =>
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													height: parseInt(e.target.value) || 0
												}
											}))
										}
										className='no-spinner bg-secondary/10 w-full rounded-lg border px-3 py-1.5 text-xs'
									/>
								) : (
									<span className='text-xs text-gray-400'>-</span>
								)}
							</td>

							{/* 显示顺序输入列，z-index 或排列顺序，所有卡片均具备 */}
							<td className='px-3 py-2'>
								<input
									type='number'
									value={cardStyle.order}
									onChange={e =>
										setCardStylesData(prev => ({
											...prev,
											[key]: {
												...prev[key as keyof CardStyles],
												order: parseInt(e.target.value) || 0
											}
										}))
									}
									className='bg-secondary/10 w-full rounded-lg border px-3 py-1.5 text-xs'
								/>
							</td>

							{/* 横向偏移输入列，允许空值（null）表示未设置，输入框留空时设为 null */}
							<td className='px-3 py-2'>
								<input
									type='number'
									value={cardStyle.offsetX ?? ''}
									placeholder='null'
									onChange={e => {
										const value = e.target.value === '' ? null : parseInt(e.target.value) || 0
										setCardStylesData(prev => ({
											...prev,
											[key]: {
												...prev[key as keyof CardStyles],
												offsetX: value
											}
										}))
									}}
									className='no-spinner bg-secondary/10 w-full rounded-lg border px-3 py-1.5 text-xs'
								/>
							</td>

							{/* 纵向偏移输入列，逻辑同横向偏移 */}
							<td className='px-3 py-2'>
								<input
									type='number'
									value={cardStyle.offsetY ?? ''}
									placeholder='null'
									onChange={e => {
										const value = e.target.value === '' ? null : parseInt(e.target.value) || 0
										setCardStylesData(prev => ({
											...prev,
											[key]: {
												...prev[key as keyof CardStyles],
												offsetY: value
											}
										}))
									}}
									className='no-spinner bg-secondary/10 w-full rounded-lg border px-3 py-1.5 text-xs'
								/>
							</td>

							{/* 启用状态复选框，默认为 true（启用），取反时可禁用对应卡片 */}
							<td className='px-3 py-2'>
								<input
									type='checkbox'
									checked={cardStyle.enabled ?? true}
									onChange={e =>
										setCardStylesData(prev => ({
											...prev,
											[key]: {
												...prev[key as keyof CardStyles],
												enabled: e.target.checked
											}
										}))
									}
									className='accent-brand h-4 w-4 rounded border-gray-300'
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}