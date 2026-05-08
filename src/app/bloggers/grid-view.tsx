'use client'

// 引入 React 的状态管理钩子
import { useState } from 'react'

// 从头像上传对话框组件中引入 AvatarItem 类型（用于 onUpdate 回调的可选参数）
import { type AvatarItem } from './components/avatar-upload-dialog'
// 引入博主卡片展示组件
import { BloggerCard } from './components/blogger-card'

// 博主状态类型：recent 表示近期更新，disconnected 表示长期失联
export type BloggerStatus = 'recent' | 'disconnected'

// 博主数据结构
export interface Blogger {
	name: string         // 博主名称
	avatar: string       // 头像地址
	url: string          // 博主主页链接
	description: string  // 简介/描述
	stars: number        // 星标数
	status?: BloggerStatus // 更新状态（可选，默认视为近期更新）
}

// GridView 组件的属性接口
interface GridViewProps {
	bloggers: Blogger[]                                // 博主数据列表
	isEditMode?: boolean                               // 是否处于编辑模式（控制删除、更新按钮显示）
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void // 更新博主时的回调
	onDelete?: (blogger: Blogger) => void              // 删除博主时的回调
}

// 网格视图主组件，用于展示并过滤、编辑博主卡片
export default function GridView({ bloggers, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	// 搜索关键词状态
	const [searchTerm, setSearchTerm] = useState('')
	// 当前选中的分类状态（默认显示“近期更新”的博主）
	const [selectedCategory, setSelectedCategory] = useState<BloggerStatus>('recent')

	// 根据分类和搜索关键词过滤博主列表
	const filteredBloggers = bloggers.filter(blogger => {
		// 未设置 status 时默认视为 'recent'
		const status = blogger.status ?? 'recent'
		// 是否匹配当前选中的分类
		const matchesCategory = status === selectedCategory
		// 是否匹配搜索框输入（搜索名称或描述）
		const matchesSearch =
			blogger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			blogger.description.toLowerCase().includes(searchTerm.toLowerCase())
		// 同时满足分类和搜索条件才显示
		return matchesCategory && matchesSearch
	})

	return (
		<div className='mx-auto w-full max-w-7xl px-6 pt-24 pb-12'>
			{/* 搜索和分类筛选区域 */}
			<div className='mb-8 space-y-4'>
				{/* 搜索输入框 */}
				<input
					type='text'
					placeholder='搜索博主...'
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					className='focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none'
				/>

				{/* 分类切换按钮组 */}
				<div className='flex flex-wrap justify-center gap-2'>
					<button
						onClick={() => setSelectedCategory('recent')}
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedCategory === 'recent'
								? 'bg-brand text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						近期更新
					</button>
					<button
						onClick={() => setSelectedCategory('disconnected')}
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedCategory === 'disconnected'
								? 'bg-brand text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						长期失联
					</button>
				</div>
			</div>

			{/* 博主卡片网格布局 */}
			<div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
				{filteredBloggers.map(blogger => (
					<BloggerCard
						key={blogger.url}                  // 使用博主链接作为唯一标识
						blogger={blogger}
						isEditMode={isEditMode}
						onUpdate={onUpdate}
						onDelete={() => onDelete?.(blogger)} // 安全调用，避免未传入时出错
					/>
				))}
			</div>

			{/* 无匹配结果时的提示 */}
			{filteredBloggers.length === 0 && (
				<div className='mt-12 text-center text-gray-500'>
					<p>没有找到相关博主</p>
				</div>
			)}
		</div>
	)
}
