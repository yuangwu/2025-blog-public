// 声明该组件为客户端组件（Next.js App Router 专用）
'use client'

// 导入 React 状态和副作用钩子
import { useState, useEffect } from 'react'
// 导入消息提示组件
import { toast } from 'sonner'
// 导入加号图标
import { Plus } from 'lucide-react'
// 导入头像上传弹窗及其类型定义
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog'
// 导入通用弹窗容器组件
import { DialogModal } from '@/components/dialog-modal'

/**
 * 博主数据类型定义
 * @name 博主名称
 * @avatar 头像地址
 * @url 博主主页链接
 * @description 博主介绍
 * @stars 星级评分
 */
interface Blogger {
	name: string
	avatar: string
	url: string
	description: string
	stars: number
}

/**
 * 创建/编辑博主弹窗的属性类型
 * @blogger 待编辑的博主数据，为 null 时表示新增
 * @onClose 关闭弹窗回调
 * @onSave 保存数据回调
 */
interface CreateDialogProps {
	blogger: Blogger | null
	onClose: () => void
	onSave: (blogger: Blogger) => void
}

/**
 * 新增/编辑博主信息的弹窗组件
 * 支持上传头像、填写名称、链接、评分、介绍
 */
export default function CreateDialog({ blogger, onClose, onSave }: CreateDialogProps) {
	// 表单数据状态，存储博主所有信息
	const [formData, setFormData] = useState<Blogger>({
		name: '',
		avatar: '',
		url: '',
		description: '',
		stars: 3 // 默认 3 星
	})

	// 控制头像上传弹窗的显示/隐藏
	const [showAvatarDialog, setShowAvatarDialog] = useState(false)

	// 监听传入的 blogger 数据，编辑时自动回填表单
	useEffect(() => {
		if (blogger) {
			// 编辑模式：回填数据
			setFormData(blogger)
		} else {
			// 新增模式：重置表单
			setFormData({
				name: '',
				avatar: '',
				url: '',
				description: '',
				stars: 3
			})
		}
	}, [blogger])

	/**
	 * 处理头像上传完成
	 * @param avatar 选择的头像对象
	 */
	const handleAvatarSubmit = (avatar: AvatarItem) => {
		// 判断是网络地址还是本地预览地址，取最终头像 URL
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		// 更新表单中的头像字段
		setFormData({ ...formData, avatar: avatarUrl })
	}

	/**
	 * 表单提交（保存/新增）
	 * 先校验必填项，再执行保存
	 */
	const handleSubmit = () => {
		// 必填项校验：名称、头像、链接、介绍不能为空
		if (!formData.name.trim() || !formData.avatar.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}

		// 调用父组件保存方法
		onSave(formData)
		// 关闭弹窗
		onClose()
		// 提示成功
		toast.success(blogger ? '更新成功' : '添加成功')
	}

	return (
		<DialogModal open onClose={onClose} className='card w-sm'>
			{/* 卡片样式的内容 */}
			<div>
				{/* 头像 + 名称 + 链接 区域 */}
				<div className='mb-4 flex items-center gap-4'>
					{/* 点击头像区域打开头像上传弹窗 */}
					<div className='group relative cursor-pointer' onClick={() => setShowAvatarDialog(true)}>
						{/* 已设置头像：显示头像 + 悬浮更换提示 */}
						{formData.avatar ? (
							<>
								<img src={formData.avatar} alt={formData.name} className='h-16 w-16 rounded-full object-cover' />
								<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
									<span className='text-xs text-white'>更换</span>
								</div>
							</>
						) : (
							// 未设置头像：显示加号占位
							<div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-200'>
								<Plus className='h-6 w-6 text-gray-500' />
							</div>
						)}
					</div>

					{/* 名称 + 主页链接输入框 */}
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

				{/* 星级评分：1-5 星，点击可切换 */}
				<div className='flex items-center gap-0.5'>
					{[1, 2, 3, 4, 5].map(index => (
						<div key={index} onClick={() => setFormData({ ...formData, stars: index })} className='cursor-pointer'>
							<svg width='16' height='16' viewBox='0 0 24 24' className={index <= formData.stars ? 'fill-yellow-400' : 'fill-gray-300'}>
								<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
							</svg>
						</div>
					))}
				</div>

				{/* 博主介绍文本域 */}
				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='博主介绍...'
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
					{blogger ? '保存' : '添加'}
				</button>
			</div>

			{/* 头像上传弹窗：控制显示隐藏 */}
			{showAvatarDialog && <AvatarUploadDialog currentAvatar={formData.avatar} onClose={() => setShowAvatarDialog(false)} onSubmit={handleAvatarSubmit} />}
		</DialogModal>
	)
}