// 声明这是一个客户端组件，因为用到了 React 状态、事件处理、浏览器 API 等
'use client'

import { useMemo, useRef, useState } from 'react'
// 引入 motion 动画组件
import { motion } from 'motion/react'
// 自定义的文章编辑器状态管理 store
import { useWriteStore } from '../../stores/write-store'
// Next.js 的 Link 组件，用于外部工具跳转
import Link from 'next/link'

// 组件的 props 类型定义
type ImagesSectionProps = {
	// 动画延迟时间，可选，默认 0 秒
	delay?: number
}

/**
 * 图片管理区块组件
 * 提供通过 URL 添加图片、本地拖拽/选择文件上传、删除图片、设置封面的功能
 * 并支持将图片拖拽生成 Markdown 格式文本
 */
export function ImagesSection({ delay = 0 }: ImagesSectionProps) {
	// 从全局 store 获取图片相关数据和方法
	const { images, cover, addUrlImage, addFiles, deleteImage } = useWriteStore()

	// 控制 URL 输入框的本地状态
	const [urlInput, setUrlInput] = useState<string>('')
	// 用于触发隐藏的文件选择 input 的引用
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 当前文章选中的封面 ID（如果存在）
	const coverId = cover?.id ?? null

	return (
		// 使用 motion 动画包裹整个卡片，初始淡入并从小放大，动画延迟由 props 控制
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }}
			className='card relative'
		>
			{/* 标题栏：左侧标题，右侧跳转到图片压缩工具的链接 */}
			<div className='flex items-center justify-between'>
				<h2 className='text-sm'>图片管理</h2>
				<Link href='/image-toolbox' target='_blank' className='text-xs hover:underline'>
					压缩工具
				</Link>
			</div>

			{/* URL 添加图片区域：输入框 + 添加按钮 */}
			<div className='mt-3 flex items-center gap-2'>
				<input
					type='text'
					placeholder='https://...'
					className='bg-card flex-1 rounded-lg border px-3 py-2 text-sm'
					value={urlInput}
					onChange={e => setUrlInput(e.target.value)}
				/>
				<button
					className='rounded-lg border bg-white/70 px-3 py-2 text-sm'
					onClick={() => {
						// 去除空格后若不为空，调用 store 的方法添加 URL 图片并清空输入框
						const v = urlInput.trim()
						if (!v) return
						addUrlImage(v)
						setUrlInput('')
					}}
				>
					添加
				</button>
			</div>

			{/* 隐藏的文件选择 input，支持多选图片，点击加号或通过拖拽会触发 */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				multiple
				className='hidden'
				onChange={e => {
					const files = e.target.files
					if (files && files.length > 0) {
						// 将选择的文件批量添加到 store
						addFiles(files)
					}
					// 清空 input 的值，保证再次选择同一文件也会触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 图片网格展示区：4 列布局 */}
			<div className='mt-3 grid grid-cols-4 gap-2'>
				{/* 添加图片的加号卡片，点击打开文件选择，支持拖拽文件到上面 */}
				<div
					className='group bg-card hover:bg-secondary/20 relative grid aspect-square cursor-pointer place-items-center rounded-lg border'
					onClick={() => fileInputRef.current?.click()}
					// 拖拽悬停时阻止默认行为以允许放置
					onDragOver={e => {
						e.preventDefault()
					}}
					onDrop={e => {
						e.preventDefault()
						const files = e.dataTransfer.files
						// 将拖入的文件添加到 store
						if (files && files.length) addFiles(files)
					}}
				>
					<span className='text-2xl leading-none text-neutral-400'>+</span>
				</div>

				{/* 遍历渲染所有已添加的图片 */}
				{images.map(item => {
					// 判断图片来源：url 或本地文件
					const isUrl = item.type === 'url'
					// 预览地址或原地址
					const src = isUrl ? item.url : item.previewUrl
					// 生成拖拽时使用的 Markdown 文本（本地图片保留特殊标记）
					const markdown = isUrl ? `![](${item.url})` : `![](local-image:${item.id})`
					// 当前图片是否为设置的封面
					const isCover = coverId === item.id

					return (
						<div
							key={item.id}
							className={`group relative aspect-square overflow-hidden rounded-lg border bg-white/50 text-xs ${
								isCover ? 'ring-2 ring-blue-500' : ''
							}`}
						>
							{/* 图片本身，支持拖拽携带 Markdown 数据 */}
							<img
								src={src}
								className='h-full w-full object-cover'
								draggable
								onDragStart={e => {
									// 设置拖拽数据（纯文本与 Markdown 类型），方便拖入文本编辑器
									e.dataTransfer.setData('text/plain', markdown)
									e.dataTransfer.setData('text/markdown', markdown)
								}}
							/>
							{/* 封面标记：蓝色标签显示在左上角 */}
							{isCover && (
								<div className='absolute top-1 left-1 rounded-md bg-blue-500 px-1.5 py-0.5 text-white shadow'>
									封面
								</div>
							)}
							{/* 鼠标悬停时显示的删除按钮 */}
							<div className='absolute top-1 right-1 hidden group-hover:flex'>
								<button
									type='button'
									className='rounded-md bg-white/80 px-1.5 py-0.5 shadow hover:bg-white'
									onClick={() => deleteImage(item.id)}
								>
									删除
								</button>
							</div>
						</div>
					)
				})}
			</div>
		</motion.div>
	)
}