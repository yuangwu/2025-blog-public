// 标记该组件为 Next.js 客户端组件（App Router 模式下必需，用于使用 React 状态、事件等客户端特性）
'use client'

// 导入 React 的状态钩子 useState
import { useState } from 'react'

// 导入本地类型定义（头像上传组件的项类型）
import { type AvatarItem } from './components/avatar-upload'
// 导入本地组件（博主卡片组件）
import { BloggerCard } from './components/blogger-card'

// 定义博主状态类型：'recent'（近期更新）或 'disconnected'（长期失联）
export type BloggerStatus = 'recent' | 'disconnected'

// 定义博主数据结构接口
export interface Blogger {
	name: string
	// 博主名称
	avatar: string
	// 博主头像 URL
	url: string 
	// 博主链接（唯一标识，用于 key）
	description: string
	// 博主简介
	stars: number
	// 博主评分/星级
	status?: BloggerStatus
	// 博主状态（可选，默认为 'recent'）
}

// 定义 GridView 组件的 Props 接口
interface GridViewProps {
	bloggers: Blogger[]
	// 博主数据数组
	isEditMode?: boolean
	// 是否为编辑模式（可选，默认 false）
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void
	// 更新博主的回调函数（可选）
	onDelete?: (blogger: Blogger) => void
	// 删除博主的回调函数（可选）
}

// 定义并导出默认组件 GridView（博主网格视图）
export default function GridView({ bloggers, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	// 状态：搜索关键词，初始为空字符串
	const [searchTerm, setSearchTerm] = useState('')
	// 状态：选中的分类（博主状态），初始为 'recent'
	const [selectedCategory, setSelectedCategory] = useState<BloggerStatus>('recent')

	// 计算属性：根据搜索词和分类过滤后的博主列表
	const filteredBloggers = bloggers.filter(blogger => {
		// 如果博主没有 status，默认视为 'recent'
		const status = blogger.status ?? 'recent'
		// 判断是否匹配当前选中的分类
		const matchesCategory = status === selectedCategory
		// 判断是否匹配搜索词（不区分大小写，匹配名称或简介）
		const matchesSearch =
			blogger.name.toLowerCase().includes(searchTerm.toLowerCase()) || blogger.description.toLowerCase().includes(searchTerm.toLowerCase())
		// 返回同时满足分类和搜索条件的博主
		return matchesCategory && matchesSearch
	})

	// 渲染组件 UI
	return (
		// 外层容器：设置最大宽度、水平居中、内边距
		<div className='mx-auto w-full max-w-7xl px-6 pt-24 pb-12'>
			{/* 搜索和筛选区域：底部间距 */}
			<div className='mb-8 space-y-4'>
				{/* 搜索输入框 */}
				<input
					type='text'
					placeholder='搜索博主...'
					value={searchTerm}
					// 绑定搜索词状态
					onChange={e => setSearchTerm(e.target.value)}
					// 输入变化时更新搜索词
					className='focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none'
				/>

				{/* 分类按钮组：居中、换行、按钮间距 */}
				<div className='flex flex-wrap justify-center gap-2'>
					{/* "近期更新" 按钮 */}
					<button
						onClick={() => setSelectedCategory('recent')}
						// 点击时切换分类为 'recent'
						// 动态样式：选中时用品牌色背景+白字，未选中时灰色背景+深灰字，悬停加深灰色
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedCategory === 'recent' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						近期更新
					</button>
					{/* "长期失联" 按钮 */}
					<button
						onClick={() => setSelectedCategory('disconnected')}
						// 点击时切换分类为 'disconnected'
						// 动态样式同上
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedCategory === 'disconnected' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						长期失联
					</button>
				</div>
			</div>

			{/* 博主卡片网格：响应式布局（移动端1列，平板2列，桌面3列），卡片间距 */}
			<div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
				{/* 遍历过滤后的博主数组，渲染 BloggerCard */}
				{filteredBloggers.map(blogger => (
					<BloggerCard 
						key={blogger.url}
						// 使用博主链接作为唯一 key
						blogger={blogger}
						// 传递博主数据
						isEditMode={isEditMode}
						// 传递编辑模式状态
						onUpdate={onUpdate}
						// 传递更新回调
						onDelete={() => onDelete?.(blogger)}
						// 传递删除回调（安全调用，避免 onDelete 为空时报错）
					/>
				))}
			</div>

			{/* 空状态：当没有匹配的博主时显示 */}
			{filteredBloggers.length === 0 && (
				<div className='mt-12 text-center text-gray-500'>
					<p>没有找到相关博主</p>
				</div>
			)}
		</div>
	)
}
