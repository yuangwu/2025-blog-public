'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// 定时器模式：秒表或倒计时
type TimerMode = 'stopwatch' | 'timer'

export default function ClockPage() {
	// 当前模式：秒表/计时器
	const [mode, setMode] = useState<TimerMode>('stopwatch')
	// 秒表时间（毫秒）
	const [stopwatchTime, setStopwatchTime] = useState(0)
	// 倒计时时间（毫秒）
	const [timerTime, setTimerTime] = useState(0)
	// 倒计时输入：时、分、秒
	const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 })
	// 是否正在运行
	const [isRunning, setIsRunning] = useState(false)
	// 秒表计次记录
	const [laps, setLaps] = useState<number[]>([])

	// requestAnimationFrame 的 ID，用于取消循环
	const intervalRef = useRef<number | null>(null)
	// 动画循环的起始时间戳（performance.now 的基准）
	const startTimeRef = useRef<number | null>(null)
	// 暂停时已累积的时间（仅秒表模式用于恢复计算）
	const pausedTimeRef = useRef<number>(0)
	// 倒计时开始时设定的总时间（用于计算剩余时间）
	const initialTimerTimeRef = useRef<number>(0)
	// 与状态同步的 ref，避免闭包问题
	const stopwatchTimeRef = useRef<number>(0)
	const timerTimeRef = useRef<number>(0)

	// 同步 ref 与 state，确保 useEffect 内部始终获取最新时间
	stopwatchTimeRef.current = stopwatchTime
	timerTimeRef.current = timerTime

	useEffect(() => {
		if (isRunning) {
			const now = performance.now()
			if (startTimeRef.current === null) {
				// 第一次启动计时
				startTimeRef.current = now
				if (mode === 'timer') {
					// 记录倒计时初始值
					initialTimerTimeRef.current = timerTimeRef.current
				}
			} else {
				// 从暂停恢复
				if (mode === 'stopwatch') {
					// 秒表：用当前时间减去暂停时已累积的时间，作为新的基准
					startTimeRef.current = now - pausedTimeRef.current
				} else {
					// 倒计时：调整基准，使剩余时间连续
					startTimeRef.current = now - (initialTimerTimeRef.current - timerTimeRef.current)
				}
			}

			// 动画循环更新函数
			const updateTime = () => {
				const currentTime = performance.now()
				const elapsed = currentTime - startTimeRef.current!

				if (mode === 'stopwatch') {
					setStopwatchTime(Math.floor(elapsed))
				} else {
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

				// 请求下一帧
				intervalRef.current = requestAnimationFrame(updateTime)
			}

			intervalRef.current = requestAnimationFrame(updateTime)
		} else {
			// 停止或暂停时取消动画帧
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
				intervalRef.current = null
			}
			// 记录暂停时的累积时间（秒表模式）
			if (startTimeRef.current !== null) {
				if (mode === 'stopwatch') {
					pausedTimeRef.current = stopwatchTimeRef.current
				}
			}
		}

		// 清理：组件卸载时取消动画帧
		return () => {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
			}
		}
	}, [isRunning, mode])

	// 开始/暂停按钮处理
	const handleStartPause = () => {
		if (mode === 'timer' && timerTime === 0) {
			// 倒计时模式下首次启动，根据输入计算总毫秒数
			const totalMs = timerInput.hours * 3600000 + timerInput.minutes * 60000 + timerInput.seconds * 1000
			if (totalMs <= 0) return
			setTimerTime(totalMs)
			initialTimerTimeRef.current = totalMs
		}
		if (!isRunning) {
			// 当从暂停或停止状态启动时，清除基准使 useEffect 重新初始化
			startTimeRef.current = null
		}
		setIsRunning(prev => !prev)
	}

	// 重置按钮处理
	const handleReset = () => {
		setIsRunning(false)
		startTimeRef.current = null
		pausedTimeRef.current = 0
		initialTimerTimeRef.current = 0
		if (mode === 'stopwatch') {
			setStopwatchTime(0)
			setLaps([])
		} else {
			setTimerTime(0)
			setTimerInput({ hours: 0, minutes: 0, seconds: 0 })
		}
	}

	// 秒表计次
	const handleLap = () => {
		if (mode === 'stopwatch' && isRunning) {
			setLaps(prev => [stopwatchTime, ...prev])
		}
	}

	// 格式化毫秒为时间字符串（hh:mm:ss.cs）
	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		const milliseconds = Math.floor((ms % 1000) / 10)

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
	}

	// 根据模式选择当前显示的时间
	const displayTime = mode === 'stopwatch' ? stopwatchTime : timerTime
	// 是否可以开始计时（倒计时需有输入 > 0 或已有时间）
	const canStart = mode === 'timer' ? timerTime > 0 || timerInput.hours > 0 || timerInput.minutes > 0 || timerInput.seconds > 0 : true

	return (
		<div className='flex flex-col items-center px-6 pt-32 pb-12'>
			<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='w-full max-w-[600px] space-y-8'>
				{/* 模式切换 */}
				<div className='card relative flex gap-4 rounded-xl p-2'>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
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
						)}>
						秒表
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
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
						)}>
						计时器
					</motion.button>
				</div>

				{/* 时间显示区域 */}
				<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-4'>
					<div className='bg-secondary/20 flex items-center justify-center rounded-4xl p-8'>
						<TimeDisplay time={displayTime} key={mode} />
					</div>
				</motion.div>

				{/* 倒计时输入（仅在倒计时模式且未运行时显示） */}
				{mode === 'timer' && !isRunning && timerTime === 0 && (
					<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative space-y-4'>
						<div className='flex items-center justify-center gap-4'>
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>时</label>
								<input
									type='number'
									min='0'
									max='23'
									value={timerInput.hours}
									onChange={e => setTimerInput({ ...timerInput, hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
							<div className='text-secondary mt-8 text-2xl font-bold'>:</div>
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>分</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.minutes}
									onChange={e => setTimerInput({ ...timerInput, minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
							<div className='text-secondary mt-8 text-2xl font-bold'>:</div>
							<div className='flex flex-col items-center gap-2'>
								<label className='text-secondary text-xs'>秒</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.seconds}
									onChange={e => setTimerInput({ ...timerInput, seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
									className='no-spinner w-20 rounded-xl border bg-white/60 px-4 py-3 text-center text-2xl font-bold backdrop-blur-sm focus:bg-white/80'
								/>
							</div>
						</div>
					</motion.div>
				)}

				{/* 控制按钮区域 */}
				<div className='flex items-center justify-center gap-4'>
					{mode === 'stopwatch' && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleLap}
							disabled={!isRunning}
							className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50'>
							计次
						</motion.button>
					)}
					{/* 开始 / 暂停 */}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleStartPause}
						disabled={!canStart}
						className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
							isRunning ? 'bg-brand-secondary hover:bg-brand-secondary/80' : 'bg-brand hover:bg-brand/80'
						}`}>
						{isRunning ? <Pause className='h-8 w-8' /> : <Play className='h-8 w-8' />}
					</motion.button>
					{/* 重置 */}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleReset}
						disabled={isRunning && mode === 'stopwatch'}
						className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50'>
						<RotateCcw className='h-5 w-5' />
					</motion.button>
				</div>

				{/* 秒表计次记录 */}
				{mode === 'stopwatch' && laps.length > 0 && (
					<div className='grid grid-cols-3 gap-3'>
						{laps.map((lap, index) => (
							<motion.div
								layout
								initial={{ opacity: 0, scale: 0.6 }}
								animate={{ opacity: 1, scale: 1 }}
								key={lap}
								className='bg-card flex items-center justify-center rounded-2xl px-6 py-4'>
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

interface TimeDisplayProps {
	time: number // 毫秒数
}

// 七段数码管风格的时间显示组件
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
			{/* 小时数大于 0 时才显示 */}
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
			{/* 百分秒（十毫秒） */}
			<SevenSegmentDigit value={parseInt(millisecondsStr[0])} />
			<SevenSegmentDigit value={parseInt(millisecondsStr[1])} />
		</div>
	)
}

interface SevenSegmentDigitProps {
	value: number // 要显示的数字 0-9
	className?: string
}

// 单个七段数码管数字组件
function SevenSegmentDigit({ value, className }: SevenSegmentDigitProps) {
	// 0-9 各个数字对应的 7 段亮灭状态（顺序：A, B, C, D, E, F, G）
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
		9: [true, true, true, true, false, true, true]
	}

	const segments = segmentMap[value as keyof typeof segmentMap] || segmentMap[0]
	// 亮段颜色使用主题色，暗段使用浅灰色
	const activeColor = 'var(--color-primary)'
	const inactiveColor = 'rgba(0, 0, 0, 0.05)'

	return (
		<svg width='29' height='52' viewBox='0 0 29 52' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
			{/* 段 A（顶部水平段） */}
			<path
				d='M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z'
				fill={segments[0] ? activeColor : inactiveColor}
			/>
			{/* 段 G（中间水平段） */}
			<path
				d='M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z'
				fill={segments[6] ? activeColor : inactiveColor}
			/>
			{/* 段 F（左上垂直段） */}
			<path
				d='M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z'
				fill={segments[5] ? activeColor : inactiveColor}
			/>
			{/* 段 B（右上垂直段） */}
			<path
				d='M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z'
				fill={segments[1] ? activeColor : inactiveColor}
			/>
			{/* 段 D（底部水平段） */}
			<path
				d='M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z'
				fill={segments[3] ? activeColor : inactiveColor}
			/>
			{/* 段 C（右下垂直段） */}
			<path
				d='M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z'
				fill={segments[2] ? activeColor : inactiveColor}
			/>
			{/* 段 E（左下垂直段） */}
			<path
				d='M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z'
				fill={segments[4] ? activeColor : inactiveColor}
			/>
		</svg>
	)
}

// 数码管之间的冒号分隔符
function Colon({ className }: { className?: string }) {
	return (
		<div className={`flex flex-col justify-center gap-2 ${className}`}>
			<div className='bg-primary h-1.5 w-1.5' />
			<div className='bg-primary h-1.5 w-1.5' />
		</div>
	)
}