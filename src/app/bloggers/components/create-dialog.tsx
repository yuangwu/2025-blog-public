'use client' // 标记该组件为客户端组件，因为使用了状态、事件处理等浏览器特性

import { useState, useEffect } from 'react' // 引入 React 的 hook
import { toast } from 'sonner' // 引入 sonner 库的 toast 通知组件（需在项目中安装 sonner）
import { Plus } from 'lucide-react' // 引入 lucide-react 图标库中的 Plus 图标（需安装 lucide-react）
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog' // 引入头像上传弹窗组件及类型，确保该文件存在
import { DialogModal } from '@/components/dialog-modal' // 引入通用的 DialogModal 组件，确保路径 @/components/dialog-modal 正确

// 博主数据类型定义
interface Blogger {
	name: string
	avatar: string
	url: string
	description: string
	stars: number
}

// CreateDialog 组件的 props 类型定义
interface CreateDialogProps {
	blogger: Blogger | null // 当前编辑的博主信息，为 null 表示新增模式
	onClose: () => void // 关闭弹窗的回调
	onSave: (blogger: Blogger) => void // 保存博主的回调，返回完整的博主对象
}

// 创建/编辑弹窗组件
export default function CreateDialog({ blogger, onClose, onSave }: CreateDialogProps) {
	// 表单数据状态，初始化默认值
	const [formData, setFormData] = useState<Blogger>({
		name: '',
		avatar: '',
		url: '',
		description: '',
		stars: 3
	})

	// 控制头像上传子弹窗的显示
	const [showAvatarDialog, setShowAvatarDialog] = useState(false)

	// 当外部传入的 blogger 变化时，同步更新表单数据（编辑或重置为新增空表单）
	useEffect(() => {
		if (blogger) {
			setFormData(blogger) // 编辑模式：填入当前博主数据
		} else {
			// 新增模式：重置为空表单
			setFormData({
				name: '',
				avatar: '',
				url: '',
				description: '',
				stars: 3
			})
		}
	}, [blogger]) // 依赖 blogger 变化

	// 处理头像弹窗提交的回调，接收用户选择的头像并更新表单
	const handleAvatarSubmit = (avatar: AvatarItem) => {
		// 根据头像来源获取实际 URL：type 为 'url' 时使用用户输入的 URL，否则使用预览 URL（如文件上传后的临时地址）
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		setFormData({ ...formData, avatar: avatarUrl })
	}

	// 整体表单提交前的校验与保存逻辑
	const handleSubmit = () => {
		// 必填项校验：名称、头像、链接、描述均不能为空（去除首尾空格后判断）
		if (!formData.name.trim() || !formData.avatar.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项') // sonner 错误提示
			return
		}

		onSave(formData) // 调用父组件传入的保存方法
		onClose() // 关闭弹窗
		toast.success(blogger ? '更新成功' : '添加成功') // 根据模式提示操作成功
	}

	return (
		// 使用通用的 DialogModal 组件承载内容，open 和 onClose 属性控制显示/关闭
		<DialogModal open onClose={onClose} className='card w-sm'>
			{/* 卡片样式的内容区域 */}
			<div>
				{/* 头像和基本信息的编辑区域 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 头像区域，点击触发头像上传弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowAvatarDialog(true)}>
						{formData.avatar ? (
							// 已有头像：显示图片并在悬浮时出现半透明遮罩和“更换”文字
							<>
								<img src={formData.avatar} alt={formData.name} className='h-16 w-16 rounded-full object-cover' />
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 未设置头像：显示加号图标占位
							<div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>

					{/* 博主名称与主页链接输入框 */}
					<div className='flex-1'>
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='博主名称'
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

				{/* 星级评分（1-5星） */}
				<div className='flex items-center gap-0.5'>
					{[1, 2, 3, 4, 5].map(index => (
						<div key={index} onClick={() => setFormData({ ...formData, stars: index })} className='cursor-pointer'>
							{/* 实心或空心星星 SVG，通过填充色控制 */}
							<svg width='16' height='16' viewBox='0 0 24 24' className={index <= formData.stars ? 'fill-yellow-400' : 'fill-gray-300'}>
								<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
							</svg>
						</div>
					))}
				</div>

				{/* 博主描述文本域 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='博主介绍...'
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
					{blogger ? '保存' : '添加'}
				</button>
			</div>

			{/* 头像上传弹窗，仅在 showAvatarDialog 为 true 时渲染 */}
			{showAvatarDialog && (
				<AvatarUploadDialog
					currentAvatar={formData.avatar} // 传入当前头像地址以便展示
					onClose={() => setShowAvatarDialog(false)} // 关闭回调
					onSubmit={handleAvatarSubmit} // 提交选中的头像
				/>
			)}
		</DialogModal>
	)
}
