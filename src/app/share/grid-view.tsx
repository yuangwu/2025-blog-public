'use client'

import { useState } from 'react'

// 导入 LogoItem 类型，用于在编辑时可能传递的 logo 数据
import { type LogoItem } from './components/logo-upload-dialog'
// 导入 ShareCard 组件以及 Share 类型
import { ShareCard, type Share } from './components/share-card'

// 定义 GridView 组件接收的 props 类型
interface GridViewProps {
	shares: Share[] // 需要展示的分享数据
	isEditMode?: boolean // 是否处于编辑模式，默认为 false
	onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void // 更新分享的回调
	onDelete?: (share: Share) => void // 删除分享的回调
}

// 默认导出 GridView 组件
export default function GridView({ shares, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	// 搜索关键词状态
	const [searchTerm, setSearchTerm] = useState('')
	// 当前选中的标签，默认为 'all' 表示全部
	const [selectedTag, setSelectedTag] = useState<string>('all')

	// 收集所有分享中不重复的标签，用于渲染标签筛选按钮
	const allTags = Array.from(new Set(shares.flatMap(share => share.tags)))

	// 根据搜索关键词和标签筛选分享数据
	const filteredShares = shares.filter(share => {
		// 名称或描述包含搜索词（大小写不敏感）
		const matchesSearch = share.name.toLowerCase().includes(searchTerm.toLowerCase()) || share.description.toLowerCase().includes(searchTerm.toLowerCase())
		// 标签匹配：如果选择全部则匹配，否则必须包含该标签
		const matchesTag = selectedTag === 'all' || share.tags.includes(selectedTag)
		return matchesSearch && matchesTag
	})

	return (
		// 外层容器，控制最大宽度和居中对齐
		<div className='mx-auto w-full max-w-7xl px-6 pt-24 pb-12'>
			{/* 搜索栏与标签筛选区域 */}
			<div className='mb-8 space-y-4'>
				{/* 搜索输入框 */}
				<input
					type='text'
					placeholder='搜索资源...'
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					className='focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none'
				/>

				{/* 标签筛选按钮组 */}
				<div className='flex flex-wrap justify-center gap-2'>
					{/* “全部”按钮，高亮表示当前选中 */}
					<button
						onClick={() => setSelectedTag('all')}
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedTag === 'all' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						全部
					</button>
					{/* 遍历所有标签，生成对应的筛选按钮 */}
					{allTags.map(tag => (
						<button
							key={tag}
							onClick={() => setSelectedTag(tag)}
							className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
								selectedTag === tag ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}>
							{tag}
						</button>
					))}
				</div>
			</div>

			{/* 卡片网格布局：移动端单列，平板双列，桌面三列 */}
			<div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
				{/* 渲染筛选后的分享卡片 */}
				{filteredShares.map(share => (
					<ShareCard
						key={share.url} // 使用分享链接作为唯一 key
						share={share}
						isEditMode={isEditMode}
						onUpdate={onUpdate}
						onDelete={() => onDelete?.(share)} // 安全调用删除回调，避免未定义时报错
					/>
				))}
			</div>

			{/* 空状态提示：当没有符合筛选条件的分享时显示 */}
			{filteredShares.length === 0 && (
				<div className='mt-12 text-center text-gray-500'>
					<p>没有找到相关资源</p>
				</div>
			)}
		</div>
	)
}
