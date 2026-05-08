'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import Link from 'next/link'

// 图片区域组件的 props 类型定义
type ImagesSectionProps = {
	delay?: number // 动画延迟时间，单位秒
}

/**
 * 图片管理区域组件
 * 支持通过 URL 添加图片、拖拽或点击上传本地图片、图片预览、设置为封面、删除等操作
 * 同时提供跳转到图片压缩工具的快捷入口
 */
export function ImagesSection({ delay = 0 }: ImagesSectionProps) {
	// 从全局状态管理 store 中获取图片数据与操作方法
	const { images, cover, addUrlImage, addFiles, deleteImage } = useWriteStore()
	// 用于控制 URL 输入框的内容
	const [urlInput, setUrlInput] = useState<string>('')
	// 隐藏的文件选择器引用，用于触发系统文件选择
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 当前封面图片的 id，如果没有封面则为 null
	const coverId = cover?.id ?? null

	return (
		// 使用 motion.div 实现淡入缩放动画效果
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }}
			className='card relative'
		>
			{/* 顶部标题与工具链接 */}
			<div className='flex items-center justify-between'>
				<h2 className='text-sm'>图片管理</h2>
				<Link href='/image-toolbox' target='_blank' className='text-xs hover:underline'>
					压缩工具
				</Link>
			</div>

			{/* URL 输入区域 */}
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
						// 删除首尾空白后判断，非空才添加
						const v = urlInput.trim()
						if (!v) return
						addUrlImage(v)    // 通过 URL 添加图片
						setUrlInput('')   // 清空输入框
					}}>
					添加
				</button>
			</div>

			{/* 隐藏的真实文件选择器，只接受图片，支持多选 */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				multiple
				className='hidden'
				onChange={e => {
					const files = e.target.files
					if (files && files.length > 0) {
						addFiles(files)   // 批量添加本地文件，并自动生成预览
					}
					// 清空当前 input 的值，保证再次选择同一文件时也能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 图片预览网格，4 列 */}
			<div className='mt-3 grid grid-cols-4 gap-2'>
				{/* 加号方块：点击打开文件选择器，同时支持拖拽上传 */}
				<div
					className='group bg-card hover:bg-secondary/20 relative grid aspect-square cursor-pointer place-items-center rounded-lg border'
					onClick={() => fileInputRef.current?.click()}
					// 阻止默认拖拽行为以允许放置
					onDragOver={e => {
						e.preventDefault()
					}}
					onDrop={e => {
						e.preventDefault()
						const files = e.dataTransfer.files
						if (files && files.length) addFiles(files) // 拖拽上传本地文件
					}}>
					<span className='text-2xl leading-none text-neutral-400'>+</span>
				</div>

				{/* 遍历已有的图片数据，逐张渲染预览卡片 */}
				{images.map(item => {
					// 判断当前图片是网络图片还是本地文件
					const isUrl = item.type === 'url'
					// 根据类型选择不同的图片源
					const src = isUrl ? item.url : item.previewUrl
					// 生成对应的 Markdown 文本，用于拖拽到编辑器
					const markdown = isUrl ? `![](${item.url})` : `![](local-image:${item.id})`
					// 检查当前图片是否为封面
					const isCover = coverId === item.id

					return (
						<div
							key={item.id}
							className={`group relative aspect-square overflow-hidden rounded-lg border bg-white/50 text-xs ${
								isCover ? 'ring-2 ring-blue-500' : ''
							}`}>
							{/* 图片本身，可拖拽以插入 Markdown */}
							<img
								src={src}
								className='h-full w-full object-cover'
								draggable
								onDragStart={e => {
									// 设置拖拽数据，支持纯文本与 Markdown 类型
									e.dataTransfer.setData('text/plain', markdown)
									e.dataTransfer.setData('text/markdown', markdown)
								}}
							/>
							{/* 封面标识角标 */}
							{isCover && (
								<div className='absolute top-1 left-1 rounded-md bg-blue-500 px-1.5 py-0.5 text-white shadow'>
									封面
								</div>
							)}
							{/* 鼠标悬停时出现的删除按钮 */}
							<div className='absolute top-1 right-1 hidden group-hover:flex'>
								<button
									type='button'
									className='rounded-md bg-white/80 px-1.5 py-0.5 shadow hover:bg-white'
									onClick={() => deleteImage(item.id)}>
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
