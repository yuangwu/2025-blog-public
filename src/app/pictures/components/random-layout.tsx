'use client'

// 引入 React 相关的 hooks
import { useEffect, useMemo, useRef, useState } from 'react'
// 引入 framer-motion 的 motion 组件，用于动画
import { motion } from 'motion/react'
// 引入自定义 hook：用于初始化及获取视口中心坐标
import { useCenterInit, useCenterStore } from '@/hooks/use-center'
// Picture 类型定义，从上级目录的 page 组件中引入
import { Picture } from '../page'
// 站点配置文件（JSON），包含了背景颜色数组等全局配置
// 注意：需要确保 @/config/site-content.json 文件存在且包含 backgroundColors 字段
import siteContent from '@/config/site-content.json'
// 工具函数：用于合并 CSS 类名
import { cn } from '@/lib/utils'
// 自定义 hook：用于获取屏幕尺寸断点信息
import { useSize } from '@/hooks/use-size'

// RandomLayout 组件的 Props 类型定义
interface RandomLayoutProps {
	pictures: Picture[]
	isEditMode?: boolean
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void
	onDeleteGroup?: (picture: Picture) => void
}

// 每张图片在布局中的位置及旋转信息
type PositionedItem = {
	x: number
	y: number
	rotation: number
}

// 图片原始尺寸
type OriginalSize = {
	width: number
	height: number
}

// 单个浮动图片组件的 Props
interface FloatingImageProps {
	url: string
	index: number
	groupIndex: number
	position: PositionedItem
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single'
	isEditMode?: boolean
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void
	onDeleteGroup?: () => void
}

// 构建用于渲染的 URL 列表项
type UrlItem = {
	url: string
	groupIndex: number
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single'
}

/**
 * 将 Picture 数组转换为扁平化的 UrlItem 列表
 * 单张图片和图片组都会被拆分为独立的项，保留分组索引
 */
const buildUrlList = (pictures: Picture[]): UrlItem[] => {
	const result: UrlItem[] = []

	for (const [index, picture] of pictures.entries()) {
		// 处理单张图片
		if (picture.image) {
			result.push({
				url: picture.image,
				groupIndex: index,
				description: picture.description,
				uploadedAt: picture.uploadedAt,
				pictureId: picture.id,
				imageIndex: 'single'
			})
		}

		// 处理图片组（多图）
		if (picture.images && picture.images.length > 0) {
			result.push(
				...picture.images.map((url, imageIndex) => ({
					url,
					groupIndex: index,
					description: picture.description,
					uploadedAt: picture.uploadedAt,
					pictureId: picture.id,
					imageIndex: imageIndex
				}))
			)
		}
	}

	return result
}

// 全局 z-index 计数器，用于管理图片的层级
let lastZIndex = 10
// 最大 z-index 值，用于全屏查看时的遮罩和预览
const TOP_Z_INDEX = 9999

/**
 * 格式化上传时间字符串
 * 输入 ISO 时间戳，输出 "YYYY-MM-DD HH:mm" 格式
 */
const formatUploadedAt = (uploadedAt?: string) => {
	if (!uploadedAt) return ''
	const date = new Date(uploadedAt)
	// 如果日期非法，直接返回原始字符串
	if (Number.isNaN(date.getTime())) return uploadedAt

	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')

	return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 从 localStorage 加载保存的拖拽偏移量
 * 每个图片 URL 对应一个偏移量记录
 */
const loadSavedOffset = (url: string): { x: number; y: number } => {
	try {
		const saved = localStorage.getItem(`picture-offset-${url}`)
		if (saved) {
			const parsed = JSON.parse(saved)
			return { x: parsed.x || 0, y: parsed.y || 0 }
		}
	} catch (error) {
		console.error('Failed to load saved offset:', error)
	}
	return { x: 0, y: 0 }
}

/**
 * 将拖拽偏移量保存到 localStorage
 */
const saveOffset = (url: string, offset: { x: number; y: number }) => {
	try {
		localStorage.setItem(`picture-offset-${url}`, JSON.stringify(offset))
	} catch (error) {
		console.error('Failed to save offset:', error)
	}
}

/**
 * 浮动图片组件
 * 支持拖拽移动、点击放大、编辑模式下的删除操作
 */
const FloatingImage = ({
	url,
	index,
	groupIndex,
	position,
	description,
	uploadedAt,
	pictureId,
	imageIndex,
	isEditMode,
	onDeleteSingle,
	onDeleteGroup
}: FloatingImageProps) => {
	// 获取视口中心坐标
	const { centerX, centerY } = useCenterStore()
	// maxSM：小屏标记；init：尺寸 hook 的初始化函数（当前未调用，如有必要应在父组件调用）
	const { maxSM, init } = useSize()
	// body 元素的引用，用作拖拽约束边界
	// 注意：在服务端渲染时 document 不可用，此处直接使用 document.body 可能在 SSR 阶段报错
	// 但在客户端组件挂载后实际使用是安全的
	const bodyRef = useRef(document.body)
	// 记录鼠标按下的时间戳，用于判断是点击还是拖拽
	const mouseDownTimeRef = useRef<number | null>(null)
	// 当前图片的 z-index 层级
	const [zIndex, setZIndex] = useState(index)
	// 控制组件是否显示（用于入场动画延迟）
	const [show, setShow] = useState(false)
	// 从 localStorage 恢复拖拽偏移量
	const [dragOffset, setDragOffset] = useState(() => loadSavedOffset(url))

	// 入场延迟显示，实现依次出现的效果
	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 200 * index)
	}, [])

	// 图片原始尺寸（加载后获取）
	const [originalSize, setOriginalSize] = useState<OriginalSize | null>(null)

	// 根据原始尺寸计算展示尺寸，并限制宽高比在 2/3 ~ 3/2 之间
	const displaySize = useMemo(() => {
		if (!originalSize) {
			return { width: 200, height: 200 }
		}

		const ratio = originalSize.width / originalSize.height
		const minRatio = 2 / 3
		const maxRatio = 3 / 2
		const clampedRatio = Math.min(Math.max(ratio, minRatio), maxRatio)

		const baseWidth = 200

		return {
			width: baseWidth,
			height: baseWidth / clampedRatio
		}
	}, [originalSize])

	// 全屏查看时的尺寸，根据视口大小等比缩放
	const zoomedSize = useMemo(() => {
		if (!originalSize) {
			return { width: 200, height: 200 }
		}

		// 服务端渲染保护
		if (typeof window === 'undefined') {
			return originalSize
		}

		const padding = 24
		const maxWidth = document.documentElement.clientWidth - padding * 2
		const maxHeight = document.documentElement.clientHeight - padding * 2

		const scale = Math.min(maxWidth / originalSize.width, maxHeight / originalSize.height, 1)

		return {
			width: originalSize.width * scale,
			height: originalSize.height * scale
		}
	}, [originalSize])

	// 是否处于全屏放大状态
	const [isZoomed, setIsZoomed] = useState(false)
	// 拖拽开始时的偏移量快照，用于计算新偏移
	const dragStartOffsetRef = useRef({ x: 0, y: 0 })

	// 未获得位置信息或尚未显示时，不渲染任何内容
	if (!position || !show) return null

	return (
		<>
			{/* 全屏查看时的半透明背景遮罩 */}
			{isZoomed && (
				<motion.div
					onClick={() => {
						setIsZoomed(false)
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3 }}
					style={{ zIndex: TOP_Z_INDEX }}
					className='bg-card fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl'
				/>
			)}
			{/* 图片主体 */}
			<motion.div
				drag={!isZoomed} // 全屏时禁止拖拽
				dragConstraints={bodyRef} // 拖拽边界限制在 body 范围内
				dragMomentum={false}
				onDragStart={() => {
					if (!isZoomed) {
						// 记录拖拽开始时的偏移量
						dragStartOffsetRef.current = { ...dragOffset }
					}
				}}
				onMouseDown={event => {
					// 点击时提升层级
					lastZIndex = lastZIndex + 1
					setZIndex(lastZIndex)
					mouseDownTimeRef.current = event.timeStamp
				}}
				onMouseUp={event => {
					if (mouseDownTimeRef.current !== null) {
						const duration = event.timeStamp - mouseDownTimeRef.current
						// 短按（≤150ms）视为点击，切换全屏状态
						if (duration <= 150) {
							if (!isZoomed) {
								setIsZoomed(true)
							} else if (maxSM) {
								// 小屏下再次点击可退出全屏
								setIsZoomed(false)
							}
						}
					}
					mouseDownTimeRef.current = null
				}}
				onDragEnd={(_, info) => {
					if (!isZoomed) {
						// 计算新的拖拽偏移量并保存
						const newOffset = {
							x: dragStartOffsetRef.current.x + info.offset.x,
							y: dragStartOffsetRef.current.y + info.offset.y
						}
						setDragOffset(newOffset)
						saveOffset(url, newOffset)
					}
				}}
				initial={{
					width: displaySize.width,
					height: displaySize.height,
					borderWidth: 8,
					zIndex,
					left: centerX + position.x,
					top: centerY + position.y,
					rotate: position.rotation,
					scale: 0.6,
					opacity: 0,
					x: dragOffset.x,
					y: dragOffset.y
				}}
				animate={
					isZoomed
						? {
								zIndex: TOP_Z_INDEX,
								left: centerX,
								top: centerY,
								rotate: 0,
								scale: 1,
								opacity: 1,
								x: 0,
								y: 0,
								width: zoomedSize.width,
								height: zoomedSize.height,
								borderWidth: maxSM ? 12 : 24
							}
						: {
								zIndex,
								scale: 1,
								opacity: 1,
								left: centerX + position.x,
								top: centerY + position.y,
								rotate: position.rotation,
								x: dragOffset.x,
								y: dragOffset.y,
								width: displaySize.width,
								height: displaySize.height,
								borderWidth: 8
							}
				}
				transition={{ type: 'tween', ease: 'easeOut' }}
				className={cn(
					'pointer-events-auto absolute origin-center -translate-1/2 cursor-pointer shadow-xl transition-[scale]',
					!isEditMode && !isZoomed && 'hover:scale-105'
				)}>
				{/* 图片元素，加载后获取原始尺寸 */}
				<motion.img
					src={url}
					onLoad={event => {
						const img = event.currentTarget
						setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight })
					}}
					draggable={false}
					className={cn('h-full w-full object-cover select-none')}
				/>
				{/* 编辑模式下的单张删除按钮 */}
				{isEditMode && !isZoomed && (
					<motion.button
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						onClick={e => {
							e.stopPropagation()
							onDeleteSingle?.(pictureId, imageIndex)
						}}
						onMouseUp={e => {
							e.stopPropagation()
						}}
						className='absolute -top-2 -right-2 rounded-full bg-red-500 p-1.5 opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105 hover:bg-red-600'
						style={{ zIndex: 1 }}>
						<svg xmlns='http://www.w3.org/2000/svg' className='h-3 w-3 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
						</svg>
					</motion.button>
				)}
			</motion.div>

			{/* 全屏时显示描述卡片 */}
			{isZoomed && description && (
				<motion.div
					drag
					dragConstraints={maxSM ? undefined : bodyRef}
					dragMomentum={false}
					className='fixed min-h-[150px] w-[200px] cursor-pointer p-6 shadow'
					style={{
						// 根据分组索引循环使用配置中的背景颜色
						backgroundColor: siteContent.backgroundColors[groupIndex % siteContent.backgroundColors.length],
						zIndex: TOP_Z_INDEX + 1,
						right: maxSM ? 12 : centerX / 3,
						top: maxSM ? 12 : centerY
					}}
					initial={{ opacity: 0, scale: 0.4 }}
					animate={{ opacity: 1, scale: 1 }}>
					<div className='text-secondary mb-2 text-xs'>{formatUploadedAt(uploadedAt)}</div>
					<div className='text-sm'>{description}</div>
				</motion.div>
			)}
		</>
	)
}

// 基于唯一标识（图片 URL）缓存并生成稳定的位置，避免每次重新渲染时位置改变
const positionCacheRef = new Map<string, PositionedItem>()

/**
 * 根据唯一 ID 计算稳定的布局位置
 * 利用哈希值生成伪随机的极坐标位置和旋转角度
 */
const getStablePosition = (uniqueId: string, width: number, height: number): PositionedItem => {
	// 命中缓存直接返回
	if (positionCacheRef.has(uniqueId)) {
		return positionCacheRef.get(uniqueId)!
	}

	// 通过字符串哈希计算出数值
	let hash = 0
	for (let i = 0; i < uniqueId.length; i++) {
		const char = uniqueId.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // 转为 32 位整数
	}
	const stableIndex = Math.abs(hash) % 10000

	// 最大散布半径
	const maxRadius = Math.min(width, height) / 2 - 100
	const goldenAngle = Math.PI * (3 - Math.sqrt(5))

	// 通过稳定索引计算极坐标
	const t = (stableIndex % 1000) / 1000
	const radius = Math.pow(t, 0.8) * maxRadius
	const angle = stableIndex * goldenAngle

	const baseX = radius * Math.cos(angle)
	const baseY = radius * Math.sin(angle)

	// 生成稳定的抖动偏移，避免图片完全对齐规则分布
	const jitterSeed = Math.abs(hash) % 1000
	const jitterRadius = 12
	const jitterX = (jitterSeed % (jitterRadius * 2)) - jitterRadius
	const jitterY = ((jitterSeed * 7) % (jitterRadius * 2)) - jitterRadius

	// 抖动旋转角度
	const rotation = ((jitterSeed * 13) % 60) - 30

	const position = {
		x: baseX + jitterX,
		y: baseY + jitterY,
		rotation
	}

	// 缓存计算结果
	positionCacheRef.set(uniqueId, position)
	return position
}

/**
 * 随机布局组件
 * 接收图片数据，生成浮动图片的随机/稳定分布
 */
export const RandomLayout = ({ pictures, isEditMode = false, onDeleteSingle, onDeleteGroup }: RandomLayoutProps) => {
	// 初始化视口中心数据
	useCenterInit()
	const { width, height } = useCenterStore()
	// 控制整体入场显示
	const [show, setShow] = useState(false)

	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 1000)
	}, [])

	// 将输入的 pictures 扁平化为 URL 列表
	const urls = useMemo(() => buildUrlList(pictures), [pictures])

	// 构建 picture.id -> Picture 的映射，用于快速查找分组信息
	const pictureMap = useMemo(() => {
		const map = new Map<string, Picture>()
		pictures.forEach(picture => {
			map.set(picture.id, picture)
		})
		return map
	}, [pictures])

	// 没有内容或视口尺寸尚未就绪时不渲染
	if (!urls.length || !width || !height) {
		return null
	}

	// 未到显示时间不渲染
	if (!show) return null

	// 更新全局 z-index 基准，确保新加载的图片在旧图片之上
	lastZIndex = urls.length + 11

	return (
		<>
			{urls.map((item, index) => {
				// 查找对应的 Picture 分组
				const picture = pictureMap.get(item.pictureId)
				const uniqueId = item.url
				// 获取稳定的布局位置
				const position = getStablePosition(uniqueId, width, height)

				return (
					<FloatingImage
						key={uniqueId}
						url={item.url}
						index={index}
						groupIndex={item.groupIndex}
						position={position}
						description={item.description}
						uploadedAt={item.uploadedAt}
						pictureId={item.pictureId}
						imageIndex={item.imageIndex}
						isEditMode={isEditMode}
						onDeleteSingle={onDeleteSingle}
						onDeleteGroup={picture ? () => onDeleteGroup?.(picture) : undefined}
					/>
				)
			})}
		</>
	)
}
