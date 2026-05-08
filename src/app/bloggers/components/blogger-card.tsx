'use client'

import { motion } from 'motion/react'
import StarRating from '@/components/star-rating'
import { useSize } from '@/hooks/use-size'
import { cn } from '@/lib/utils'
import EditableStarRating from '@/components/editable-star-rating'
import { Blogger, type BloggerStatus } from '../grid-view'
import { useState } from 'react'
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog'

// 卡片组件的属性接口
interface BloggerCardProps {
	blogger: Blogger
	isEditMode?: boolean // 是否处于编辑模式（显示编辑/删除按钮）
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void
	onDelete?: () => void
}

// 博主卡片组件，可展示信息，支持编辑模式下的修改、头像上传等
export function BloggerCard({ blogger, isEditMode = false, onUpdate, onDelete }: BloggerCardProps) {
	const [expanded, setExpanded] = useState(false) // 描述文字展开状态
	const [isEditing, setIsEditing] = useState(false) // 是否正在编辑中
	const { maxSM } = useSize() // 使用自定义hook获取是否小于sm断点，用于动画策略
	const [localBlogger, setLocalBlogger] = useState(blogger) // 本地缓存的博主数据副本
	const [showAvatarDialog, setShowAvatarDialog] = useState(false) // 控制头像上传弹窗显示
	const [avatarItem, setAvatarItem] = useState<AvatarItem | null>(null) // 存储最新选择的头像项

	// 通用字段修改处理：更新本地状态并通知父组件
	const handleFieldChange = (field: keyof Blogger, value: any) => {
		const updated = { ...localBlogger, [field]: value }
		setLocalBlogger(updated)
		// 回调时传入新数据、旧数据和可能已存在的头像项
		onUpdate?.(updated, blogger, avatarItem || undefined)
	}

	// 头像上传提交处理：根据头像类型设置URL，更新本地状态并通知父组件
	const handleAvatarSubmit = (avatar: AvatarItem) => {
		setAvatarItem(avatar)
		// 根据头像类型选择正确的URL：链接类型直接使用url，文件类型使用预览URL
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		const updated = { ...localBlogger, avatar: avatarUrl }
		setLocalBlogger(updated)
		onUpdate?.(updated, blogger, avatar)
	}

	// 取消编辑：还原为原始博主数据，退出编辑状态，清除头像选择
	const handleCancel = () => {
		setLocalBlogger(blogger)
		setIsEditing(false)
		setAvatarItem(null)
	}

	// 判断当前是否允许编辑（处于编辑模式且正在编辑）
	const canEdit = isEditMode && isEditing

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.6 }} // 初始动画状态：透明且缩小
			// 根据屏幕大小选择动画触发方式：小屏直接播放动画，大屏则在进入视口时播放
			{...(maxSM ? { animate: { opacity: 1, scale: 1 } } : { whileInView: { opacity: 1, scale: 1 } })}
			className='card relative block overflow-hidden'>
			{/* 编辑模式下的操作按钮组 */}
			{isEditMode && (
				<div className='absolute top-3 right-3 z-10 flex gap-2'>
					{isEditing ? (
						<>
							{/* 取消编辑按钮 */}
							<button onClick={handleCancel} className='rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
								取消
							</button>
							{/* 完成编辑按钮 */}
							<button onClick={() => setIsEditing(false)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
								完成
							</button>
						</>
					) : (
						<>
							{/* 进入编辑状态按钮 */}
							<button onClick={() => setIsEditing(true)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
								编辑
							</button>
							{/* 删除当前卡片按钮 */}
							<button onClick={onDelete} className='rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:text-red-600'>
								删除
							</button>
						</>
					)}
				</div>
			)}

			<div>
				{/* 头像与基本信息行 */}
				<div className='mb-4 flex items-center gap-4'>
					<div className='group relative'>
						<img
							src={localBlogger.avatar}
							alt={localBlogger.name}
							className={cn('h-16 w-16 rounded-full object-cover', canEdit && 'cursor-pointer')}
							// 可编辑状态下点击头像触发上传弹窗
							onClick={() => canEdit && setShowAvatarDialog(true)}
						/>
						{/* 编辑模式下头像悬浮层：显示“更换”提示 */}
						{canEdit && (
							<div className='ev pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
								<span className='text-xs text-white'>更换</span>
							</div>
						)}
					</div>
					<div className='flex-1'>
						{/* 博主名称，可编辑时支持直接修改 */}
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							className={cn('group-hover:text-brand text-lg font-bold transition-colors focus:outline-none', canEdit && 'cursor-text')}>
							{localBlogger.name}
						</h3>
						{/* 网站链接：编辑状态下可修改，非编辑状态下为可点击的外部链接 */}
						{canEdit ? (
							<div
								contentEditable
								suppressContentEditableWarning
								onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
								className='text-secondary mt-1 block max-w-[200px] cursor-text truncate text-xs focus:outline-none'>
								{localBlogger.url}
							</div>
						) : (
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

				{/* 评分展示：编辑模式使用可编辑星级组件，否则使用只读组件 */}
				{canEdit ? (
					<EditableStarRating stars={localBlogger.stars} editable={true} onChange={stars => handleFieldChange('stars', stars)} />
				) : (
					<StarRating stars={localBlogger.stars} />
				)}

				{/* 编辑状态下显示状态切换按钮 */}
				{canEdit && (
					<div className='mt-2 flex gap-2'>
						{(['recent', 'disconnected'] as BloggerStatus[]).map(status => (
							<button
								key={status}
								type='button'
								onClick={() => handleFieldChange('status', status)}
								className={`rounded-full px-3 py-1 text-xs transition-colors ${
									(localBlogger.status ?? 'recent') === status ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
								}`}>
								{/* 中文映射状态名称 */}
								{status === 'recent' ? '近期更新' : '长期失联'}
							</button>
						))}
					</div>
				)}

				{/* 博主描述：可编辑状态下直接修改；非编辑状态下点击展开/收起全文 */}
				<p
					contentEditable={canEdit}
					suppressContentEditableWarning
					onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
					onClick={e => {
						if (!canEdit) {
							e.preventDefault()
							setExpanded(!expanded)
						}
					}}
					className={cn(
						'mt-3 text-sm leading-relaxed text-gray-600 transition-all duration-300 focus:outline-none',
						canEdit ? 'cursor-text' : 'cursor-pointer',
						// 非编辑状态下根据展开状态控制文本行数
						!canEdit && (expanded ? 'line-clamp-none' : 'line-clamp-3')
					)}>
					{localBlogger.description}
				</p>
			</div>

			{/* 可编辑状态下显示头像上传弹窗 */}
			{canEdit && showAvatarDialog && (
				<AvatarUploadDialog currentAvatar={localBlogger.avatar} onClose={() => setShowAvatarDialog(false)} onSubmit={handleAvatarSubmit} />
			)}
		</motion.div>
	)
}
