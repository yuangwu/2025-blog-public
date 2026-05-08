'use client'

// 引入 React 核心库（Vercel/Next.js 环境必须显式导入以支持 JSX 和类型）
import React from 'react'
// 导入全局状态管理所需的 store 和类型
import { useConfigStore, type CardStyles } from '../stores/config-store'
import { useLayoutEditStore } from '../stores/layout-edit-store'
// 导入卡片样式默认配置（请确保该 JSON 文件存在于 @/config/card-styles-default.json 路径）
import cardStylesDefault from '@/config/card-styles-default.json'

// 卡片显示名称映射表（用于表格中展示中文名称）
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

// 组件属性类型定义
interface HomeLayoutProps {
	cardStylesData: CardStyles               // 当前卡片样式数据
	setCardStylesData: React.Dispatch<React.SetStateAction<CardStyles>> // 更新卡片样式的函数
	onClose?: () => void                     // 可选：关闭当前面板的回调
}

/**
 * 主页布局编辑器组件
 * 允许用户以表格形式调整每个卡片的宽高、顺序、偏移量及启用状态
 * 进入拖拽布局模式后，会将修改后的样式同步到全局 store
 */
export function HomeLayout({ cardStylesData, setCardStylesData, onClose }: HomeLayoutProps) {
	// 获取全局样式更新方法
	const { setCardStyles } = useConfigStore()
	// 获取布局编辑模式的状态及启动方法
	const startEditing = useLayoutEditStore(state => state.startEditing)
	const editing = useLayoutEditStore(state => state.editing)

	/** 进入手动拖拽布局：保存当前样式到全局并启动编辑模式 */
	const handleStartManualLayout = () => {
		setCardStyles(cardStylesData)
		startEditing()
		onClose?.()
	}

	/** 重置为默认样式（从 JSON 文件读取） */
	const handleReset = () => {
		setCardStylesData(cardStylesDefault as CardStyles)
	}

	return (
		<div className='overflow-x-auto'>
			{/* 头部：提示信息 + 操作按钮 */}
			<div className='flex items-center justify-between'>
				<div className='text-secondary text-sm'>（偏移代表相对中心的偏移）</div>
				<div className='flex shrink-0 items-center gap-2 whitespace-nowrap'>
					<button type='button' onClick={handleReset} className='bg-card rounded-xl border px-3 py-1.5 text-xs font-medium'>
						重置
					</button>
					<button
						type='button'
						onClick={handleStartManualLayout}
						disabled={editing}
						className='bg-card rounded-xl border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
						{editing ? '主页正在编辑中' : '进入主页拖拽布局'}
					</button>
				</div>
			</div>

			{/* 卡片配置表格 */}
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
					{/* 遍历所有卡片配置 */}
					{Object.entries(cardStylesData).map(([key, cardStyle]: [string, any]) => (
						<tr key={key} className='border-b last:border-0'>
							{/* 卡片名称（优先使用映射表，否则将驼峰转为空格分隔） */}
							<td className='px-3 py-2 align-middle whitespace-nowrap'>{CARD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()}</td>

							{/* 宽度输入框（仅当卡片支持宽度时显示） */}
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

							{/* 高度输入框 */}
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

							{/* 显示顺序 */}
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

							{/* 横向偏移（允许为空，即 null） */}
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

							{/* 纵向偏移 */}
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

							{/* 是否启用该卡片 */}
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
