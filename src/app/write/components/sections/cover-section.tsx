'use client'

import { useRef } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useWriteStore } from '../../stores/write-store'

// 定义组件接收的 props 类型，可选的延迟动画时间
type CoverSectionProps = {
	delay?: number
}

// 封面设置区域组件，支持拖拽上传或点击上传图片作为封面，也可从已有图片列表中选择
export function CoverSection({ delay = 0 }: CoverSectionProps) {
	// 从全局写作状态管理中获取图片列表、设置封面方法、当前封面和添加文件方法
	const { images, setCover, cover, addFiles } = useWriteStore()
	// 用于点击后触发隐藏的文件选择框
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 根据封面类型生成预览地址：URL 类型直接用原地址，否则用本地预览地址
	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	// 处理将图片拖入封面区域的事件
	const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		// 尝试从拖拽数据中提取 Markdown 格式的图片链接，适用于从图片列表中拖拽的情况
		const md = e.dataTransfer.getData('text/markdown') || e.dataTransfer.getData('text/plain') || ''
		const m = /!\[\]\(([^)]+)\)/.exec(md.trim())
		if (m) {
			const target = m[1]
			let foundItem

			// 根据图片标识查找对应的图片对象（本地图片以 local-image:id 格式区分，URL 图片则直接匹配地址）
			if (target.startsWith('local-image:')) {
				const id = target.replace(/^local-image:/, '')
				foundItem = images.find(it => it.id === id)
			} else {
				foundItem = images.find(it => it.type === 'url' && it.url === target)
			}

			// 如果找到了对应图片，直接设置为封面并提示成功
			if (foundItem) {
				setCover(foundItem)
				toast.success('已设置封面')
				return
			}
		}

		// 处理直接拖入文件的情况：筛选图片文件并添加到图片库，然后将第一张设为封面
		const files = e.dataTransfer.files
		if (files && files.length > 0) {
			const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
			if (imageFiles.length === 0) {
				toast.error('请拖入图片文件')
				return
			}

			// 将文件传入 store 进行添加，得到处理后的图片对象数组
			const resultImages = await addFiles(imageFiles as unknown as FileList)
			if (resultImages && resultImages.length > 0) {
				// 使用第一个图片作为封面
				setCover(resultImages[0])
				toast.success('已设置封面')
			}
			return
		}
	}

	// 点击加号区域时，触发隐藏的 input 选择框
	const handleClickUpload = () => {
		fileInputRef.current?.click()
	}

	// 通过系统文件选择框选取图片后的处理，同样添加到图片库并设为封面
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		const resultImages = await addFiles(files)
		if (resultImages && resultImages.length > 0) {
			// 使用第一个图片作为封面
			setCover(resultImages[0])
			toast.success('已设置封面')
		}

		// 重置 input 的值，确保再次选择同一个文件时能触发 onChange
		e.target.value = ''
	}

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }}
			className='card relative'
		>
			<h2 className='text-sm'>封面</h2>
			{/* 隐藏的文件选择框，用于点击后选择本地图片 */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={handleFileChange}
			/>
			{/* 封面预览区域，支持拖拽图片设置封面 */}
			<div
				className='bg-card mt-3 h-[150px] overflow-hidden rounded-xl border'
				onDragOver={e => {
					e.preventDefault()
				}}
				onDrop={handleCoverDrop}
			>
				{/* 已有封面图片时显示预览，否则显示上传占位符 */}
				{!!coverPreviewUrl ? (
					<img
						src={coverPreviewUrl}
						alt='cover preview'
						className='h-full w-full rounded-2xl object-cover'
					/>
				) : (
					<div
						className='grid h-full w-full cursor-pointer place-items-center transition-colors hover:bg-white/60'
						onClick={handleClickUpload}
					>
						<span className='text-3xl leading-none text-neutral-400'>+</span>
					</div>
				)}
			</div>
		</motion.div>
	)
}
