'use client'

// 导入 React 相关的 hooks
import { useState, useRef, useEffect, useMemo } from 'react'
// 导入卡片组件
import Card from '@/components/card'
// 导入中心位置 store（用于获取窗口/容器尺寸及基准坐标）
import { useCenterStore } from '@/hooks/use-center'
// 导入配置 store（卡片样式、站点内容等）
import { useConfigStore } from '../app/(home)/stores/config-store'
// 导入卡片间距常量
import { CARD_SPACING } from '@/consts'
// 导入音乐图标 SVG
import MusicSVG from '@/svgs/music.svg'
// 导入播放图标 SVG
import PlaySVG from '@/svgs/play.svg'
// 导入首页可拖拽容器组件
import { HomeDraggableLayer } from '../app/(home)/home-draggable-layer'
// 导入暂停图标（来自 lucide-react 图标库）
import { Pause } from 'lucide-react'
// 获取当前路径（用于判断是否在首页）
import { usePathname } from 'next/navigation'
// 拼接 className 的工具
import clsx from 'clsx'

// 音乐文件列表（放在 public 目录下的路径）
const MUSIC_FILES = ['/music/close-to-you.mp3']

export default function MusicCard() {
	// 当前路由路径
	const pathname = usePathname()
	// 获取窗口/容器宽度、高度及中心参考坐标
	const center = useCenterStore()
	// 获取卡片样式配置和站点内容（例如是否启用圣诞主题）
	const { cardStyles, siteContent } = useConfigStore()
	// 当前音乐卡片的样式
	const styles = cardStyles.musicCard
	// 首页问候卡片的样式（用于计算相对位置）
	const hiCardStyles = cardStyles.hiCard
	// 时钟卡片的样式
	const clockCardStyles = cardStyles.clockCard
	// 日历卡片的样式
	const calendarCardStyles = cardStyles.calendarCard

	// 播放状态
	const [isPlaying, setIsPlaying] = useState(false)
	// 当前播放的音乐索引
	const [currentIndex, setCurrentIndex] = useState(0)
	// 播放进度（0-100 百分比）
	const [progress, setProgress] = useState(0)
	// 音频元素的引用（在客户端初始化）
	const audioRef = useRef<HTMLAudioElement | null>(null)
	// 为避免闭包陈旧问题，使用 ref 保存当前索引的实时值
	const currentIndexRef = useRef(0)

	// 是否为首页
	const isHomePage = pathname === '/'

	// 根据是否首页、是否播放以及各卡片样式计算卡片位置
	const position = useMemo(() => {
		// 非首页时，若正在播放，则固定在右下角
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		// 首页默认位置：基于中心坐标、偏移量和相邻卡片尺寸自动计算
		return {
			x: styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset,
			y: styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING
		}
	}, [isPlaying, isHomePage, center, styles, hiCardStyles, clockCardStyles, calendarCardStyles])

	const { x, y } = position

	// 初始化音频对象并绑定事件
	useEffect(() => {
		// 仅在客户端创建 Audio 实例
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}

		const audio = audioRef.current

		// 更新进度条的辅助函数
		const updateProgress = () => {
			if (audio.duration) {
				setProgress((audio.currentTime / audio.duration) * 100)
			}
		}

		// 当前曲目播放结束时的处理：切换到下一首
		const handleEnded = () => {
			const nextIndex = (currentIndexRef.current + 1) % MUSIC_FILES.length
			currentIndexRef.current = nextIndex
			setCurrentIndex(nextIndex)
			setProgress(0)
		}

		const handleTimeUpdate = () => {
			updateProgress()
		}

		const handleLoadedMetadata = () => {
			updateProgress()
		}

		// 绑定事件监听
		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)

		// 清理：移除所有监听
		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
		}
	}, [])

	// 当 currentIndex 变化时，切换音频源
	useEffect(() => {
		currentIndexRef.current = currentIndex
		if (audioRef.current) {
			const wasPlaying = !audioRef.current.paused
			// 暂停当前播放并更换 src
			audioRef.current.pause()
			audioRef.current.src = MUSIC_FILES[currentIndex]
			audioRef.current.loop = false
			setProgress(0)

			// 如果之前正在播放，切换后自动继续播放
			if (wasPlaying) {
				audioRef.current.play().catch(console.error)
			}
		}
	}, [currentIndex])

	// 根据 isPlaying 状态控制音频的播放与暂停
	useEffect(() => {
		if (!audioRef.current) return

		if (isPlaying) {
			audioRef.current.play().catch(console.error)
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying])

	// 组件卸载时，停止播放并清空音频源
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current.src = ''
			}
		}
	}, [])

	// 切换播放/暂停状态
	const togglePlayPause = () => {
		setIsPlaying(!isPlaying)
	}

	// 如果不是在首页，并且没有播放，则不渲染音乐卡片
	if (!isHomePage && !isPlaying) {
		return null
	}

	return (
		<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className={clsx('flex items-center gap-3', !isHomePage && 'fixed')}>
				{/* 如果启用圣诞主题，显示圣诞装饰图片 */}
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

				{/* 歌曲信息和进度条 */}
				<div className='flex-1'>
					<div className='text-secondary text-sm'>Close To You</div>

					<div className='mt-1 h-2 rounded-full bg-white/60'>
						<div className='bg-linear h-full rounded-full transition-all duration-300' style={{ width: `${progress}%` }} />
					</div>
				</div>

				{/* 播放/暂停按钮 */}
				<button onClick={togglePlayPause} className='flex h-10 w-10 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'>
					{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-1 h-4 w-4' />}
				</button>
			</Card>
		</HomeDraggableLayer>
	)
}
