'use client' // 声明该组件为客户端组件，使用浏览器 API 和 React 钩子

import { useState, useEffect } from 'react'
import { toast } from 'sonner' // 引入 sonner 库的 toast 方法，用于弹出轻量通知
import { Plus } from 'lucide-react' // 引入 lucide-react 图标库中的 Plus 图标
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog' // 引入图片上传弹窗组件及其类型
import type { Project } from './project-card' // 引入项目卡片中定义的 Project 类型
import { DialogModal } from '@/components/dialog-modal' // 引入通用弹窗模态框组件

// 定义 CreateDialog 组件的 props 类型
interface CreateDialogProps {
	project: Project | null // 当前正在编辑的项目对象，为空时表示新建
	onClose: () => void // 关闭弹窗的回调函数
	onSave: (project: Project) => void // 保存项目的回调函数，返回编辑后的项目数据
}

/**
 * 创建或编辑项目的弹窗组件
 * 用于新建项目或修改已有项目的信息，包含图片、标签、描述等字段
 */
export default function CreateDialog({ project, onClose, onSave }: CreateDialogProps) {
	// 表单数据状态，初始化为空项目（默认年份为当前年份）
	const [formData, setFormData] = useState<Project>({
		name: '',
		year: new Date().getFullYear(),
		image: '',
		url: '',
		description: '',
		tags: [],
		github: undefined,
		npm: undefined
	})
	// 控制图片上传弹窗是否显示
	const [showImageDialog, setShowImageDialog] = useState(false)
	// 标签输入框的文本内容（用逗号分隔的字符串）
	const [tagsInput, setTagsInput] = useState('')

	// 当 project prop 发生变化时，同步更新表单数据和标签输入框
	useEffect(() => {
		if (project) {
			// 编辑模式：填充已有项目数据
			setFormData(project)
			setTagsInput(project.tags.join(', '))
		} else {
			// 新建模式：重置为空项目
			setFormData({
				name: '',
				year: new Date().getFullYear(),
				image: '',
				url: '',
				description: '',
				tags: [],
				github: undefined,
				npm: undefined
			})
			setTagsInput('')
		}
	}, [project])

	/**
	 * 图片上传弹窗提交回调
	 * 根据上传方式（URL 或本地文件预览）获取图片地址并更新表单
	 */
	const handleImageSubmit = (image: ImageItem) => {
		// 如果是 URL 类型使用 image.url，否则使用本地预览地址
		const imageUrl = image.type === 'url' ? image.url : image.previewUrl
		setFormData({ ...formData, image: imageUrl })
	}

	/**
	 * 处理标签输入变化
	 * 将逗号分隔的字符串拆分成数组，去除空格和空字符串，更新表单中的 tags
	 */
	const handleTagsChange = (value: string) => {
		setTagsInput(value)
		const tags = value
			.split(',') // 按逗号拆分
			.map(t => t.trim()) // 去除每个标签的前后空格
			.filter(t => t) // 过滤掉空字符串
		setFormData({ ...formData, tags })
	}

	/**
	 * 表单提交处理
	 * 校验必填字段和标签数量，校验通过后调用 onSave 并关闭弹窗，显示成功提示
	 */
	const handleSubmit = () => {
		// 校验必填字段：名称、图片、链接、描述均不能为空
		if (!formData.name.trim() || !formData.image.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}

		// 至少需要一个标签
		if (formData.tags.length === 0) {
			toast.error('请至少添加一个标签')
			return
		}

		onSave(formData) // 调用父组件传入的保存方法
		onClose() // 关闭弹窗
		// 根据是否编辑状态显示不同的成功提示
		toast.success(project ? '更新成功' : '添加成功')
	}

	return (
		// DialogModal 为通用模态框，open 控制显示，className 传递样式类（Tailwind CSS）
		<DialogModal open onClose={onClose} className='card static w-md max-sm:w-full'>
			<div>
				{/* 图片和基本信息区域 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 点击图片或占位区域，打开图片上传弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowImageDialog(true)}>
						{formData.image ? (
							// 有图片时显示缩略图，悬停显示“更换”提示
							<>
								<img
									src={formData.image}
									alt={formData.name}
									className='h-16 w-16 rounded-xl object-cover'
								/>
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 无图片时显示 Plus 图标的占位区域
							<div className='flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>
					<div className='flex-1'>
						{/* 项目名称输入 */}
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='项目名称'
							className='w-full text-lg font-bold focus:outline-none'
						/>
						{/* 年份和链接输入 */}
						<div className='mt-1 flex items-center gap-2'>
							<input
								type='number'
								value={formData.year}
								onChange={e =>
									setFormData({ ...formData, year: parseInt(e.target.value) || 0 })
								}
								placeholder='年份'
								className='text-secondary w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none'
							/>
							<input
								type='url'
								value={formData.url}
								onChange={e =>
									setFormData({ ...formData, url: e.target.value })
								}
								placeholder='https://example.com'
								className='text-secondary flex-1 truncate text-xs focus:outline-none'
							/>
						</div>
					</div>
				</div>

				{/* 标签输入区域 */}
				<div className='mt-3'>
					<input
						type='text'
						value={tagsInput}
						onChange={e => handleTagsChange(e.target.value)}
						placeholder='标签，用逗号分隔（如：React, Vue）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					{/* 已添加的标签预览 */}
					<div className='mt-2 flex flex-wrap gap-1.5'>
						{formData.tags.map(tag => (
							<span key={tag} className='rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs text-gray-600'>
								{tag}
							</span>
						))}
					</div>
				</div>

				{/* 项目描述多行文本输入 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='项目介绍...'
					className='mt-3 w-full resize-none text-sm leading-relaxed focus:outline-none'
					rows={4}
				/>

				{/* 可选的 GitHub 和 NPM 链接 */}
				<div className='mt-3 space-y-2'>
					<input
						type='url'
						value={formData.github || ''}
						onChange={e =>
							setFormData({ ...formData, github: e.target.value || undefined })
						}
						placeholder='GitHub URL（可选）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					<input
						type='url'
						value={formData.npm || ''}
						onChange={e =>
							setFormData({ ...formData, npm: e.target.value || undefined })
						}
						placeholder='NPM URL（可选）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
				</div>
			</div>

			{/* 操作按钮 */}
			<div className='mt-6 flex gap-3'>
				<button
					onClick={onClose}
					className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'
				>
					取消
				</button>
				<button onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4'>
					{project ? '保存' : '添加'}
				</button>
			</div>

			{/* 条件渲染图片上传弹窗，仅在 showImageDialog 为 true 时显示 */}
			{showImageDialog && (
				<ImageUploadDialog
					currentImage={formData.image}
					onClose={() => setShowImageDialog(false)}
					onSubmit={handleImageSubmit}
				/>
			)}
		</DialogModal>
	)
}
