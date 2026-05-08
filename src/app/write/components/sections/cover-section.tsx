// 声明该文件为客户端组件（在 Next.js App Router 中，使用浏览器 API、事件处理等时需要）
'use client'

import { useRef } from 'react'
// motion/react 是 Framer Motion 的 React 绑定，用于创建带动画的 div 元素
import { motion } from 'motion/react'
// sonner 是一个轻量级 toast 通知库，用于弹出提示信息
import { toast } from 'sonner'
// 引入全局状态管理 store（zustand），专门负责“写作”页面或编辑器的状态
import { useWriteStore } from '../../stores/write-store'

// 定义组件的 Props 类型，delay 为可选的动画延迟时间
type CoverSectionProps = {
	delay?: number
}

// 封面选择组件，允许用户拖拽或点击上传一张图片作为封面
export function CoverSection({ delay = 0 }: CoverSectionProps) {
	// 从 store 中获取相关状态和方法：
	// images: 已添加的所有图片列表（图片数据对象数组）
	// setCover: 设置当前封面图片的方法
	// cover: 当前已设置的封面图片对象（或为 null）
	// addFiles: 将 FileList 或 File 数组添加到图片列表并返回添加成功的图片对象数组
	const { images, setCover, cover, addFiles } = useWriteStore()
	// 隐藏的文件输入框引用，用于点击触发文件选择对话框
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 计算封面预览的图片地址：
	// 如果 cover 存在，则根据其类型返回 url 或本地预览地址，否则为 null
	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	// 处理拖拽放下的逻辑：可以从图片列表中拖入已有图片，也可以从系统中拖入新文件
	const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		// 阻止浏览器默认行为（如图片直接打开），允许我们处理拖放数据
		e.preventDefault()

		// ---------- 1. 尝试从拖拽数据中解析出已有的图片（来自图片列表的拖拽）----------
		// 拖拽时可能在 dataTransfer 中存放了 markdown 或纯文本，这里尝试提取
		const md = e.dataTransfer.getData('text/markdown') || e.dataTransfer.getData('text/plain') || ''
		// 用正则匹配 markdown 图片语法 ![](url) 并捕获地址
		const m = /!\[\]\(([^)]+)\)/.exec(md.trim())
		if (m) {
			const target = m[1] // 提取到的图片地址或标识
			let foundItem

			// 如果地址以 "local-image:" 开头，说明是我们自定义的本地图片标识（id）
			if (target.startsWith('local-image:')) {
				const id = target.replace(/^local-image:/, '')
				// 在图片列表中查找 id 匹配的图片对象
				foundItem = images.find(it => it.id === id)
			} else {
				// 否则认为是完整的 URL，查找 type 为 'url' 且 url 匹配的图片
				foundItem = images.find(it => it.type === 'url' && it.url === target)
			}

			// 如果找到了对应的图片，直接用它作为封面并提示成功
			if (foundItem) {
				setCover(foundItem)
				toast.success('已设置封面')
				return
			}
		}

		// ---------- 2. 处理从系统文件管理器直接拖入文件的情况 ----------
		const files = e.dataTransfer.files
		if (files && files.length > 0) {
			// 只保留 MIME 类型以 "image/" 开头的图片文件
			const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
			if (imageFiles.length === 0) {
				toast.error('请拖入图片文件')
				return
			}

			// 调用 addFiles 添加这些文件到全局图片存储，返回添加成功的图片对象数组
			const resultImages = await addFiles(imageFiles as unknown as FileList)
			if (resultImages && resultImages.length > 0) {
				// 使用第一个图片作为封面
				setCover(resultImages[0])
				toast.success('已设置封面')
			}
			return
		}
	}

	// 点击占位符时触发隐藏的文件选择框
	const handleClickUpload = () => {
		fileInputRef.current?.click()
	}

	// 当用户选择了文件后，处理上传
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		// 将选择的文件添加到图片存储
		const resultImages = await addFiles(files)
		if (resultImages && resultImages.length > 0) {
			// 设置第一张为封面
			setCover(resultImages[0])
			toast.success('已设置封面')
		}

		// 重置 input 的值，以便下次仍能选择相同的文件（onChange 事件需要变化才能触发）
		e.target.value = ''
	}

	return (
		// motion.div 用于实现进场动画，从透明 + 0.8 缩放过渡到完全可见
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }} // 使用传入的延迟，控制动画播放时机
			className='card relative'
		>
			<h2 className='text-sm'>封面</h2>

			{/* 隐藏的文件选择 input，accept 属性限制只接受图片文件 */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={handleFileChange}
			/>

			{/* 可拖放的封面区域，拖入时阻止默认行为允许放置 */}
			<div
				className='bg-card mt-3 h-[150px] overflow-hidden rounded-xl border'
				onDragOver={e => {
					e.preventDefault() // 必须调用，否则 onDrop 可能不触发
				}}
				onDrop={handleCoverDrop}
			>
				{/* 如果已有封面预览地址则显示图片，否则显示可点击上传的加号占位 */}
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