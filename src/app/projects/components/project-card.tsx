'use client' // 标记为客户端组件，允许使用交互状态和事件处理

import { useState } from 'react' // 管理编辑模式、对话框等本地状态
import { motion } from 'motion/react' // 实现动画效果
import Link from 'next/link' // 用于非编辑模式下的外链跳转
import { cn } from '@/lib/utils' // 拼接 css 类名的工具函数
import { useSize } from '@/hooks/use-size' // 自定义 hook，获取屏幕尺寸或断点信息
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog' // 封装的图片上传/粘贴弹窗组件

// 项目数据接口定义
export interface Project {
	name: string // 项目名称
	year: number // 项目年份
	description: string // 项目描述
	image: string // 项目配图 URL
	url: string // 项目网站链接
	tags: string[] // 项目标签数组
	github?: string // 可选的 GitHub 链接
	npm?: string // 可选的 NPM 链接
}

// ProjectCard 组件的 Props 类型
interface ProjectCardProps {
	project: Project // 当前要展示或编辑的项目数据
	isEditMode?: boolean // 是否允许进入编辑模式
	onUpdate?: (project: Project, oldProject: Project, imageItem?: ImageItem) => void // 编辑确认时的回调，传入新数据、旧数据和图片对象
	onDelete?: () => void // 删除项目时的回调
}

// 项目卡片组件，支持展示和行内编辑
export function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
	// 是否处于编辑状态
	const [isEditing, setIsEditing] = useState(false)
	// 获取当前视口是否为小屏（如手机），用于动画方式区分
	const { maxSM } = useSize()
	// 本地项目数据副本，编辑过程中的临时状态
	const [localProject, setLocalProject] = useState(project)
	// 图片上传弹窗是否显示
	const [showImageDialog, setShowImageDialog] = useState(false)
	// 存储最近一次图片上传/选择返回的 ImageItem 信息
	const [imageItem, setImageItem] = useState<ImageItem | null>(null)

	// 修改项目某个字段值，同时触发外层的 onUpdate 回调
	const handleFieldChange = (field: keyof Project, value: any) => {
		const updated = { ...localProject, [field]: value }
		setLocalProject(updated)
		// 通知父组件项目已变更，传递 imageItem 用于可能的图片处理
		onUpdate?.(updated, project, imageItem || undefined)
	}

	// 处理图片上传弹窗提交后的逻辑
	const handleImageSubmit = (image: ImageItem) => {
		setImageItem(image)
		// 根据图片类型获取 URL（输入网址或上传后的预览地址）
		const imageUrl = image.type === 'url' ? image.url : image.previewUrl
		const updated = { ...localProject, image: imageUrl }
		setLocalProject(updated)
		// 向上传递最新数据和图片对象
		onUpdate?.(updated, project, image)
	}

	// 处理标签输入框的变更，支持逗号分隔自动解析为数组
	const handleTagsChange = (tagsStr: string) => {
		const tags = tagsStr
			.split(',')
			.map(t => t.trim())
			.filter(t => t) // 过滤空字符串
		handleFieldChange('tags', tags)
	}

	// 取消编辑，恢复为原始 project 数据
	const handleCancel = () => {
		setLocalProject(project)
		setIsEditing(false)
		setImageItem(null) // 重置图片临时项
	}

	// 判断是否可以编辑：既处于编辑模式，又已切换到编辑状态
	const canEdit = isEditMode && isEditing

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }} // 初始透明且略微缩小
			{...(maxSM
				? { animate: { opacity: 1, scale: 1 } } // 小屏幕直接播放动画
				: { whileInView: { opacity: 1, scale: 1 } } // 大屏则在进入视口时触发动画
			)}
			className='card relative flex flex-col gap-4'>
			{/* 编辑模式下的操作按钮：取消/完成 或 编辑/删除 */}
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

			{/* 上方：图片 + 标题、年份、标签 */}
			<div className='flex items-start gap-4'>
				<div className='group relative'>
					<img
						src={localProject.image}
						alt={localProject.name}
						className={cn('h-16 w-16 shrink-0 rounded-xl object-cover', canEdit && 'cursor-pointer')}
						onClick={() => canEdit && setShowImageDialog(true)} // 可编辑时点击打开图片上传弹窗
					/>
					{/* 图片上的半透明遮罩与“更换”提示，鼠标悬浮显示 */}
					{canEdit && (
						<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
							<span className='text-xs text-white'>更换</span>
						</div>
					)}
				</div>

				<div className='flex-1'>
					<div className='flex items-center gap-2'>
						{/* 标题：可编辑时使用 contentEditable */}
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							className={cn('text-lg font-semibold', canEdit && 'cursor-text focus:outline-none')}>
							{localProject.name}
						</h3>
						{/* 年份：编辑时显示数字输入框，否则显示普通文本 */}
						{canEdit ? (
							<input
								type='number'
								value={localProject.year}
								onChange={e => handleFieldChange('year', parseInt(e.target.value) || 0)}
								className='text-secondary border-secondary/20 w-18 rounded border px-2 py-1 text-sm focus:outline-none'
							/>
						) : (
							<span className='text-secondary text-sm'>{localProject.year}</span>
						)}
					</div>
					{/* 标签区域 */}
					<div className='mt-2 flex flex-wrap gap-2'>
						{canEdit ? (
							// 编辑状态：用输入框统一编辑标签，逗号分隔
							<input
								type='text'
								value={localProject.tags.join(', ')}
								onChange={e => handleTagsChange(e.target.value)}
								placeholder='标签，用逗号分隔'
								className='bg-secondary/10 border-secondary/20 w-full rounded-lg border px-2 py-1 text-xs focus:outline-none'
							/>
						) : (
							// 展示模式：渲染多个标签 badge
							localProject.tags.map(tag => (
								<span key={tag} className='text-secondary bg-card rounded-lg px-2 py-1 text-xs'>
									{tag}
								</span>
							))
						)}
					</div>
				</div>
			</div>

			{/* 项目描述：可编辑时允许直接修改文本 */}
			<p
				contentEditable={canEdit}
				suppressContentEditableWarning
				onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
				className={cn('text-secondary text-sm leading-relaxed', canEdit && 'cursor-text focus:outline-none')}>
				{localProject.description}
			</p>

			{/* 底部链接：Website、GitHub、NPM */}
			<div className='flex flex-wrap gap-2'>
				{canEdit ? (
					// 编辑状态：三个 URL 输入框
					<>
						<input
							type='url'
							value={localProject.url}
							onChange={e => handleFieldChange('url', e.target.value)}
							placeholder='网站 URL'
							className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
						/>
						<input
							type='url'
							value={localProject.github || ''}
							onChange={e => handleFieldChange('github', e.target.value || undefined)}
							placeholder='GitHub URL（可选）'
							className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
						/>
						<input
							type='url'
							value={localProject.npm || ''}
							onChange={e => handleFieldChange('npm', e.target.value || undefined)}
							placeholder='NPM URL（可选）'
							className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
						/>
					</>
				) : (
					// 展示模式：渲染为可点击的 Link，仅当存在对应 URL 时显示
					<>
						<Link
							href={localProject.url}
							target='_blank'
							rel='noopener noreferrer'
							className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
							Website
						</Link>
						{localProject.github && (
							<Link
								href={localProject.github}
								target='_blank'
								rel='noopener noreferrer'
								className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
								GitHub
							</Link>
						)}
						{localProject.npm && (
							<Link
								href={localProject.npm}
								target='_blank'
								rel='noopener noreferrer'
								className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
								NPM
							</Link>
						)}
					</>
				)}
			</div>

			{/* 图片上传弹窗：仅在可编辑且已触发时渲染 */}
			{canEdit && showImageDialog && (
				<ImageUploadDialog
					currentImage={localProject.image} // 传入当前图片 URL 用于预览或默认值
					onClose={() => setShowImageDialog(false)} // 关闭弹窗
					onSubmit={handleImageSubmit} // 提交图片后的处理
				/>
			)}
		</motion.div>
	)
}
