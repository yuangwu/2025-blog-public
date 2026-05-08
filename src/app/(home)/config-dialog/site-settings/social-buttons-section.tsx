'use client'
// 标记该组件为客户端组件（用于 Next.js App Router）

import { useRef } from 'react'
import { toast } from 'sonner'
import type { SiteContent } from '../../stores/config-store'
import { Select } from '@/components/select'
import type { SocialButtonImageUploads } from './types'
import { hashFileSHA256 } from '@/lib/file-utils'

// 定义社交按钮支持的平台类型联合类型
type SocialButtonType =
	| 'github'
	| 'juejin'
	| 'email'
	| 'link'
	| 'x'
	| 'tg'
	| 'wechat'
	| 'facebook'
	| 'tiktok'
	| 'instagram'
	| 'weibo'
	| 'xiaohongshu'
	| 'zhihu'
	| 'bilibili'
	| 'qq'

// 定义单个社交按钮的配置数据结构
interface SocialButtonConfig {
	id: string
	// 按钮唯一标识符
	type: SocialButtonType
	// 按钮类型（平台）
	value: string
	// 按钮值（链接、邮箱、图片路径等）
	label?: string
	// 可选的显示标签文本
	order: number
	// 显示顺序
}

// 定义组件的 Props 类型
interface SocialButtonsSectionProps {
	formData: SiteContent
	// 表单数据（包含社交按钮配置）
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	// 更新表单数据的函数
	socialButtonImageUploads: SocialButtonImageUploads
	// 图片上传状态管理
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>> // 更新图片上传状态的函数
}

// 导出社交按钮配置区域组件
export function SocialButtonsSection({ 
	formData, 
	setFormData, 
	socialButtonImageUploads, 
	setSocialButtonImageUploads 
}: SocialButtonsSectionProps) {
	// 从 formData 中提取社交按钮数组，默认为空数组
	const buttons = (formData.socialButtons || []) as SocialButtonConfig[]
	// 创建一个 Ref 对象，用于存储每个按钮对应的文件输入框 DOM 引用
	const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	// 处理添加新社交按钮的逻辑
	const handleAddButton = () => {
		// 生成基于时间戳的唯一 ID
		const newId = `button-${Date.now()}`
		// 创建新按钮的默认配置
		const newButton = {
			id: newId,
			type: 'link' as const,
			// 默认类型为通用链接
			value: '',
			label: '',
			order: buttons.length + 1
			// 顺序默认为当前末尾
		}
		// 更新 formData 状态，添加新按钮
		setFormData(prev => ({
			...prev,
			socialButtons: [...(prev.socialButtons || []), newButton]
		}))
	}

	// 处理更新指定按钮配置的逻辑
	const handleUpdateButton = (id: string, updates: Partial<SocialButtonConfig>) => {
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => 
				// 找到 ID 匹配的按钮，合并更新配置
				btn.id === id 
					? { ...btn, ...updates, label: updates.label ?? btn.label ?? '' } 
					: btn
			)
		}))
	}

	// 处理删除指定按钮的逻辑
	const handleRemoveButton = (id: string) => {
		setFormData(prev => ({
			...prev,
			// 过滤掉 ID 匹配的按钮
			socialButtons: (prev.socialButtons || []).filter(btn => btn.id !== id)
		}))
	}

	// 处理按钮上下移动排序的逻辑
	const handleMoveButton = (id: string, direction: 'up' | 'down') => {
		// 找到当前按钮的索引
		const currentIndex = buttons.findIndex(btn => btn.id === id)
		if (currentIndex === -1) return

		// 计算目标索引
		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		// 边界检查
		if (newIndex < 0 || newIndex >= buttons.length) return

		// 创建新数组并交换元素位置
		const newButtons = [...buttons]
		;[newButtons[currentIndex], newButtons[newIndex]] = [newButtons[newIndex], newButtons[currentIndex]]

		// 更新所有按钮的 order 字段，确保顺序正确
		const updatedButtons = newButtons.map((btn, index) => ({
			...btn,
			order: index + 1,
			label: btn.label ?? ''
		}))

		// 更新 formData
		setFormData(prev => ({
			...prev,
			socialButtons: updatedButtons
		}))
	}

	// 处理选择/上传图片（主要用于微信/QQ二维码）的逻辑
	const handleImageSelect = async (buttonId: string, e: React.ChangeEvent<HTMLInputElement>) => {
		// 获取选中的文件
		const file = e.target.files?.[0]
		if (!file) return

		// 校验文件类型是否为图片
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 计算文件哈希值（用于去重和生成唯一文件名）
		const hash = await hashFileSHA256(file)
		// 获取文件扩展名
		const ext = file.name.split('.').pop() || 'png'
		// 构建图片保存路径
		const targetPath = `/images/social-buttons/${hash}.${ext}`
		// 创建本地预览 URL
		const previewUrl = URL.createObjectURL(file)

		// 更新图片上传状态
		setSocialButtonImageUploads(prev => ({
			...prev,
			[buttonId]: { type: 'file', file, previewUrl, hash }
		}))

		// 将图片路径更新到对应按钮的 value 字段
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => 
				btn.id === buttonId ? { ...btn, value: targetPath } : btn
			)
		}))

		// 清空文件输入框的值，允许重复选择同一文件
		if (e.currentTarget) e.currentTarget.value = ''
	}

	// 处理删除已上传图片的逻辑
	const handleRemoveImage = (buttonId: string) => {
		const uploadItem = socialButtonImageUploads[buttonId]
		// 释放本地预览 URL 占用的内存
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		// 从图片上传状态中移除该项
		setSocialButtonImageUploads(prev => {
			const next = { ...prev }
			delete next[buttonId]
			return next
		})

		// 清空对应按钮的 value 字段
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => 
				btn.id === buttonId ? { ...btn, value: '' } : btn
			)
		}))
	}

	// 根据 order 字段对按钮进行排序，用于渲染
	const sortedButtons = [...buttons].sort((a, b) => a.order - b.order)

	// 渲染组件 UI
	return (
		<div>
			{/* 区域标题 */}
			<label className='mb-2 block text-sm font-medium'>社交按钮</label>
			
			{/* 空状态提示 */}
			{buttons.length === 0 && <p className='mb-2 text-xs text-gray-500'>暂未配置社交按钮，点击下方「+」添加。</p>}
			
			{/* 按钮列表容器 */}
			<div className='space-y-2 whitespace-nowrap'>
				{/* 遍历渲染每个社交按钮配置项 */}
				{sortedButtons.map((button, index) => (
					<div key={button.id} className='flex items-center gap-2'>
						{/* 1. 社交平台类型选择器 */}
						<Select
							value={button.type}
							onChange={value => handleUpdateButton(button.id, { type: value as SocialButtonType })}
							className='w-24'
							options={[
								{ value: 'github', label: 'Github' },
								{ value: 'juejin', label: '掘金' },
								{ value: 'email', label: '邮箱' },
								{ value: 'x', label: 'X' },
								{ value: 'tg', label: 'Telegram' },
								{ value: 'wechat', label: '微信' },
								{ value: 'facebook', label: 'Facebook' },
								{ value: 'tiktok', label: 'TikTok' },
								{ value: 'instagram', label: 'Instagram' },
								{ value: 'weibo', label: '微博' },
								{ value: 'xiaohongshu', label: '小红书' },
								{ value: 'zhihu', label: '知乎' },
								{ value: 'bilibili', label: '哔哩哔哩' },
								{ value: 'qq', label: 'QQ' },
								{ value: 'link', label: '链接' }
							]}
						/>

						{/* 2. 主输入区域（根据类型不同显示不同内容） */}
						{/* 如果是微信或 QQ，支持上传二维码图片 */}
						{button.type === 'wechat' || button.type === 'qq' ? (
							<div className='flex flex-1 items-center gap-2'>
								{/* 隐藏的文件输入框，通过 Ref 触发 */}
								<input
									ref={el => {
										imageInputRefs.current[button.id] = el
									}}
									type='file'
									accept='image/*'
									className='hidden'
									onChange={e => handleImageSelect(button.id, e)}
								/>
								
								{/* 情况 A：已选择/上传了新图片 */}
								{socialButtonImageUploads[button.id]?.type === 'file' ? (
									<div className='relative flex flex-1 items-center gap-2'>
										{/* 图片预览 */}
										<img
											src={(socialButtonImageUploads[button.id] as { type: 'file'; file: File; previewUrl: string; hash?: string }).previewUrl}
											alt='preview'
											className='h-10 w-10 rounded-lg object-cover'
										/>
										{/* 路径输入框 */}
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
										/>
										{/* 删除图片按钮 */}
										<button type='button' onClick={() => handleRemoveImage(button.id)} className='text-xs text-red-500 hover:text-red-600'>
											删除图片
										</button>
									</div>
								// 情况 B：已有历史图片路径
								) : button.value && button.value.startsWith('/images/social-buttons/') ? (
									<div className='relative flex flex-1 items-center gap-2'>
										<img src={button.value} alt='preview' className='h-10 w-10 rounded-lg object-cover' />
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
										/>
									</div>
								// 情况 C：未上传图片，仅显示文本输入框和上传按钮
								) : (
									<>
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
										/>
										<button
											type='button'
											onClick={() => imageInputRefs.current[button.id]?.click()}
											className='bg-card rounded-lg border px-3 py-1.5 text-xs font-medium'>
											上传图片
										</button>
									</>
								)}
							</div>
						// 如果是其他类型（邮箱、链接等），仅显示普通输入框
						) : (
							<input
								type={button.type === 'email' ? 'email' : 'url'}
								value={button.value}
								onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
								placeholder={button.type === 'email' ? 'example@email.com' : 'https://example.com'}
								className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
							/>
						)}

						{/* 3. 标签文本输入框（仅非邮箱、非微信/QQ 显示） */}
						{button.type !== 'email' && button.type !== 'wechat' && button.type !== 'qq' && (
							<input
								type='text'
								value={button.label || ''}
								onChange={e => handleUpdateButton(button.id, { label: e.target.value })}
								placeholder='标签文本（可选）'
								className='bg-secondary/10 w-32 rounded-lg border px-3 py-1.5 text-xs'
							/>
						)}

						{/* 4. 顺序数字输入框 */}
						<input
							type='number'
							value={button.order}
							onChange={e => {
								const order = parseInt(e.target.value, 10)
								if (!isNaN(order) && order > 0) {
									handleUpdateButton(button.id, { order })
								}
							}}
							min={1}
							placeholder='顺序'
							className='bg-secondary/10 w-16 rounded-lg border px-2 py-1.5 text-xs'
						/>

						{/* 5. 操作按钮组（上移、下移、删除） */}
						<div className='flex gap-1'>
							{/* 上移按钮 */}
							<button
								type='button'
								onClick={() => handleMoveButton(button.id, 'up')}
								disabled={index === 0}
								className='rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300'>
								↑
							</button>
							{/* 下移按钮 */}
							<button
								type='button'
								onClick={() => handleMoveButton(button.id, 'down')}
								disabled={index === sortedButtons.length - 1}
								className='rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300'>
								↓
							</button>
							{/* 删除按钮 */}
							<button type='button' onClick={() => handleRemoveButton(button.id)} className='rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50'>
								删除
							</button>
						</div>
					</div>
				))}

				{/* 添加新按钮的入口 */}
				<button
					type='button'
					onClick={handleAddButton}
					className='hover:border-brand/60 text-secondary hover:bg-card flex w-full items-center justify-center rounded-xl border border-dashed py-2 text-sm'>
					+ 添加按钮
				</button>
			</div>
		</div>
	)
}
