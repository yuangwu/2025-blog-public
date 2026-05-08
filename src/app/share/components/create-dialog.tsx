'use client' // 声明该组件仅在客户端渲染（Next.js App Router 中的客户端组件标识）

import { useState, useEffect } from 'react'
import { toast } from 'sonner' // 轻量级 toast 通知库
import { Plus } from 'lucide-react' // 图标库中的加号图标
import LogoUploadDialog, { type LogoItem } from './logo-upload-dialog' // Logo 上传弹窗组件及其类型
import type { Share } from './share-card' // Share 数据类型
import { DialogModal } from '@/components/dialog-modal' // 通用弹窗容器组件

// 创建/编辑对话框的 props 类型
interface CreateDialogProps {
	share: Share | null // 传入的分享项，为 null 时表示新建模式
	onClose: () => void // 关闭弹窗回调
	onSave: (share: Share) => void // 保存成功后的回调
}

export default function CreateDialog({ share, onClose, onSave }: CreateDialogProps) {
	// 表单核心数据状态
	const [formData, setFormData] = useState<Share>({
		name: '',        // 资源名称
		logo: '',        // Logo 图片地址
		url: '',         // 资源链接
		description: '', // 描述
		tags: [],        // 标签数组
		stars: 3         // 默认星级评分
	})

	const [showLogoDialog, setShowLogoDialog] = useState(false) // 是否显示 Logo 选择弹窗
	const [tagsInput, setTagsInput] = useState('') // 标签输入框的文本（逗号分隔字符串）

	// 当传入的 share 发生变化时，初始化或重置表单数据
	useEffect(() => {
		if (share) {
			// 编辑模式：回填数据
			setFormData(share)
			setTagsInput(share.tags.join(', '))
		} else {
			// 新建模式：清空所有字段
			setFormData({
				name: '',
				logo: '',
				url: '',
				description: '',
				tags: [],
				stars: 3
			})
			setTagsInput('')
		}
	}, [share])

	// Logo 选定后的处理：根据 Logo 类型提取最终图片地址并更新 formData
	const handleLogoSubmit = (logo: LogoItem) => {
		const logoUrl = logo.type === 'url' ? logo.url : logo.previewUrl
		setFormData({ ...formData, logo: logoUrl })
	}

	// 标签输入变更处理：解析逗号分隔字符串为数组，并同步表单数据
	const handleTagsChange = (value: string) => {
		setTagsInput(value)
		const tags = value
			.split(',')          // 按逗号切分
			.map(t => t.trim()) // 去除首尾空格
			.filter(t => t)     // 过滤空字符串
		setFormData({ ...formData, tags })
	}

	// 表单提交校验与保存
	const handleSubmit = () => {
		// 必填项校验：名称、Logo、链接、描述均不能为空
		if (!formData.name.trim() || !formData.logo.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}
		// 至少需要一个标签
		if (formData.tags.length === 0) {
			toast.error('请至少添加一个标签')
			return
		}

		onSave(formData) // 调用父组件保存逻辑
		onClose()        // 关闭弹窗
		toast.success(share ? '更新成功' : '添加成功') // 操作结果提示
	}

	return (
		// DialogModal 为通用弹窗容器，open 控制显示，className 设置样式
		<DialogModal open onClose={onClose} className='card max-h-[90vh] w-sm overflow-y-auto'>
			<div>
				{/* Logo 与名称、链接区域 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 点击当前 Logo 区域可打开 Logo 选择弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowLogoDialog(true)}>
						{formData.logo ? (
							<>
								{/* 已上传 Logo 时显示图片，并带悬浮的“更换”蒙层 */}
								<img src={formData.logo} alt={formData.name} className='h-16 w-16 rounded-xl object-cover' />
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 未上传时显示灰色占位块与加号图标
							<div className='flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>

					{/* 资源名称与链接输入 */}
					<div className='flex-1'>
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='资源名称'
							className='w-full text-lg font-bold focus:outline-none'
						/>
						<input
							type='url'
							value={formData.url}
							onChange={e => setFormData({ ...formData, url: e.target.value })}
							placeholder='https://example.com'
							className='text-secondary mt-1 w-full truncate text-xs focus:outline-none'
						/>
					</div>
				</div>

				{/* 星级评分：循环渲染 5 颗星，点击直接设置星级数值 */}
				<div className='flex items-center gap-0.5'>
					{[1, 2, 3, 4, 5].map(index => (
						<div key={index} onClick={() => setFormData({ ...formData, stars: index })} className='cursor-pointer'>
							<svg width='16' height='16' viewBox='0 0 24 24' className={index <= formData.stars ? 'fill-yellow-400' : 'fill-gray-300'}>
								<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
							</svg>
						</div>
					))}
				</div>

				{/* 标签输入与已添加标签展示 */}
				<div className='mt-3'>
					<input
						type='text'
						value={tagsInput}
						onChange={e => handleTagsChange(e.target.value)}
						placeholder='标签，用逗号分隔（如：图片, 工具）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					{/* 实时显示解析后的标签气泡 */}
					<div className='mt-2 flex flex-wrap gap-1.5'>
						{formData.tags.map(tag => (
							<span key={tag} className='rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs text-gray-600'>
								{tag}
							</span>
						))}
					</div>
				</div>

				{/* 资源描述文本域 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='资源介绍...'
					className='mt-3 w-full resize-none text-sm leading-relaxed focus:outline-none'
					rows={4}
				/>
			</div>

			{/* 底部操作按钮：取消 / 保存 */}
			<div className='mt-6 flex gap-3'>
				<button onClick={onClose} className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
					取消
				</button>
				<button onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4'>
					{share ? '保存' : '添加'}
				</button>
			</div>

			{/* 条件渲染 Logo 上传/选择弹窗 */}
			{showLogoDialog && (
				<LogoUploadDialog
					currentLogo={formData.logo}
					onClose={() => setShowLogoDialog(false)}
					onSubmit={handleLogoSubmit}
				/>
			)}
		</DialogModal>
	)
}