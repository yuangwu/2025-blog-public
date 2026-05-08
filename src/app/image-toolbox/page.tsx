'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { motion } from 'motion/react'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts' // 动画相关常量
import { DialogModal } from '@/components/dialog-modal' // 对比图的模态框组件

/** 转换后的图片元数据 */
type ConvertedMeta = {
	url: string    // 转换后图片的本地预览地址 (blob URL)
	size: number   // 转换后图片的文件大小 (字节)
}

/** 已选择的单张图片信息 */
type SelectedImage = {
	file: File             // 原始文件对象
	preview: string        // 原图的本地预览地址 (blob URL)
	width: number          // 原图宽度
	height: number         // 原图高度
	converted?: ConvertedMeta // 转换后的信息 (可选)
	converting?: boolean   // 是否正在转换中
}

/** 文件名展示的最大长度 */
const MAX_NAME_LENGTH = 32

/**
 * 获取文件扩展名 (包含点)
 * @param name 文件名
 * @returns 扩展名，如 ".png"，若没有则返回空字符串
 */
function getFileExtension(name: string) {
	const idx = name.lastIndexOf('.')
	return idx >= 0 ? name.slice(idx) : ''
}

/**
 * 格式化文件名用于展示，超出长度自动截断并添加省略号
 * @param name 原始文件名
 * @returns 格式化后的文件名
 */
function formatFileName(name: string) {
	if (name.length <= MAX_NAME_LENGTH) return name
	const ext = getFileExtension(name)
	if (!ext) {
		return `${name.slice(0, MAX_NAME_LENGTH - 3)}...`
	}
	// 保留扩展名完整性，截取基本文件名部分
	const maxBaseLength = Math.max(1, MAX_NAME_LENGTH - ext.length - 3)
	return `${name.slice(0, maxBaseLength)}...${ext}`
}

/**
 * 格式化字节大小为可读字符串
 * @param bytes 字节数
 * @returns 格式化后的字符串，如 "2.5 MB"
 */
function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes.toFixed(0)} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * 将图片文件转换为 WebP 格式
 * @param file 原始图片文件
 * @param quality 转换质量 (0-1)
 * @param maxWidth 可选的最大宽度，超过则等比缩放
 * @returns 转换后的 Blob 对象
 */
async function fileToWebp(file: File, quality: number, maxWidth?: number) {
	const bitmap = await createImageBitmap(file) // 解码图片
	const canvas = document.createElement('canvas')

	let width = bitmap.width
	let height = bitmap.height

	// 如果指定了最大宽度且原图宽度超过，则等比缩放
	if (maxWidth && width > maxWidth) {
		const ratio = maxWidth / width
		width = maxWidth
		height = Math.round(height * ratio)
	}

	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('无法初始化画布')
	ctx.drawImage(bitmap, 0, 0, width, height)

	// 通过 canvas 输出为 WebP blob
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			result => {
				if (result) resolve(result)
				else reject(new Error('无法生成 WEBP 文件'))
			},
			'image/webp',
			quality
		)
	})
	return blob
}

export default function Page() {
	// ========== 状态管理 ==========
	const [images, setImages] = useState<SelectedImage[]>([])   // 已选择的图片列表
	const [quality, setQuality] = useState(0.8)                // WebP 转换质量
	const [limitMaxWidth, setLimitMaxWidth] = useState(false)  // 是否限制最大宽度
	const [maxWidth, setMaxWidth] = useState(1200)             // 最大宽度值
	const [batchConverting, setBatchConverting] = useState(false) // 是否正在批量转换
	const [compareIndex, setCompareIndex] = useState<number | null>(null) // 当前对比的图片索引
	const [isDragging, setIsDragging] = useState(false)       // 是否正在拖拽文件进入区域

	const hasImages = images.length > 0                        // 是否有图片
	const hasConvertible = images.length > 0                   // 存在可转换的图片（数量 > 0）
	const hasConverted = images.some(item => !!item.converted) // 是否存在已转换完成的图片

	// 使用 ref 保存最新的图片列表，避免闭包陈旧引用问题（主要用于批量转换循环）
	const imagesRef = useRef<SelectedImage[]>([])
	// 拖拽计数器，用于处理子元素触发多次 enter/leave 的问题
	const dragCounterRef = useRef(0)

	// 同步最新 images 到 ref
	useEffect(() => {
		imagesRef.current = images
	}, [images])

	// ========== 文件处理 ==========
	/**
	 * 处理用户选择的文件列表
	 * @param fileList 从 input 或拖拽事件来的文件列表
	 */
	const handleFiles = useCallback(async (fileList: FileList | null) => {
		if (!fileList?.length) return
		// 过滤掉非图片文件
		const files = Array.from(fileList).filter(file => file.type.startsWith('image/'))
		if (!files.length) return

		// 并行读取每张图片的尺寸并创建预览 URL
		const nextItems = await Promise.all(
			files.map(async file => {
				const preview = URL.createObjectURL(file)
				const bitmap = await createImageBitmap(file) // 获取宽高
				return {
					file,
					preview,
					width: bitmap.width,
					height: bitmap.height
				}
			})
		)

		// 更新列表，重名/同大小的文件去重
		setImages(prev => {
			const deduped = [...prev]
			nextItems.forEach(item => {
				const exists = deduped.some(existing => {
					return existing.file.name === item.file.name && existing.file.size === item.file.size && existing.file.lastModified === item.file.lastModified
				})
				if (!exists) {
					deduped.push(item)
				} else {
					// 如果重复，释放刚创建的预览 URL，避免内存泄漏
					URL.revokeObjectURL(item.preview)
				}
			})
			return deduped
		})
	}, [])

	// ========== 拖拽事件处理 ==========
	const handleDragEnter = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
		dragCounterRef.current += 1
		setIsDragging(true)
	}, [])

	const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
	}, [])

	const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
		dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
		if (dragCounterRef.current === 0) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(event: DragEvent<HTMLLabelElement>) => {
			event.preventDefault()
			event.stopPropagation()
			setIsDragging(false)
			dragCounterRef.current = 0
			handleFiles(event.dataTransfer?.files ?? null)
		},
		[handleFiles]
	)

	// 计算所有图片总大小
	const totalSize = useMemo(() => {
		const bytes = images.reduce((acc, item) => acc + item.file.size, 0)
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`
	}, [images])

	// ========== 转换单张图片 ==========
	const handleConvertImage = useCallback(
		async (index: number) => {
			const target = images[index]
			if (!target || target.converting) return

			// 标记为“转换中”
			setImages(prev => prev.map((item, idx) => (idx === index ? { ...item, converting: true } : item)))
			try {
				const blob = await fileToWebp(target.file, quality, limitMaxWidth ? maxWidth : undefined)
				const url = URL.createObjectURL(blob)
				setImages(prev =>
					prev.map((item, idx) => {
						if (idx !== index) return item
						// 如果之前有转换结果，释放旧的 blob URL
						if (item.converted?.url) {
							URL.revokeObjectURL(item.converted.url)
						}
						return {
							...item,
							converting: false,
							converted: {
								url,
								size: blob.size
							}
						}
					})
				)
			} catch (error) {
				console.error(error)
				alert('转换过程中出现问题，请稍后再试')
				// 转换失败恢复状态
				setImages(prev => prev.map((item, idx) => (idx === index ? { ...item, converting: false } : item)))
			}
		},
		[images, quality, limitMaxWidth, maxWidth]
	)

	// ========== 下载单张转换后的图片 ==========
	const handleDownloadImage = useCallback(
		(index: number) => {
			const target = images[index]
			if (!target?.converted) return
			const link = document.createElement('a')
			const baseName = target.file.name.replace(/\.[^.]+$/, '') // 去掉原扩展名
			link.href = target.converted.url
			link.download = `${baseName}.webp`
			document.body.appendChild(link)
			link.click()
			link.remove()
		},
		[images]
	)

	// ========== 批量转换所有图片 ==========
	const handleConvertAll = useCallback(async () => {
		if (!hasImages || batchConverting) return
		setBatchConverting(true)
		try {
			// 使用 ref 避免闭包陈旧问题，依次转换
			for (let i = 0; i < imagesRef.current.length; i += 1) {
				const current = imagesRef.current[i]
				if (!current) continue
				// 标记当前图片为转换中
				setImages(prev => prev.map((item, idx) => (idx === i ? { ...item, converting: true } : item)))
				const blob = await fileToWebp(current.file, quality, limitMaxWidth ? maxWidth : undefined)
				const url = URL.createObjectURL(blob)
				setImages(prev =>
					prev.map((item, idx) => {
						if (idx !== i) return item
						if (item.converted?.url) {
							URL.revokeObjectURL(item.converted.url)
						}
						return {
							...item,
							converting: false,
							converted: {
								url,
								size: blob.size
							}
						}
					})
				)
			}
		} catch (error) {
			console.error(error)
			alert('批量转换过程中出现问题，请稍后再试')
		} finally {
			setBatchConverting(false)
		}
	}, [batchConverting, hasImages, quality, limitMaxWidth, maxWidth])

	// ========== 下载全部已转换的图片 ==========
	const handleDownloadAll = useCallback(() => {
		if (!hasConverted) return
		images.forEach(item => {
			if (!item.converted) return
			const link = document.createElement('a')
			const baseName = item.file.name.replace(/\.[^.]+$/, '')
			link.href = item.converted.url
			link.download = `${baseName}.webp`
			document.body.appendChild(link)
			link.click()
			link.remove()
		})
	}, [images, hasConverted])

	// ========== 移除图片 ==========
	const handleRemoveImage = useCallback((index: number) => {
		setImages(prev => {
			const next = [...prev]
			const removed = next.splice(index, 1)[0]
			if (removed) {
				// 释放 blob URL 避免内存泄漏
				URL.revokeObjectURL(removed.preview)
				if (removed.converted?.url) {
					URL.revokeObjectURL(removed.converted.url)
				}
			}
			return next
		})
	}, [])

	// ========== 图片对比功能 ==========
	const handleCompareImage = useCallback((index: number) => {
		setCompareIndex(index)
	}, [])

	const handleCloseCompare = useCallback(() => {
		setCompareIndex(null)
	}, [])

	// 组件卸载时清理所有 blob URL
	useEffect(() => {
		return () => {
			imagesRef.current.forEach(item => {
				URL.revokeObjectURL(item.preview)
				if (item.converted?.url) {
					URL.revokeObjectURL(item.converted.url)
				}
			})
		}
	}, [])

	// ========== 渲染 ==========
	return (
		<div className='relative px-6 pt-32 pb-12 text-sm max-sm:pt-28'>
			<div className='mx-auto flex max-w-3xl flex-col gap-6'>
				{/* 页面标题区域，带入场动画 */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY }}
					className='space-y-2 text-center'>
					<p className='text-secondary text-xs tracking-[0.2em] uppercase'>Image Toolbox</p>
					<h1 className='text-2xl font-semibold'>PNG / JPG 转 WEBP</h1>
					<p className='text-secondary'>选择图片 → 调整质量 → 一键转换下载</p>
				</motion.div>

				{/* 拖拽/点击上传区域 */}
				<motion.label
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY }}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`group hover:border-brand/20 card relative flex cursor-pointer flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-white/80 ${
						isDragging ? 'border-brand bg-white' : ''
					}`}>
					{/* 隐藏的原生文件选择 input */}
					<input type='file' accept='image/*' multiple className='hidden' onChange={event => handleFiles(event.target.files)} />
					<div className='bg-brand/10 text-brand/60 group-hover:bg-brand/10 flex h-20 w-20 items-center justify-center rounded-full text-3xl transition'>
						📷
					</div>
					<div>
						<p className='text-base font-medium'>点击或拖拽图片</p>
						<p className='text-secondary text-xs'>支持 PNG、JPG、JPEG、HEIC 等常见格式</p>
					</div>
				</motion.label>

				{/* 已选择图片列表 */}
				{hasImages && (
					<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='card relative'>
						<div className='text-secondary flex items-center justify-between border-b border-slate-200 pb-3 text-xs tracking-[0.2em] uppercase'>
							<span>已选择 {images.length} 张图片</span>
							<span>{totalSize}</span>
						</div>
						<ul className='divide-y divide-slate-200'>
							{images.map((item, index) => {
								const { file, preview, converted, converting } = item
								return (
									<li key={`${file.name}-${index}`} className='flex items-center gap-4 py-3'>
										{/* 缩略图 */}
										<div className='h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50'>
											<img src={preview} alt={file.name} className='h-full w-full object-cover' />
										</div>
										{/* 文件信息 */}
										<div className='flex flex-1 flex-col'>
											<p className='font-medium'>{formatFileName(file.name)}</p>
											<p className='text-secondary text-xs'>
												{item.width} × {item.height} · {formatBytes(file.size)}
												{converted ? `（转换后 ${formatBytes(converted.size)}）` : ''}
											</p>
										</div>
										{/* 操作按钮 */}
										<div className='flex flex-wrap justify-end gap-2 text-xs'>
											<button
												onClick={() => handleConvertImage(index)}
												disabled={!!converting}
												className='rounded-full px-3 py-1 font-medium transition disabled:cursor-not-allowed disabled:text-slate-300'>
												{converting ? '转换中...' : converted ? '重新转换' : '转换'}
											</button>
											{converted ? (
												<>
													<button
														onClick={() => handleCompareImage(index)}
														className='border-brand text-brand hover:bg-brand/10 rounded-full border px-3 py-1 font-semibold transition'>
														对比
													</button>
													<button
														onClick={() => handleDownloadImage(index)}
														className='border-brand text-brand hover:bg-brand/10 rounded-full border px-3 py-1 font-semibold transition'>
														下载
													</button>
												</>
											) : null}
											<button
												onClick={() => handleRemoveImage(index)}
												className='rounded-full border border-red-200 px-3 py-1 font-medium text-rose-400 transition hover:bg-rose-50'>
												移除
											</button>
										</div>
									</li>
								)
							})}
						</ul>
					</motion.div>
				)}

				{/* 转换设置与批量操作区域 */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + 2 * ANIMATION_DELAY }}
					className='card relative'>
					<div className='flex flex-wrap items-center gap-4'>
						<div className='flex-1 space-y-4'>
							{/* 质量滑块 */}
							<div>
								<p className='text-secondary text-xs tracking-[0.2em] uppercase'>质量</p>
								<div className='flex items-center gap-3 pt-2'>
									<input
										type='range'
										min={0.3}
										max={1}
										step={0.05}
										value={quality}
										onChange={event => setQuality(parseFloat(event.target.value))}
										className='range-track'
									/>
									<span className='w-12 text-right text-sm font-medium'>{Math.round(quality * 100)}%</span>
								</div>
								<p className='text-xs text-slate-500'>使用 canvas.toDataURL(&apos;image/webp&apos;, &#123;quality.toFixed(2)&#125;)</p>
							</div>
							{/* 限制最大宽度选项 */}
							<div className='flex items-center gap-3'>
								<div className='flex items-center gap-2'>
									<input
										type='checkbox'
										id='limit-max-width'
										checked={limitMaxWidth}
										onChange={event => setLimitMaxWidth(event.target.checked)}
										className='h-4 w-4 rounded border-slate-300'
									/>
									<label htmlFor='limit-max-width' className='text-secondary cursor-pointer text-xs tracking-[0.2em] uppercase'>
										限制最大宽度
									</label>
								</div>
								{limitMaxWidth && (
									<div className='flex items-center gap-2'>
										<input
											type='number'
											min={100}
											max={10000}
											step={100}
											value={maxWidth}
											onChange={event => setMaxWidth(Math.max(100, parseInt(event.target.value) || 1200))}
											className='w-24 rounded border border-slate-200 px-2 py-1 text-sm'
										/>
										<span className='text-xs text-slate-500'>px</span>
									</div>
								)}
							</div>
						</div>
						{/* 全局操作按钮 */}
						<div className='flex flex-wrap gap-2 text-sm'>
							<button
								onClick={handleConvertAll}
								disabled={!hasConvertible || batchConverting}
								className='rounded-full border border-slate-200 px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300'>
								{batchConverting ? '全部转换中…' : '全部转换'}
							</button>
							<button
								onClick={handleDownloadAll}
								disabled={!hasConverted}
								className='border-brand text-brand rounded-full border px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300'>
								全部下载
							</button>
						</div>
					</div>
				</motion.div>
			</div>

			{/* 原图与转换结果对比模态框 */}
			{compareIndex !== null && images[compareIndex]?.converted && (
				<DialogModal open={true} onClose={handleCloseCompare} className='w-full'>
					<div className='grid w-full grid-cols-2 gap-4' onClick={handleCloseCompare}>
						{/* 原图 */}
						<div className='flex flex-col items-end p-4'>
							<div>
								<div className='text-secondary text-center text-sm font-medium'>原图 ({formatBytes(images[compareIndex].file.size)})</div>
								<img src={images[compareIndex].preview} alt='Original' className='mt-3 max-h-[90vh] rounded-xl bg-slate-100' />
							</div>
						</div>
						{/* 转换后 WEBP */}
						<div className='flex flex-col items-start p-4'>
							<div>
								<div className='text-secondary text-center text-sm font-medium'>WEBP ({formatBytes(images[compareIndex].converted!.size)})</div>
								<img src={images[compareIndex].converted!.url} alt='Converted' className='mt-3 max-h-[90vh] rounded-xl bg-slate-100' />
							</div>
						</div>
					</div>
				</DialogModal>
			)}
		</div>
	)
}
