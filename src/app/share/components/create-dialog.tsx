'use client' // 声明这是一个客户端组件，可以使用浏览器 API 和 React hooks

import { useState, useEffect } from 'react' // 引入 React 的状态和副作用钩子
import { toast } from 'sonner' // 引入 sonner 库的 toast 方法，用于显示提示消息
import { Plus } from 'lucide-react' // 引入 lucide-react 图标库中的 Plus 图标
import LogoUploadDialog, { type LogoItem } from './logo-upload-dialog' // 引入本地的 Logo 上传弹窗组件及其 LogoItem 类型
import type { Share } from './share-card' // 仅引入 Share 类型，避免循环依赖
import { DialogModal } from '@/components/dialog-modal' // 引入通用的对话框模态框组件

// 定义 CreateDialog 组件接收的 props 类型
interface CreateDialogProps {
	share: Share | null // 当前编辑的分享资源对象，为 null 时表示新建
	onClose: () => void // 关闭对话框的回调函数
	onSave: (share: Share) => void // 保存分享资源的回调函数，传回编辑后的数据
}

// 默认导出的创建/编辑分享资源对话框组件
export default function CreateDialog({ share, onClose, onSave }: CreateDialogProps) {
	// 表单数据状态，初始值为空资源对象
	const [formData, setFormData] = useState<Share>({
		name: '', // 资源名称
		logo: '', // 资源 logo 的 URL
		url: '', // 资源的链接地址
		description: '', // 资源描述
		tags: [], // 标签数组
		stars: 3 // 默认星级评分
	})
	// 控制 Logo 上传弹窗的显示状态
	const [showLogoDialog, setShowLogoDialog] = useState(false)
	// 标签输入框的文本内容，用逗号分隔多个标签
	const [tagsInput, setTagsInput] = useState('')

	// 当外部传入的 share 对象变化时，同步初始化表单数据
	useEffect(() => {
		if (share) {
			// 编辑模式：填充已有资源数据
			setFormData(share)
			// 将标签数组还原为逗号分隔的字符串用于输入框显示
			setTagsInput(share.tags.join(', '))
		} else {
			// 新建模式：重置为初始空数据
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
	}, [share]) // 依赖 share 的变化

	// 处理 Logo 上传弹窗提交的 Logo 数据
	const handleLogoSubmit = (logo: LogoItem) => {
		// 根据 Logo 来源类型决定使用哪个 URL 字段
		const logoUrl = logo.type === 'url' ? logo.url : logo.previewUrl
		// 更新表单数据中的 logo 字段
		setFormData({ ...formData, logo: logoUrl })
	}

	// 处理标签输入的变化
	const handleTagsChange = (value: string) => {
		setTagsInput(value) // 更新输入框显示
		// 按逗号拆分并清理空格，过滤空字符串，生成标签数组
		const tags = value
			.split(',')
			.map(t => t.trim())
			.filter(t => t)
		setFormData({ ...formData, tags }) // 同步到表单数据
	}

	// 提交表单，进行验证和保存
	const handleSubmit = () => {
		// 验证必填字段：名称、Logo、链接、描述均不能为空或仅包含空格
		if (!formData.name.trim() || !formData.logo.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项') // 错误提示
			return
		}

		// 验证至少添加一个标签
		if (formData.tags.length === 0) {
			toast.error('请至少添加一个标签')
			return
		}

		onSave(formData) // 调用父组件传入的保存回调
		onClose() // 关闭当前对话框
		toast.success(share ? '更新成功' : '添加成功') // 操作成功提示
	}

	return (
		// DialogModal 通用对话框组件，open 属性控制显示（此处始终为 true，由父组件控制挂载）
		<DialogModal open onClose={onClose} className='card max-h-[90vh] w-sm overflow-y-auto'>
			{/* 卡片样式的内容容器 */}
			<div>
				{/* Logo 和基本信息区域 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* Logo 区域，点击打开 Logo 上传弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowLogoDialog(true)}>
						{formData.logo ? (
							// 已设置 Logo：显示图片和悬浮更换蒙层
							<>
								<img src={formData.logo} alt={formData.name} className='h-16 w-16 rounded-xl object-cover' />
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 未设置 Logo：显示添加图标占位
							<div className='flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>
					{/* 名称和 URL 输入 */}
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

				{/* 星级评分组件：循环生成 1-5 颗星，点击设置评分 */}
				<div className='flex items-center gap-0.5'>
					{[1, 2, 3, 4, 5].map(index => (
						<div key={index} onClick={() => setFormData({ ...formData, stars: index })} className='cursor-pointer'>
							<svg width='16' height='16' viewBox='0 0 24 24' className={index <= formData.stars ? 'fill-yellow-400' : 'fill-gray-300'}>
								<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
							</svg>
						</div>
					))}
				</div>

				{/* 标签输入区域 */}
				<div className='mt-3'>
					<input
						type='text'
						value={tagsInput}
						onChange={e => handleTagsChange(e.target.value)}
						placeholder='标签，用逗号分隔（如：图片, 工具）'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
					/>
					{/* 标签预览列表 */}
					<div className='mt-2 flex flex-wrap gap-1.5'>
						{formData.tags.map(tag => (
							<span key={tag} className='rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs text-gray-600'>
								{tag}
							</span>
						))}
					</div>
				</div>

				{/* 描述文本域 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='资源介绍...'
					className='mt-3 w-full resize-none text-sm leading-relaxed focus:outline-none'
					rows={4}
				/>
			</div>

			{/* 底部操作按钮 */}
			<div className='mt-6 flex gap-3'>
				<button onClick={onClose} className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
					取消
				</button>
				<button onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4'>
					{share ? '保存' : '添加'} {/* 根据是否有初始数据切换按钮文字 */}
				</button>
			</div>

			{/* Logo 上传弹窗：条件渲染，通过 showLogoDialog 控制显示 */}
			{showLogoDialog && (
				<LogoUploadDialog
					currentLogo={formData.logo} // 传入当前 Logo URL
					onClose={() => setShowLogoDialog(false)} // 关闭弹窗
					onSubmit={handleLogoSubmit} // 提交新 Logo 的处理函数
				/>
			)}
		</DialogModal>
	)
}
