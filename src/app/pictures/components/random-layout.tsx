'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useCenterInit, useCenterStore } from '@/hooks/use-center'
import { Picture } from '../page'
import siteContent from '@/config/site-content.json'
import { cn } from '@/lib/utils'
import { useSize } from '@/hooks/use-size'

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

interface RandomLayoutProps {
	pictures: Picture[] // 图片数据数组
	isEditMode?: boolean // 是否为编辑模式，用于显示删除按钮
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void // 单张删除回调
	onDeleteGroup?: (picture: Picture) => void // 整组删除回调
}

// 计算好的位置信息
type PositionedItem = {
	x: number
	y: number
	rotation: number // 旋转角度（度）
}

// 图片原始尺寸
type OriginalSize = {
	width: number
	height: number
}

// 单个浮动图片组件的属性
interface FloatingImageProps {
	url: string
	index: number // 全局序号
	groupIndex: number // 所属组序号
	position: PositionedItem
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single' // 组内序号，单图时为 'single'
	isEditMode?: boolean
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void
	onDeleteGroup?: () => void
}

// 扁平化后的 URL 条目
type UrlItem = {
	url: string
	groupIndex: number
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single'
}

// ----------------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------------

/**
 * 将多组图片数据扁平化为单一的 UrlItem 列表。
 * 每个 Picture 可能包含单张 image，也可能包含多张 images。
 * 如果是单张，imageIndex 标记为 'single'；多张则按数组下标记录。
 */
const buildUrlList = (pictures: Picture[]): UrlItem[] => {
	const result: UrlItem[] = []

	for (const [index, picture] of pictures.entries()) {
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

// 全局 z-index 计数器，用于控制图片的层叠顺序（新点击的图片置于顶层）
let lastZIndex = 10
const TOP_Z_INDEX = 9999 // 全屏查看时的最高层级

/**
 * 格式化上传时间为 "YYYY-MM-DD HH:mm" 格式。
 */
const formatUploadedAt = (uploadedAt?: string) => {
	if (!uploadedAt) return ''
	const date = new Date(uploadedAt)
	if (Number.isNaN(date.getTime())) return uploadedAt

	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')

	return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 从 localStorage 读取已保存的拖拽偏移量，
 * 使用图片 url 作为键名，以实现拖拽位置持久化。
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
 * 将拖拽偏移量保存到 localStorage。
 */
const saveOffset = (url: string, offset: { x: number; y: number }) => {
	try {
		localStorage.setItem(`picture-offset-${url}`, JSON.stringify(offset))
	} catch (error) {
		console.error('Failed to save offset:', error)
	}
}

// ----------------------------------------------------------------------
// 单个浮动图片组件
// ----------------------------------------------------------------------

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
	// 获取屏幕中心坐标（来自全局状态）
	const { centerX, centerY } = useCenterStore()
	// maxSM 用于判断是否为小屏设备；init 用来触发尺寸计算
	const { maxSM, init } = useSize()
	const bodyRef = useRef(document.body) // 拖拽约束容器
	const mouseDownTimeRef = useRef<number | null>(null) // 用于区分点击与拖拽
	const [zIndex, setZIndex] = useState(index) // 当前图片的层级
	const [show, setShow] = useState(false) // 控制渐入动画的触发
	const [dragOffset, setDragOffset] = useState(() => loadSavedOffset(url)) // 拖拽偏移量，初始从 localStorage 恢复

	// 延迟依次出现，形成交错动画效果
	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 200 * index)
	}, [])

	// 存储图片加载后的原始尺寸
	const [originalSize, setOriginalSize] = useState<OriginalSize | null>(null)

	/**
	 * 计算在缩略状态下的显示尺寸。
	 * 宽高比被限制在 [2/3, 3/2] 之间，基准宽度为 200px，
	 * 确保各种比例的图片都能较好地展示。
	 */
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

	/**
	 * 计算全屏查看时的显示尺寸。
	 * 以原始尺寸为基准，根据视口大小等比缩放，确保不超出屏幕且留有内边距。
	 * 同时限制最大放大倍数为 1（即不放大超过原始尺寸）。
	 */
	const zoomedSize = useMemo(() => {
		if (!originalSize) {
			return { width: 200, height: 200 }
		}

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

	// 是否处于全屏缩放查看状态
	const [isZoomed, setIsZoomed] = useState(false)
	// 记录拖拽开始时的偏移量，用于正确计算最终位置
	const dragStartOffsetRef = useRef({ x: 0, y: 0 })

	// 如果尚未加载或位置计算未完成，不渲染
	if (!position || !show) return null

	return (
		<>
			{/* 全屏模式下的半透明遮罩层，点击可退出全屏 */}
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
			<motion.div
				drag={!isZoomed} // 仅在非全屏模式允许拖拽
				dragConstraints={bodyRef} // 拖拽范围限制在 body 内
				dragMomentum={false} // 禁用惯性，以便精确定位
				onDragStart={() => {
					if (!isZoomed) {
						// 记录拖拽开始时的偏移，用于后续计算新偏移
						dragStartOffsetRef.current = { ...dragOffset }
					}
				}}
				onMouseDown={event => {
					// 提升当前图片到最高层级
					lastZIndex = lastZIndex + 1
					setZIndex(lastZIndex)
					mouseDownTimeRef.current = event.timeStamp
				}}
				onMouseUp={event => {
					if (mouseDownTimeRef.current !== null) {
						const duration = event.timeStamp - mouseDownTimeRef.current
						// 按下时长 <= 150ms 视为点击，切换全屏/缩略状态
						if (duration <= 150) {
							if (!isZoomed) {
								setIsZoomed(true)
							} else if (maxSM) {
								// 小屏设备点击已放大的图片可退出全屏
								setIsZoomed(false)
							}
						}
					}
					mouseDownTimeRef.current = null
				}}
				onDragEnd={(_, info) => {
					if (!isZoomed) {
						// 计算新的偏移量并保存
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
					left: centerX + position.x, // 以屏幕中心为基准定位
					top: centerY + position.y,
					rotate: position.rotation,
					scale: 0.6,
					opacity: 0,
					x: dragOffset.x, // 初始拖拽偏移
					y: dragOffset.y
				}}
				animate={
					isZoomed
						? {
								// 全屏状态：居中、无旋转、放大至适应屏幕、取消拖拽偏移
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
								// 缩略状态：恢复原始布局与拖拽偏移
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
					!isEditMode && !isZoomed && 'hover:scale-105' // 非编辑非全屏时 hover 微放大
				)}>
				{/* 图片本身 */}
				<motion.img
					src={url}
					onLoad={event => {
						const img = event.currentTarget
						// 获取图片原始尺寸
						setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight })
					}}
					draggable={false}
					className={cn('h-full w-full object-cover select-none')}
				/>
				{/* 编辑模式下的删除按钮 */}
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

			{/* 全屏模式下的描述信息浮层，可拖拽 */}
			{isZoomed && description && (
				<motion.div
					drag
					dragConstraints={maxSM ? undefined : bodyRef}
					dragMomentum={false}
					className='fixed min-h-[150px] w-[200px] cursor-pointer p-6 shadow'
					style={{
						// 背景颜色根据组别循环使用预定义色彩
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

// ----------------------------------------------------------------------
// 基于唯一标识生成稳定位置的算法
// 使用 Map 缓存，保证相同 url 始终获得相同的坐标，即使组件重新渲染
// ----------------------------------------------------------------------
const positionCacheRef = new Map<string, PositionedItem>()
const getStablePosition = (uniqueId: string, width: number, height: number): PositionedItem => {
	// 如果已有缓存，直接返回，保证位置不变
	if (positionCacheRef.has(uniqueId)) {
		return positionCacheRef.get(uniqueId)!
	}

	// 通过字符串哈希生成稳定的整数（32位）
	let hash = 0
	for (let i = 0; i < uniqueId.length; i++) {
		const char = uniqueId.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32bit integer
	}
	const stableIndex = Math.abs(hash) % 10000

	// 计算最大分布半径，保证图片不超出可视区域
	const maxRadius = Math.min(width, height) / 2 - 100
	// 使用黄金角度（约 137.5°）生成类似向日葵种子的螺旋分布
	const goldenAngle = Math.PI * (3 - Math.sqrt(5))

	// 将稳定索引映射到 [0,1) 区间，通过幂函数控制径向分布（越外层间距越大）
	const t = (stableIndex % 1000) / 1000
	const radius = Math.pow(t, 0.8) * maxRadius
	const angle = stableIndex * goldenAngle

	const baseX = radius * Math.cos(angle)
	const baseY = radius * Math.sin(angle)

	// 基于相同哈希生成稳定的小范围随机偏移（jitter），避免完全规则的排列
	const jitterSeed = Math.abs(hash) % 1000
	const jitterRadius = 12
	const jitterX = (jitterSeed % (jitterRadius * 2)) - jitterRadius
	const jitterY = ((jitterSeed * 7) % (jitterRadius * 2)) - jitterRadius

	// 同样基于哈希生成 -30° 到 30° 之间的稳定旋转角度
	const rotation = ((jitterSeed * 13) % 60) - 30

	const position = {
		x: baseX + jitterX,
		y: baseY + jitterY,
		rotation
	}

	positionCacheRef.set(uniqueId, position)
	return position
}

// ----------------------------------------------------------------------
// 随机布局容器组件（RandomLayout）
// 负责扁平化图片数据 -> 计算每张图的稳定位置 -> 渲染 FloatingImage 列表
// ----------------------------------------------------------------------
export const RandomLayout = ({ pictures, isEditMode = false, onDeleteSingle, onDeleteGroup }: RandomLayoutProps) => {
	// 确保屏幕中心坐标已初始化（通常在 _app 或 layout 中调用）
	useCenterInit()
	const { width, height } = useCenterStore()
	const [show, setShow] = useState(false)

	// 延迟显示，确保渐入动画在布局稳定后触发
	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 1000)
	}, [])

	// 扁平化图片列表
	const urls = useMemo(() => buildUrlList(pictures), [pictures])

	// 构建 picture id 到 Picture 对象的映射，用于整组删除等操作
	const pictureMap = useMemo(() => {
		const map = new Map<string, Picture>()
		pictures.forEach(picture => {
			map.set(picture.id, picture)
		})
		return map
	}, [pictures])

	// 缺少必要数据时不渲染
	if (!urls.length || !width || !height) {
		return null
	}

	if (!show) return null

	// 初始化全局 z-index 计数器，确保新渲染的图片层级高于上一次渲染
	lastZIndex = urls.length + 11

	return (
		<>
			{urls.map((item, index) => {
				const picture = pictureMap.get(item.pictureId)
				const uniqueId = item.url
				// 获取稳定的随机位置
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