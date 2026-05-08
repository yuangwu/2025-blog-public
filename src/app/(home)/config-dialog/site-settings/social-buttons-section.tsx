'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
// 从配置 store 中导入 SiteContent 类型
import type { SiteContent } from '../../stores/config-store'
// 导入封装好的 Select 下拉组件
import { Select } from '@/components/select'
// 导入本组件专属的类型定义
import type { SocialButtonImageUploads } from './types'
// 导入文件哈希工具函数，用于生成唯一文件名
import { hashFileSHA256 } from '@/lib/file-utils'

// 支持的社交按钮类型
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

// 社交按钮的配置结构
interface SocialButtonConfig {
	id: string
	type: SocialButtonType
	value: string // 链接地址或图片路径
	label?: string // 可选展示标签
	order: number // 排序序号
}

// 组件的 props 类型
interface SocialButtonsSectionProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	// 记录每个按钮上传的图片信息（文件、预览地址等）
	socialButtonImageUploads: SocialButtonImageUploads
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>>
}

// 社交按钮配置区域组件
export function SocialButtonsSection({
	formData,
	setFormData,
	socialButtonImageUploads,
	setSocialButtonImageUploads,
}: SocialButtonsSectionProps) {
	// 从表单数据中安全获取按钮列表
	const buttons = (formData.socialButtons || []) as SocialButtonConfig[]
	// 存储每个按钮对应的文件选择 input 的引用
	const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	// 添加新按钮
	const handleAddButton = () => {
		// 生成唯一 ID
		const newId = `button-${Date.now()}`
		const newButton = {
			id: newId,
			type: 'link' as const,
			value: '',
			label: '',
			order: buttons.length + 1,
		}
		setFormData(prev => ({
			...prev,
			socialButtons: [...(prev.socialButtons || []), newButton],
		}))
	}

	// 更新指定按钮的字段
	const handleUpdateButton = (id: string, updates: Partial<SocialButtonConfig>) => {
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn =>
				btn.id === id
					? {
							...btn,
							...updates,
							// 如果未提供 label，则保留原有值（空字符串兜底）
							label: updates.label ?? btn.label ?? '',
					  }
					: btn,
			),
		}))
	}

	// 删除按钮
	const handleRemoveButton = (id: string) => {
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).filter(btn => btn.id !== id),
		}))
	}

	// 上移/下移按钮，同时更新 order 字段
	const handleMoveButton = (id: string, direction: 'up' | 'down') => {
		const currentIndex = buttons.findIndex(btn => btn.id === id)
		if (currentIndex === -1) return

		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (newIndex < 0 || newIndex >= buttons.length) return

		// 交换两个元素的位置
		const newButtons = [...buttons]
		;[newButtons[currentIndex], newButtons[newIndex]] = [newButtons[newIndex], newButtons[currentIndex]]

		// 重新分配 order 值并确保 label 不为 undefined
		const updatedButtons = newButtons.map((btn, index) => ({
			...btn,
			order: index + 1,
			label: btn.label ?? '',
		}))

		setFormData(prev => ({
			...prev,
			socialButtons: updatedButtons,
		}))
	}

	// 处理图片选择：计算哈希，生成预览，并更新表单数据中的 value 为目标路径
	const handleImageSelect = async (buttonId: string, e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// 校验文件类型必须是图片
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 计算文件哈希并拼接扩展名，形成目标存储路径
		const hash = await hashFileSHA256(file)
		const ext = file.name.split('.').pop() || 'png'
		const targetPath = `/images/social-buttons/${hash}.${ext}`
		// 生成本地预览 URL
		const previewUrl = URL.createObjectURL(file)

		// 记录上传信息（供预览和后续上传使用）
		setSocialButtonImageUploads(prev => ({
			...prev,
			[buttonId]: { type: 'file', file, previewUrl, hash },
		}))

		// 将按钮的 value 更新为预期的服务器路径
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn =>
				btn.id === buttonId ? { ...btn, value: targetPath } : btn,
			),
		}))

		// 清空 input 的值，以便再次选择同一文件时也能触发 change
		if (e.currentTarget) e.currentTarget.value = ''
	}

	// 移除已上传的图片，释放预览 URL，并清空按钮的 value
	const handleRemoveImage = (buttonId: string) => {
		const uploadItem = socialButtonImageUploads[buttonId]
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		// 从上传记录中移除该项
		setSocialButtonImageUploads(prev => {
			const next = { ...prev }
			delete next[buttonId]
			return next
		})

		// 清空按钮的 value
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn =>
				btn.id === buttonId ? { ...btn, value: '' } : btn,
			),
		}))
	}

	// 按 order 排序按钮，保证渲染顺序稳定
	const sortedButtons = [...buttons].sort((a, b) => a.order - b.order)

	return (
		<div>
			<label className="mb-2 block text-sm font-medium">社交按钮</label>
			{buttons.length === 0 && (
				<p className="mb-2 text-xs text-gray-500">暂未配置社交按钮，点击下方「+」添加。</p>
			)}
			<div className="space-y-2 whitespace-nowrap">
				{/* 遍历已排序的按钮列表 */}
				{sortedButtons.map((button, index) => (
					<div key={button.id} className="flex items-center gap-2">
						{/* 类型选择下拉框 */}
						<Select
							value={button.type}
							onChange={value => handleUpdateButton(button.id, { type: value as SocialButtonType })}
							className="w-24"
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
								{ value: 'link', label: '链接' },
							]}
						/>
						{/* 微信或QQ类型需要上传/展示图片，其他类型输入链接 */}
						{button.type === 'wechat' || button.type === 'qq' ? (
							<div className="flex flex-1 items-center gap-2">
								{/* 隐藏的文件选择 input，用于替换默认上传 */}
								<input
									ref={el => {
										imageInputRefs.current[button.id] = el
									}}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={e => handleImageSelect(button.id, e)}
								/>
								{/* 已选择文件时，显示预览、路径和删除按钮 */}
								{socialButtonImageUploads[button.id]?.type === 'file' ? (
									<div className="relative flex flex-1 items-center gap-2">
										<img
											src={
												(
													socialButtonImageUploads[button.id] as {
														type: 'file'
														file: File
														previewUrl: string
														hash?: string
													}
												).previewUrl
											}
											alt="preview"
											className="h-10 w-10 rounded-lg object-cover"
										/>
										<input
											type="text"
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className="bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs"
										/>
										<button
											type="button"
											onClick={() => handleRemoveImage(button.id)}
											className="text-xs text-red-500 hover:text-red-600"
										>
											删除图片
										</button>
									</div>
								) : button.value && button.value.startsWith('/images/social-buttons/') ? (
									// 之前已上传过图片且有服务器路径，直接展示图片与路径输入框
									<div className="relative flex flex-1 items-center gap-2">
										<img
											src={button.value}
											alt="preview"
											className="h-10 w-10 rounded-lg object-cover"
										/>
										<input
											type="text"
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className="bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs"
										/>
									</div>
								) : (
									// 未上传图片时，提供路径输入和手动触发文件选择的按钮
									<>
										<input
											type="text"
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? '微信号或二维码链接' : 'QQ号或二维码链接'}
											className="bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs"
										/>
										<button
											type="button"
											onClick={() => imageInputRefs.current[button.id]?.click()}
											className="bg-card rounded-lg border px-3 py-1.5 text-xs font-medium"
										>
											上传图片
										</button>
									</>
								)}
							</div>
						) : (
							// 非微信/QQ类型：直接输入链接，email 类型使用 email 输入
							<input
								type={button.type === 'email' ? 'email' : 'url'}
								value={button.value}
								onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
								placeholder={button.type === 'email' ? 'example@email.com' : 'https://example.com'}
								className="bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs"
							/>
						)}
						{/* email/wechat/qq 类型不显示标签输入框 */}
						{button.type !== 'email' && button.type !== 'wechat' && button.type !== 'qq' && (
							<input
								type="text"
								value={button.label || ''}
								onChange={e => handleUpdateButton(button.id, { label: e.target.value })}
								placeholder="标签文本（可选）"
								className="bg-secondary/10 w-32 rounded-lg border px-3 py-1.5 text-xs"
							/>
						)}
						{/* 排序序号输入 */}
						<input
							type="number"
							value={button.order}
							onChange={e => {
								const order = parseInt(e.target.value, 10)
								if (!isNaN(order) && order > 0) {
									handleUpdateButton(button.id, { order })
								}
							}}
							min={1}
							placeholder="顺序"
							className="bg-secondary/10 w-16 rounded-lg border px-2 py-1.5 text-xs"
						/>
						{/* 上移/下移/删除操作按钮 */}
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => handleMoveButton(button.id, 'up')}
								disabled={index === 0}
								className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
							>
								↑
							</button>
							<button
								type="button"
								onClick={() => handleMoveButton(button.id, 'down')}
								disabled={index === sortedButtons.length - 1}
								className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
							>
								↓
							</button>
							<button
								type="button"
								onClick={() => handleRemoveButton(button.id)}
								className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
							>
								删除
							</button>
						</div>
					</div>
				))}
				{/* 添加新按钮的入口 */}
				<button
					type="button"
					onClick={handleAddButton}
					className="hover:border-brand/60 text-secondary hover:bg-card flex w-full items-center justify-center rounded-xl border border-dashed py-2 text-sm"
				>
					+ 添加按钮
				</button>
			</div>
		</div>
	)
}
