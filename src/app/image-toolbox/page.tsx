'use client' // 标记为客户端组件，因为使用了状态、事件和浏览器API

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// 计时模式：秒表(stopwatch) 或 倒计时(timer)
type TimerMode = 'stopwatch' | 'timer'

// 时钟页面主组件
export default function ClockPage() {
	// 当前计时模式
	const [mode, setMode] = useState<TimerMode>('stopwatch')
	// 秒表已经累计的毫秒数
	const [stopwatchTime, setStopwatchTime] = useState(0)
	// 倒计时剩余的毫秒数
	const [timerTime, setTimerTime] = useState(0)
	// 倒计时设置的时、分、秒
	const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 })
	// 是否正在计时
	const [isRunning, setIsRunning] = useState(false)
	// 秒表计次记录数组
	const [laps, setLaps] = useState<number[]>([])
	// 保存 requestAnimationFrame 返回的 id
	const intervalRef = useRef<number | null>(null)
	// 记录计时开始的 performance.now() 时间戳（用于计算已经过的时间）
	const startTimeRef = useRef<number | null>(null)
	// 暂停时保存已经过的时间（秒表用）
	const pausedTimeRef = useRef<number>(0)
	// 倒计时初始设置的总毫秒数
	const initialTimerTimeRef = useRef<number>(0)
	// ref 同步最新的秒表毫秒数（避免闭包旧值问题）
	const stopwatchTimeRef = useRef<number>(0)
	// ref 同步最新的倒计时毫秒数
	const timerTimeRef = useRef<number>(0)

	// 同步 refs 与 state，确保在动画帧回调中拿到最新值
	stopwatchTimeRef.current = stopwatchTime
	timerTimeRef.current = timerTime

	// 根据 isRunning 和 mode 的变化启动/停止计时
	useEffect(() => {
		if (isRunning) {
			const now = performance.now() // 当前高精度时间戳
			if (startTimeRef.current === null) {
				// 首次开始计时
				startTimeRef.current = now
				if (mode === 'timer') {
					// 倒计时模式记录初始值
					initialTimerTimeRef.current = timerTimeRef.current
				}
			} else {
				// 从暂停中恢复计时
				if (mode === 'stopwatch') {
					// 秒表：新的起点 = 当前时间 - 已暂停时间
					startTimeRef.current = now - pausedTimeRef.current
				} else {
					// 倒计时：起点 = 当前时间 - (初始时长 - 剩余时长)
					startTimeRef.current = now - (initialTimerTimeRef.current - timerTimeRef.current)
				}
			}

			// 用 requestAnimationFrame 不断更新显示时间
			const updateTime = () => {
				const currentTime = performance.now()
				const elapsed = currentTime - startTimeRef.current! // 已经过的时间

				if (mode === 'stopwatch') {
					// 秒表模式：设置累计时间
					setStopwatchTime(Math.floor(elapsed))
				} else {
					// 倒计时模式：计算剩余时间
					const remaining = initialTimerTimeRef.current - elapsed
					if (remaining <= 0) {
						// 倒计时结束
						setTimerTime(0)
						setIsRunning(false)
						startTimeRef.current = null
						return
					}
					setTimerTime(Math.floor(remaining))
				}

				// 继续下一帧更新
				intervalRef.current = requestAnimationFrame(updateTime)
			}

			intervalRef.current = requestAnimationFrame(updateTime)
		} else {
			// 停止状态：清除动画帧
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
				intervalRef.current = null
			}
			// 暂停时保存当前已过时间用于后续恢复
			if (startTimeRef.current !== null) {
				if (mode === 'stopwatch') {
					pausedTimeRef.current = stopwatchTimeRef.current
				}
			}
		}

		// 组件卸载或依赖变化时清理动画帧
		return () => {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
			}
		}
	}, [isRunning, mode])

	// 开始/暂停按钮
	const handleStartPause = () => {
		// 倒计时模式下如果当前时间为0，则根据输入设置初始倒计时
		if (mode === 'timer' && timerTime === 0) {
			const totalMs = timerInput.hours * 3600000 + timerInput.minutes * 60000 + timerInput.seconds * 1000
			if (totalMs <= 0) return // 未设置有效时间，不启动
			setTimerTime(totalMs)
			initialTimerTimeRef.current = totalMs
		}
		if (!isRunning) {
			// 从停止到运行，将起点标记为未设置，让 effect 重新计算
			startTimeRef.current = null
		}
		// 切换运行状态
		setIsRunning(prev => !prev)
	}

	// 重置按钮
	const handleReset = () => {
		setIsRunning(false)
		startTimeRef.current = null
		pausedTimeRef.current = 0
		initialTimerTimeRef.current = 0
		if (mode === 'stopwatch') {
			setStopwatchTime(0)
			setLaps([]) // 清除计次
		} else {
			setTimerTime(0)
			setTimerInput({ hours: 0, minutes: 0, seconds: 0 })
		}
	}

	// 秒表计次按钮（只在秒表运行时可用）
	const handleLap = () => {
		if (mode === 'stopwatch' && isRunning) {
			setLaps(prev => [stopwatchTime, ...prev]) // 新计次记录插在最前面
		}
	}

	// 将毫秒格式化为 HH:MM:SS.ms 或 MM:SS.ms
	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		const milliseconds = Math.floor((ms % 1000) / 10) // 取百分秒（10ms级）

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
	}

	// 当前显示的时间（根据模式切换）
	const displayTime = mode === 'stopwatch' ? stopwatchTime : timerTime
	// 是否允许开始（倒计时需设置有效时间）
	const canStart = mode === 'timer' ? timerTime > 0 || timerInput.hours > 0 || timerInput.minutes > 0 || timerInput.seconds > 0 : true

	return (
		<div className='flex flex-col items-center px-6 pt-32 pb-12'>
			{/* 整体容器 - 带淡入放大动画 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className='w-full max-w-[600px] space-y-8'
			>
				{/* 模式切换 */}
				<div className='card relative flex gap-4 rounded-xl p-2'>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							// 切换到秒表时重置倒计时相关状态
							setMode('stopwatch')
							setIsRunning(false)
							setTimerTime(0)
							setTimerInput({ hours: 0, minutes: 0, seconds: 0 })
							startTimeRef.current = null
							pausedTimeRef.current = 0
							initialTimerTimeRef.current = 0
						}}
						className={cn(
							`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all`,
							mode === 'stopwatch' ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand'
						)}
					>
						秒表
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							// 切换到倒计时时重置秒表相关状态
							setMode('timer')
							setIsRunning(false)
							setStopwatchTime(0)
							setLaps([])
							startTimeRef.current = null
							pausedTimeRef.current = 0
							initialTimerTimeRef.current = 0
						}}
						className={cn(
							`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all`,
							mode === 'timer' ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand'
						)}
					>
						计时器
					</motion.button>
				</div>

				{/* 时间显示区域 */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className='card relative p-4'
				>
					<div className='bg-secondary/20 flex items-center justify-center rounded-4xl p-8'>
						{/* 使用 key 强制在模式切换时重新渲染七段数码管 */}
						<TimeDisplay time={displayTime} key={mode} />
					</div>
				</motion.div>

				{/* 倒计时时间设置（仅在倒计时模式、未运行且时间为0时显示） */}
				{mode === 'timer' && !isRunning && timerTime === 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						className='card relative space-y-4'
					>
						<div className='flex items-center justify-center gap-4'>
							{/* 小时输入 */}
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>时</label>
								<input
									type='number'
									min='0'
									max='23'
									value={timerInput.hours}
									onChange={e =>
										setTimerInput({
											...timerInput,
											hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)),
										})
									}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
							<div className='text-secondary mt-8 text-2xl font-bold'>:</div>
							{/* 分钟输入 */}
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>分</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.minutes}
									onChange={e =>
										setTimerInput({
											...timerInput,
											minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
										})
									}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
							<div className='text-secondary mt-8 text-2xl font-bold'>:</div>
							{/* 秒输入 */}
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>秒</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.seconds}
									onChange={e =>
										setTimerInput({
											...timerInput,
											seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
										})
									}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
						</div>
					</motion.div>
				)}

				{/* 控制按钮区 */}
				<div className='flex items-center justify-center gap-4'>
					{/* 秒表计次按钮 （仅秒表模式可见） */}
					{mode === 'stopwatch' && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleLap}
							disabled={!isRunning} // 未运行时禁用
							className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50'
						>
							计次
						</motion.button>
					)}
					{/* 开始/暂停按钮 */}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleStartPause}
						disabled={!canStart} // 倒计时未设置时禁用
						className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
							isRunning ? 'bg-brand-secondary hover:bg-brand-secondary/80' : 'bg-brand hover:bg-brand/80'
						}`}
					>
						{isRunning ? <Pause className='h-8 w-8' /> : <Play className='h-8 w-8' />}
					</motion.button>
					{/* 重置按钮，秒表运行时有些场景需禁用以防止异常 */}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleReset}
						disabled={isRunning && mode === 'stopwatch'}
						className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50'
					>
						<RotateCcw className='h-5 w-5' />
					</motion.button>
				</div>

				{/* 秒表计次记录展示 */}
				{mode === 'stopwatch' && laps.length > 0 && (
					<div className='grid grid-cols-3 gap-3'>
						{laps.map((lap, index) => (
							<motion.div
								layout
								initial={{ opacity: 0, scale: 0.6 }}
								animate={{ opacity: 1, scale: 1 }}
								key={lap} // 假设同一时间不会有两笔记录，可优化的点（实际可用 index）
								className='bg-card flex items-center justify-center rounded-2xl px-6 py-4'
							>
								<span className='font-mono text-sm font-medium'>
									<span className='text-secondary'>{laps.length - index}.</span> {formatTime(lap)}
								</span>
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	)
}

// 时间显示组件 props
interface TimeDisplayProps {
	time: number // 毫秒
}

// 负责将时间拆分并用七段数码管展示
function TimeDisplay({ time }: TimeDisplayProps) {
	const totalSeconds = Math.floor(time / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const milliseconds = Math.floor((time % 1000) / 10)

	const hoursStr = hours.toString().padStart(2, '0')
	const minutesStr = minutes.toString().padStart(2, '0')
	const secondsStr = seconds.toString().padStart(2, '0')
	const millisecondsStr = milliseconds.toString().padStart(2, '0')

	return (
		<div className='flex items-center justify-center gap-1.5'>
			{/* 只有小时不为0时才显示小时字段 */}
			{hours > 0 && (
				<>
					<SevenSegmentDigit value={parseInt(hoursStr[0])} />
					<SevenSegmentDigit value={parseInt(hoursStr[1])} />
					<Colon />
				</>
			)}
			<SevenSegmentDigit value={parseInt(minutesStr[0])} />
			<SevenSegmentDigit value={parseInt(minutesStr[1])} />
			<Colon />
			<SevenSegmentDigit value={parseInt(secondsStr[0])} />
			<SevenSegmentDigit value={parseInt(secondsStr[1])} />
			<Colon />
			<SevenSegmentDigit value={parseInt(millisecondsStr[0])} />
			<SevenSegmentDigit value={parseInt(millisecondsStr[1])} />
		</div>
	)
}

// 七段数码管单个数字的 props
interface SevenSegmentDigitProps {
	value: number // 0-9
	className?: string
}

// 七段数码管组件，通过 SVG 绘制七个段
function SevenSegmentDigit({ value, className }: SevenSegmentDigitProps) {
	// 数字对应七段亮灭映射（a,b,c,d,e,f,g）
	const segmentMap = {
		0: [true, true, true, true, true, true, false],
		1: [false, true, true, false, false, false, false],
		2: [true, true, false, true, true, false, true],
		3: [true, true, true, true, false, false, true],
		4: [false, true, true, false, false, true, true],
		5: [true, false, true, true, false, true, true],
		6: [true, false, true, true, true, true, true],
		7: [true, true, true, false, false, false, false],
		8: [true, true, true, true, true, true, true],
		9: [true, true, true, true, false, true, true],
	}

	const segments = segmentMap[value as keyof typeof segmentMap] || segmentMap[0]
	const activeColor = 'var(--color-primary)' // 亮色
	const inactiveColor = 'rgba(0, 0, 0, 0.05)' // 暗色

	return (
		<svg
			width='29'
			height='52'
			viewBox='0 0 29 52'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			className={className}
		>
			{/* 顶部横段 (a) */}
			<path
				d='M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z'
				fill={segments[0] ? activeColor : inactiveColor}
			/>
			{/* 中间横段 (g) */}
			<path
				d='M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z'
				fill={segments[6] ? activeColor : inactiveColor}
			/>
			{/* 左上竖段 (f) */}
			<path
				d='M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z'
				fill={segments[5] ? activeColor : inactiveColor}
			/>
			{/* 右上竖段 (b) */}
			<path
				d='M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z'
				fill={segments[1] ? activeColor : inactiveColor}
			/>
			{/* 底部横段 (d) */}
			<path
				d='M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z'
				fill={segments[3] ? activeColor : inactiveColor}
			/>
			{/* 右下竖段 (c) */}
			<path
				d='M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z'
				fill={segments[2] ? activeColor : inactiveColor}
			/>
			{/* 左下竖段 (e) */}
			<path
				d='M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z'
				fill={segments[4] ? activeColor : inactiveColor}
			/>
		</svg>
	)
}

// 冒号组件（用于分隔时、分、秒）
function Colon({ className }: { className?: string }) {
	return (
		<div className={`flex flex-col justify-center gap-2 ${className}`}>
			<div className='bg-primary h-1.5 w-1.5' /> {/* 上圆点 */}
			<div className='bg-primary h-1.5 w-1.5' /> {/* 下圆点 */}
		</div>
	)
}
