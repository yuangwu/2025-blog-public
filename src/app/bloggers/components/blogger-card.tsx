// 标记为 Next.js 13+ 客户端组件（必须在文件顶部）
'use client'

// 导入 Framer Motion 动画库（React 版本）
import { motion } from 'motion/react'
// 导入自定义星级评分组件（只读）
import StarRating from '@/components/star-rating'
// 导入自定义 Hook：用于获取屏幕尺寸断点
import { useSize } from '@/hooks/use-size'
// 导入工具函数：用于合并 Tailwind CSS 类名
import { cn } from '@/lib/utils'
// 导入自定义星级评分组件（可编辑）
import EditableStarRating from '@/components/editable-star-rating'
// 导入博主数据类型和状态类型（从父组件 grid-view 引入）
import { Blogger, type BloggerStatus } from '../grid-view'
// 导入 React 状态管理 Hook
import { useState } from 'react'
// 导入头像上传对话框组件及其类型
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog'

// 定义组件 Props 类型接口
interface BloggerCardProps {
	blogger: Blogger // 博主数据对象
	isEditMode?: boolean // 是否处于“全局编辑模式”（可选，默认 false）
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void // 更新博主信息的回调
	onDelete?: () => void // 删除博主的回调
}

// 导出博主卡片组件
export function BloggerCard({ blogger, isEditMode = false, onUpdate, onDelete }: BloggerCardProps) {
	// 状态：描述文本是否展开（非编辑模式下点击描述切换）
	const [expanded, setExpanded] = useState(false)
	// 状态：当前卡片是否处于“编辑中”状态（点击“编辑”按钮触发）
	const [isEditing, setIsEditing] = useState(false)
	// 从 useSize Hook 获取屏幕尺寸断点（maxSM = 是否小于等于小屏）
	const { maxSM } = useSize()
	// 本地状态：存储当前卡片的博主数据（用于编辑时的临时修改，不直接影响父组件）
	const [localBlogger, setLocalBlogger] = useState(blogger)
	// 状态：是否显示头像上传对话框
	const [showAvatarDialog, setShowAvatarDialog] = useState(false)
	// 状态：存储当前选中的新头像数据
	const [avatarItem, setAvatarItem] = useState<AvatarItem | null>(null)

	/**
	 * 处理“文本字段”变化（如姓名、链接、描述）
	 * @param field - 要修改的字段名（keyof Blogger 确保类型安全）
	 * @param value - 新值
	 */
	const handleFieldChange = (field: keyof Blogger, value: any) => {
		// 基于本地状态创建新对象（不可变更新）
		const updated = { ...localBlogger, [field]: value }
		// 更新本地状态
		setLocalBlogger(updated)
		// 调用父组件传入的 onUpdate 回调（如果有）
		onUpdate?.(updated, blogger, avatarItem || undefined)
	}

	/**
	 * 处理“头像上传提交”
	 * @param avatar - 新头像数据
	 */
	const handleAvatarSubmit = (avatar: AvatarItem) => {
		// 保存新头像数据到状态
		setAvatarItem(avatar)
		// 根据头像类型（URL 或 文件）获取最终显示链接
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		// 更新本地博主数据的头像字段
		const updated = { ...localBlogger, avatar: avatarUrl }
		setLocalBlogger(updated)
		// 通知父组件更新
		onUpdate?.(updated, blogger, avatar)
	}

	/**
	 * 处理“取消编辑”
	 */
	const handleCancel = () => {
		// 重置本地数据为原始传入的 blogger 数据
		setLocalBlogger(blogger)
		// 退出“编辑中”状态
		setIsEditing(false)
		// 清空临时头像数据
		setAvatarItem(null)
	}

	// 计算属性：当前是否真正“可编辑”（需要同时满足“全局编辑模式开”且“当前卡片编辑中”）
	const canEdit = isEditMode && isEditing

	return (
		{/* Framer Motion 动画容器：卡片入场动画 */}
		<motion.div
			// 初始状态：透明、缩小
			initial={{ opacity: 0, scale: 0.6 }}
			// 根据屏幕尺寸选择动画触发方式：
			// 小屏(maxSM)：直接 animate 触发；大屏：whileInView（滚动到视图时触发）
			{...(maxSM ? { animate: { opacity: 1, scale: 1 } } : { whileInView: { opacity: 1, scale: 1 } })}
			// 卡片基础样式：相对定位、块级、溢出隐藏
			className='card relative block overflow-hidden'>
			
			{/* 如果是“全局编辑模式”，显示右上角操作按钮组 */}
			{isEditMode && (
				<div className='absolute top-3 right-3 z-10 flex gap-2'>
					{/* 情况1：当前卡片正在编辑中 -> 显示“取消”和“完成” */}
					{isEditing ? (
						<>
							<button onClick={handleCancel} className='rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
								取消
							</button>
							<button onClick={() => setIsEditing(false)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
								完成
							</button>
						</>
					) : (
						// 情况2：当前卡片未编辑 -> 显示“编辑”和“删除”
						<>
							<button onClick={() => setIsEditing(true)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
								编辑
							</button>
							<button onClick={onDelete} className='rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:text-red-600'>
								删除
							</button>
						</>
					)}
				</div>
			)}

			{/* 卡片主体内容区域 */}
			<div>
				{/* 第一行：头像 + 姓名 + 链接 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 头像区域（使用 group 包裹以实现 hover 联动效果） */}
					<div className='group relative'>
						<img
							src={localBlogger.avatar} // 头像地址
							alt={localBlogger.name} // 替代文本
							// 样式：16x16 圆形、覆盖填充；可编辑时鼠标变手型
							className={cn('h-16 w-16 rounded-full object-cover', canEdit && 'cursor-pointer')}
							// 点击事件：可编辑状态下打开头像上传对话框
							onClick={() => canEdit && setShowAvatarDialog(true)}
						/>
						{/* 可编辑状态下：hover 头像显示“更换”遮罩层 */}
						{canEdit && (
							<div className='ev pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
								<span className='text-xs text-white'>更换</span>
							</div>
						)}
					</div>

					{/* 姓名 + 链接区域 */}
					<div className='flex-1'>
						{/* 博主姓名 */}
						<h3
							contentEditable={canEdit} // 是否可编辑
							suppressContentEditableWarning // 抑制 React 对 contentEditable 的警告
							// 失焦时触发更新：提取文本内容并调用 handleFieldChange
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							// 样式：hover 变品牌色、加粗、过渡；可编辑时鼠标变文本光标
							className={cn('group-hover:text-brand text-lg font-bold transition-colors focus:outline-none', canEdit && 'cursor-text')}>
							{localBlogger.name}
						</h3>

						{/* 博主链接 */}
						{canEdit ? (
							// 可编辑状态：显示为可编辑 div
							<div
								contentEditable
								suppressContentEditableWarning
								onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
								className='text-secondary mt-1 block max-w-[200px] cursor-text truncate text-xs focus:outline-none'>
								{localBlogger.url}
							</div>
						) : (
							// 非编辑状态：显示为超链接（新标签页打开）
							<a
								href={localBlogger.url}
								target='_blank'
								rel='noopener noreferrer'
								className='text-secondary hover:text-brand mt-1 block max-w-[200px] truncate text-xs hover:underline'>
								{localBlogger.url}
							</a>
						)}
					</div>
				</div>

				{/* 第二行：星级评分 */}
				{canEdit ? (
					// 可编辑状态：使用可编辑评分组件
					<EditableStarRating stars={localBlogger.stars} editable={true} onChange={stars => handleFieldChange('stars', stars)} />
				) : (
					// 非编辑状态：使用只读评分组件
					<StarRating stars={localBlogger.stars} />
				)}

				{/* 第三行：状态选择按钮（仅在可编辑时显示） */}
				{canEdit && (
					<div className='mt-2 flex gap-2'>
						{/* 遍历两种状态：'recent' (近期更新) 和 'disconnected' (长期失联) */}
						{(['recent', 'disconnected'] as BloggerStatus[]).map(status => (
							<button
								key={status}
								type='button'
								// 点击切换状态
								onClick={() => handleFieldChange('status', status)}
								// 动态样式：当前选中状态用品牌色背景，否则灰色背景
								className={`rounded-full px-3 py-1 text-xs transition-colors ${
									(localBlogger.status ?? 'recent') === status ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
								}`}>
								{/* 按钮文本映射 */}
								{status === 'recent' ? '近期更新' : '长期失联'}
							</button>
						))}
					</div>
				)}

				{/* 第四行：博主描述 */}
				<p
					contentEditable={canEdit} // 可编辑
					suppressContentEditableWarning
					// 失焦更新描述内容
					onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
					// 点击事件：非编辑模式下，点击切换“展开/收起”
					onClick={e => {
						if (!canEdit) {
							e.preventDefault()
							setExpanded(!expanded)
						}
					}}
					// 样式：
					// 1. 基础样式：上边距、小字体、行高、灰色
					// 2. 可编辑时：文本光标；否则：指针光标
					// 3. 非编辑模式下：展开则显示全部(line-clamp-none)，收起则最多显示3行(line-clamp-3)
					className={cn(
						'mt-3 text-sm leading-relaxed text-gray-600 transition-all duration-300 focus:outline-none',
						canEdit ? 'cursor-text' : 'cursor-pointer',
						!canEdit && (expanded ? 'line-clamp-none' : 'line-clamp-3')
					)}>
					{localBlogger.description}
				</p>
			</div>

			{/* 头像上传对话框（条件渲染：可编辑 且 对话框打开） */}
			{canEdit && showAvatarDialog && (
				<AvatarUploadDialog 
					currentAvatar={localBlogger.avatar} // 传入当前头像用于预览
					onClose={() => setShowAvatarDialog(false)} // 关闭对话框回调
					onSubmit={handleAvatarSubmit} // 提交新头像回调
				/>
			)}
		</motion.div>
	)
}