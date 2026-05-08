'use client' // 标记为客户端组件，仅在浏览器端渲染

import { motion } from 'motion/react' // 引入 motion 动画组件
import StarRating from '@/components/star-rating' // 只读的星级评分组件
import { useSize } from '@/hooks/use-size' // 自定义 hook，获取屏幕尺寸信息，如 maxSM
import { cn } from '@/lib/utils' // 工具函数，用于合并 className
import EditableStarRating from '@/components/editable-star-rating' // 可编辑的星级评分组件
import { useState } from 'react'
import LogoUploadDialog, { type LogoItem } from './logo-upload-dialog' // Logo 上传弹窗组件与类型

// 分享项数据结构
export interface Share {
	name: string        // 名称
	logo: string        // Logo 图片地址
	url: string         // 链接
	description: string // 描述
	tags: string[]      // 标签数组
	stars: number       // 星级评分
}

// 组件属性
interface ShareCardProps {
	share: Share                          // 分享数据
	isEditMode?: boolean                  // 是否处于编辑模式
	onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void // 更新回调
	onDelete?: () => void                 // 删除回调
}

// 分享卡片组件
export function ShareCard({ share, isEditMode = false, onUpdate, onDelete }: ShareCardProps) {
	// 描述文本是否展开
	const [expanded, setExpanded] = useState(false)
	// 当前卡片是否处于编辑状态
	const [isEditing, setIsEditing] = useState(false)
	// 屏幕尺寸监听，maxSM 表示是否小于小屏断点
	const { maxSM } = useSize()
	// 本地可修改的分享数据副本
	const [localShare, setLocalShare] = useState(share)
	// 是否显示 Logo 上传弹窗
	const [showLogoDialog, setShowLogoDialog] = useState(false)
	// 暂存已选择的 Logo 数据（包含临时预览地址等）
	const [logoItem, setLogoItem] = useState<LogoItem | null>(null)

	// 修改本地数据某个字段并回调通知父组件
	const handleFieldChange = (field: keyof Share, value: any) => {
		const updated = { ...localShare, [field]: value }
		setLocalShare(updated)
		onUpdate?.(updated, share, logoItem || undefined)
	}

	// 处理 Logo 提交：更新本地 logo 字段并保存 logoItem 原始数据
	const handleLogoSubmit = (logo: LogoItem) => {
		setLogoItem(logo)
		// 根据 Logo 来源类型取对应的地址作为显示用 URL
		const logoUrl = logo.type === 'url' ? logo.url : logo.previewUrl
		const updated = { ...localShare, logo: logoUrl }
		setLocalShare(updated)
		onUpdate?.(updated, share, logo)
	}

	// 处理标签输入框的变更，将逗号分隔字符串转为数组
	const handleTagsChange = (tagsStr: string) => {
		const tags = tagsStr
			.split(',')
			.map(t => t.trim())
			.filter(t => t) // 剔除空白项
		handleFieldChange('tags', tags)
	}

	// 取消编辑，恢复为原始数据
	const handleCancel = () => {
		setLocalShare(share)
		setIsEditing(false)
		setLogoItem(null)
	}

	// 是否允许编辑（必须同时满足：父组件传入编辑模式且卡片自身处于编辑状态）
	const canEdit = isEditMode && isEditing

	return (
		<motion.div
			// 初始动画状态
			initial={{ opacity: 0, scale: 0.6 }}
			// 根据屏幕尺寸选择不同的动画触发方式：小屏直接入场动画，大屏则滚动到视口才触发
			{...(maxSM ? { animate: { opacity: 1, scale: 1 } } : { whileInView: { opacity: 1, scale: 1 } })}
			className='card relative block overflow-hidden'
		>
			{/* 编辑模式下的操作按钮 */}
			{isEditMode && (
				<div className='absolute top-3 right-3 z-10 flex gap-2'>
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

			<div>
				{/* Logo 与标题、链接区域 */}
				<div className='mb-4 flex items-center gap-4'>
					<div className='group relative'>
						<img
							src={localShare.logo}
							alt={localShare.name}
							className={cn('h-16 w-16 rounded-xl object-cover', canEdit && 'cursor-pointer')}
							// 编辑状态下点击 Logo 可打开上传弹窗
							onClick={() => canEdit && setShowLogoDialog(true)}
						/>
						{/* 编辑状态下显示覆盖层提示“更换” */}
						{canEdit && (
							<div className='ev pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
								<span className='text-xs text-white'>更换</span>
							</div>
						)}
					</div>
					<div className='flex-1'>
						{/* 标题：编辑模式可编辑内容 */}
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							className={cn('group-hover:text-brand text-lg font-bold transition-colors focus:outline-none', canEdit && 'cursor-text')}
						>
							{localShare.name}
						</h3>
						{/* URL：根据编辑状态显示可编辑文本或链接 */}
						{canEdit ? (
							<div
								contentEditable
								suppressContentEditableWarning
								onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
								className='text-secondary mt-1 block max-w-[200px] cursor-text truncate text-xs focus:outline-none'
							>
								{localShare.url}
							</div>
						) : (
							<a
								href={localShare.url}
								target='_blank'
								rel='noopener noreferrer'
								className='text-secondary hover:text-brand mt-1 block max-w-[200px] truncate text-xs hover:underline'
							>
								{localShare.url}
							</a>
						)}
					</div>
				</div>

				{/* 星级评分 */}
				{canEdit ? (
					<EditableStarRating stars={localShare.stars} editable={true} onChange={stars => handleFieldChange('stars', stars)} />
				) : (
					<StarRating stars={localShare.stars} />
				)}

				{/* 标签区域：编辑时为输入框，否则显示标签徽章 */}
				<div className='mt-3 flex flex-wrap gap-1.5'>
					{canEdit ? (
						<input
							type='text'
							value={localShare.tags.join(', ')}
							onChange={e => handleTagsChange(e.target.value)}
							placeholder='标签，用逗号分隔'
							className='w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs focus:outline-none'
						/>
					) : (
						localShare.tags.map(tag => (
							<span key={tag} className='bg-secondary/10 rounded-full px-2.5 py-0.5 text-xs'>
								{tag}
							</span>
						))
					)}
				</div>

				{/* 描述文本：编辑时为可编辑段落，非编辑时点击可展开/收起 */}
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
						// 非编辑状态下，根据 expanded 控制行数截断
						!canEdit && (expanded ? 'line-clamp-none' : 'line-clamp-3')
					)}
				>
					{localShare.description}
				</p>
			</div>

			{/* Logo 上传弹窗，仅在编辑状态且点击更换时显示 */}
			{canEdit && showLogoDialog && (
				<LogoUploadDialog
					currentLogo={localShare.logo}
					onClose={() => setShowLogoDialog(false)}
					onSubmit={handleLogoSubmit}
				/>
			)}
		</motion.div>
	)
}
