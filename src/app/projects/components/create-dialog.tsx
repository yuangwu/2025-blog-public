// "use client" 指令：标识此文件为客户端组件，仅在浏览器端运行，可使用浏览器 API 和 React 交互特性
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner' // 引入轻量通知库
import { Plus } from 'lucide-react' // 引入图标组件
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog' // 图片上传对话框组件及类型
import type { Project } from './project-card' // 项目数据类型
import { DialogModal } from '@/components/dialog-modal' // 通用弹窗容器组件

// 创建/编辑项目的对话框组件的 Props 类型定义
interface CreateDialogProps {
	project: Project | null  // 当前编辑的项目数据，为 null 时表示新建
	onClose: () => void      // 关闭对话框的回调
	onSave: (project: Project) => void // 保存项目数据的回调
}

export default function CreateDialog({ project, onClose, onSave }: CreateDialogProps) {
	// ---- 状态管理 ----
	// 表单数据状态，存储项目各字段的值
	const [formData, setFormData] = useState<Project>({
		name: '',
		year: new Date().getFullYear(), // 默认当前年份
		image: '',
		url: '',
		description: '',
		tags: [],
		github: undefined, // 可选字段，未填写时保持 undefined
		npm: undefined
	})

	// 控制图片上传弹窗的显示/隐藏
	const [showImageDialog, setShowImageDialog] = useState(false)

	// 标签输入框的原始文本（多个标签以逗号分隔）
	const [tagsInput, setTagsInput] = useState('')

	// ---- 副作用：同步外部 project 数据到本地表单 ----
	// 当传入的 project 发生变化时（打开对话框编辑或新建），重置表单数据
	useEffect(() => {
		if (project) {
			// 编辑模式：用已有数据填充表单
			setFormData(project)
			// 将标签数组转为逗号分隔的字符串，以显示在输入框中
			setTagsInput(project.tags.join(', '))
		} else {
			// 新建模式：重置为初始空值
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

	// ---- 事件处理器 ----

	// 图片上传对话框确认后的回调：将从 ImageItem 提取的图片 URL 更新至 formData
	const handleImageSubmit = (image: ImageItem) => {
		// 根据图片来源类型获取最终展示用的 URL（URL 模式直接使用，文件模式使用预览地址）
		const imageUrl = image.type === 'url' ? image.url : image.previewUrl
		setFormData({ ...formData, image: imageUrl })
	}

	// 标签输入变更处理：同步更新输入框字符串和解析后的标签数组
	const handleTagsChange = (value: string) => {
		setTagsInput(value)
		// 将逗号分隔的字符串拆分成数组，并去除首尾空白及空字符串
		const tags = value
			.split(',')
			.map(t => t.trim())
			.filter(t => t)
		setFormData({ ...formData, tags })
	}

	// 表单提交处理：校验必填项后将数据通过 onSave 传递给父组件
	const handleSubmit = () => {
		// 校验必填字段：名称、图片、链接、描述均不能为空或仅含空白
		if (!formData.name.trim() || !formData.image.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}

		// 校验至少有一个标签
		if (formData.tags.length === 0) {
			toast.error('请至少添加一个标签')
			return
		}

		// 调用父组件传入的保存方法
		onSave(formData)
		// 关闭对话框
		onClose()
		// 弹出成功提示，根据是否为编辑模式显示不同文案
		toast.success(project ? '更新成功' : '添加成功')
	}

	// ---- 渲染 JSX ----
	return (
		// 使用 DialogModal 作为弹窗容器，open 控制显示，className 定制样式
		<DialogModal open onClose={onClose} className='card static w-md max-sm:w-full'>
			<div>
				{/* 第一行：图片选择区域 + 名称与年份/链接 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 图片预览/添加按钮，点击打开图片上传弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowImageDialog(true)}>
						{formData.image ? (
							<>
								{/* 已选择图片时，显示预览图，并在悬浮时显示“更换”提示 */}
								<img src={formData.image} alt={formData.name} className='h-16 w-16 rounded-xl object-cover' />
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 未选择图片时，显示加号占位图标
							<div className='flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>

					{/* 项目名称与年份/链接输入区域 */}
					<div className='flex-1'>
						{/* 项目名称输入 */}
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='项目名称'
							className='w-full text-lg font-bold focus:outline-none'
						/>
						{/* 年份和项目链接并排输入 */}
						<div className='mt-1 flex items-center gap-2'>
							<input
								type='number'
								value={formData.year}
								onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
								placeholder='年份'
								className='text-secondary w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none'
							/>
							<input
								type='url'
								value={formData.url}
								onChange={e => setFormData({ ...formData, url: e.target.value })}
								placeholder='https://example.com'
								className='text-secondary flex-1 truncate text-xs focus:outline-none'
							/>
						</div>
					</div>
				</div>

				{/* 标签输入区 */}
				<div className='mt-3'>
					{/* 标签输入框：多个标签用逗号分隔，实时解析为标签数组 */}
					<input
						type='text'
						value={tagsInput}
						onChange={e => handleTagsChange(e.target.value)}
						placeholder='标签，用逗号分隔（如：React, Vue）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					{/* 标签预览：以圆角徽章形式展示已解析的标签 */}
					<div className='mt-2 flex flex-wrap gap-1.5'>
						{formData.tags.map(tag => (
							<span key={tag} className='rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs text-gray-600'>
								{tag}
							</span>
						))}
					</div>
				</div>

				{/* 项目描述多行输入 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='项目介绍...'
					className='mt-3 w-full resize-none text-sm leading-relaxed focus:outline-none'
					rows={4}
				/>

				{/* GitHub 与 NPM 链接（可选输入） */}
				<div className='mt-3 space-y-2'>
					<input
						type='url'
						value={formData.github || ''}
						onChange={e => setFormData({ ...formData, github: e.target.value || undefined })}
						placeholder='GitHub URL（可选）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					<input
						type='url'
						value={formData.npm || ''}
						onChange={e => setFormData({ ...formData, npm: e.target.value || undefined })}
						placeholder='NPM URL（可选）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
				</div>
			</div>

			{/* 底部操作按钮 */}
			<div className='mt-6 flex gap-3'>
				{/* 取消按钮：直接关闭对话框 */}
				<button onClick={onClose} className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
					取消
				</button>
				{/* 确认按钮：根据模式显示“添加”或“保存”，触发提交逻辑 */}
				<button onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4'>
					{project ? '保存' : '添加'}
				</button>
			</div>

			{/* 条件渲染图片上传对话框 */}
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