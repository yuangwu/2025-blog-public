// 声明这是一个客户端组件，仅在浏览器端执行（Next.js 的 "use client" 指令）
'use client'

// 从 React 中导入 useState 钩子，用于管理组件内部状态
import { useState } from 'react'

// 导入 LogoItem 类型，定义在 logo-upload-dialog 组件中，与 Logo 上传相关
import { type LogoItem } from './components/logo-upload-dialog'
// 导入 ShareCard 组件和 Share 类型，用于渲染单个资源卡片及其数据结构
import { ShareCard, type Share } from './components/share-card'

// 定义 GridView 组件接收的 props 类型
interface GridViewProps {
	shares: Share[] // 资源数组，每项是一个 Share 对象
	isEditMode?: boolean // 可选的编辑模式标识，默认 false
	onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void // 可选的更新回调，传入新资源、旧资源和可选的 LogoItem
	onDelete?: (share: Share) => void // 可选的删除回调，传入要删除的资源
}

// 默认导出 GridView 函数组件，接收解构的 props，并设定 isEditMode 默认值为 false
export default function GridView({ shares, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	// 管理搜索关键词的状态，初始为空字符串
	const [searchTerm, setSearchTerm] = useState('')
	// 管理当前选中的标签过滤条件，初始为 'all' 表示显示全部
	const [selectedTag, setSelectedTag] = useState<string>('all')

	// 获取所有资源中出现的所有不重复标签，用于渲染标签过滤按钮
	// 使用 flatMap 合并所有资源的 tags 数组，再通过 Set 去重，最后转为数组
	const allTags = Array.from(new Set(shares.flatMap(share => share.tags)))

	// 根据搜索词和选中标签过滤资源列表
	const filteredShares = shares.filter(share => {
		// 检查资源名称或描述是否包含搜索词（忽略大小写）
		const matchesSearch = share.name.toLowerCase().includes(searchTerm.toLowerCase()) || share.description.toLowerCase().includes(searchTerm.toLowerCase())
		// 检查资源是否包含选中的标签，若选中 'all' 则全部通过
		const matchesTag = selectedTag === 'all' || share.tags.includes(selectedTag)
		// 两个条件同时满足才保留
		return matchesSearch && matchesTag
	})

	// 返回组件的 JSX 结构
	return (
		// 外层容器，设置最大宽度、水平内边距和垂直内边距
		<div className='mx-auto w-full max-w-7xl px-6 pt-24 pb-12'>
			{/* 搜索栏与标签过滤区域 */}
			<div className='mb-8 space-y-4'>
				{/* 搜索输入框 */}
				<input
					type='text'
					placeholder='搜索资源...'
					value={searchTerm}
					// 当输入内容变化时更新 searchTerm 状态
					onChange={e => setSearchTerm(e.target.value)}
					// 样式：聚焦时显示品牌色圆环边框等
					className='focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none'
				/>

				{/* 标签过滤按钮组，水平排列居中，换行适配 */}
				<div className='flex flex-wrap justify-center gap-2'>
					{/* “全部” 按钮：点击后取消标签过滤，显示 selectedTag 为 'all' */}
					<button
						onClick={() => setSelectedTag('all')}
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							// 根据当前选中状态动态应用样式
							selectedTag === 'all' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						全部
					</button>
					{/* 遍历所有标签，生成对应的过滤按钮 */}
					{allTags.map(tag => (
						<button
							key={tag} // 用标签本身作为唯一键
							onClick={() => setSelectedTag(tag)} // 点击后设置该标签为选中
							className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
								// 选中时应用品牌样式，否则为默认灰色样式
								selectedTag === tag ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}>
							{tag}
						</button>
					))}
				</div>
			</div>

			{/* 资源卡片网格布局，响应式列数：移动端1列，中等屏幕2列，大屏3列 */}
			<div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
				{/* 遍历过滤后的资源列表，为每个资源渲染一个 ShareCard */}
				{filteredShares.map(share => (
					<ShareCard
						key={share.url} // 使用资源的 url 作为唯一标识
						share={share} // 传入资源数据
						isEditMode={isEditMode} // 传入编辑模式状态
						onUpdate={onUpdate} // 传入更新回调
						onDelete={() => onDelete?.(share)} // 封装删除回调，若存在则调用并传递当前资源
					/>
				))}
			</div>

			{/* 当过滤后没有任何资源时，显示空状态提示 */}
			{filteredShares.length === 0 && (
				<div className='mt-12 text-center text-gray-500'>
					<p>没有找到相关资源</p>
				</div>
			)}
		</div>
	)
}