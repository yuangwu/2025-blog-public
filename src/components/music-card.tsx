'use client' // 标记为客户端组件，启用浏览器 API（如 Audio）

import { useState, useRef, useEffect, useMemo } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center' // 获取视口中心坐标
import { useConfigStore } from '../app/(home)/stores/config-store' // 全局配置与卡片样式
import { CARD_SPACING } from '@/consts' // 卡片间距常量
import MusicSVG from '@/svgs/music.svg' // 音乐图标
import PlaySVG from '@/svgs/play.svg' // 播放图标
import { HomeDraggableLayer } from '../app/(home)/home-draggable-layer' // 主页可拖拽容器
import { Pause } from 'lucide-react' // 暂停图标
import { usePathname } from 'next/navigation' // 获取当前路由路径
import clsx from 'clsx' // 条件组合 CSS 类名

const MUSIC_FILES = ['/music/close-to-you.mp3'] // 音乐文件列表

export default function MusicCard() {
	const pathname = usePathname()
	const center = useCenterStore() // 视口中心数据
	const { cardStyles, siteContent } = useConfigStore() // 卡片样式与站点配置
	// 解构所需卡片的样式信息
	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard

	// 播放状态
	const [isPlaying, setIsPlaying] = useState(false)
	// 当前播放索引（预留多曲目支持）
	const [currentIndex, setCurrentIndex] = useState(0)
	// 播放进度百分比 (0-100)
	const [progress, setProgress] = useState(0)
	// 音频元素引用
	const audioRef = useRef<HTMLAudioElement | null>(null)
	// 用于在事件回调中保持最新索引
	const currentIndexRef = useRef(0)

	// 是否在主页路由
	const isHomePage = pathname === '/'

	/**
	 * 计算卡片坐标：
	 * - 非主页、且正在播放：固定右下角
	 * - 主页：基于 center 和其他卡片样式的偏移动态计算
	 */
	const position = useMemo(() => {
		// 非主页且播放时，始终固定在右下角
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		// 主页默认位置计算（依赖多个卡片样式）
		return {
			x: styles.offsetX !== null
				? center.x + styles.offsetX
				: center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset,
			y: styles.offsetY !== null
				? center.y + styles.offsetY
				: center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING
		}
	}, [isPlaying, isHomePage, center, styles, hiCardStyles, clockCardStyles, calendarCardStyles])

	const { x, y } = position

	// 初始化音频元素并绑定事件
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}

		const audio = audioRef.current

		// 更新进度百分比
		const updateProgress = () => {
			if (audio.duration) {
				setProgress((audio.currentTime / audio.duration) * 100)
			}
		}

		// 曲目结束切换到下一首（列表循环）
		const handleEnded = () => {
			const nextIndex = (currentIndexRef.current + 1) % MUSIC_FILES.length
			currentIndexRef.current = nextIndex
			setCurrentIndex(nextIndex)
			setProgress(0)
		}

		// 拖动进度条时跟随更新
		const handleTimeUpdate = () => {
			updateProgress()
		}

		// 元数据加载完成立即更新进度（防止首次为NaN）
		const handleLoadedMetadata = () => {
			updateProgress()
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
		}
	}, [])

	// 监听 currentIndex 变更，加载新音频源并保持播放状态
	useEffect(() => {
		currentIndexRef.current = currentIndex
		if (audioRef.current) {
			const wasPlaying = !audioRef.current.paused
			audioRef.current.pause()
			audioRef.current.src = MUSIC_FILES[currentIndex]
			audioRef.current.loop = false
			setProgress(0)

			// 若之前正在播放，自动继续
			if (wasPlaying) {
				audioRef.current.play().catch(console.error)
			}
		}
	}, [currentIndex])

	// 监听播放/暂停状态切换
	useEffect(() => {
		if (!audioRef.current) return

		if (isPlaying) {
			audioRef.current.play().catch(console.error)
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying])

	// 组件卸载时停止并清空音频源
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current.src = ''
			}
		}
	}, [])

	// 切换播放/暂停
	const togglePlayPause = () => {
		setIsPlaying(!isPlaying)
	}

	// 非主页且未播放时隐藏整个组件
	if (!isHomePage && !isPlaying) {
		return null
	}

	return (
		<HomeDraggableLayer
			cardKey='musicCard'
			x={x}
			y={y}
			width={styles.width}
			height={styles.height}
		>
			<Card
				order={styles.order}
				width={styles.width}
				height={styles.height}
				x={x}
				y={y}
				className={clsx('flex items-center gap-3', !isHomePage && 'fixed')}
			>
				{/* 圣诞装饰（由后台配置控制是否显示） */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-10.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
						/>
						<img
							src='/images/christmas/snow-11.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				{/* 音乐图标 */}
				<MusicSVG className='h-8 w-8' />

				{/* 音乐标题与进度条 */}
				<div className='flex-1'>
					<div className='text-secondary text-sm'>Close To You</div>

					<div className='mt-1 h-2 rounded-full bg-white/60'>
						<div
							className='bg-linear h-full rounded-full transition-all duration-300'
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				{/* 播放/暂停按钮 */}
				<button
					onClick={togglePlayPause}
					className='flex h-10 w-10 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'
				>
					{isPlaying ? (
						<Pause className='text-brand h-4 w-4' />
					) : (
						<PlaySVG className='text-brand ml-1 h-4 w-4' />
					)}
				</button>
			</Card>
		</HomeDraggableLayer>
	)
}