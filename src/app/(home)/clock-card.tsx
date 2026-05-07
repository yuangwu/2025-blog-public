'use client' // 声明这是一个客户端组件，运行在浏览器端

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useLayoutEditStore } from './stores/layout-edit-store'
import { CARD_SPACING } from '@/consts'
import { HomeDraggableLayer } from './home-draggable-layer'

/**
 * 时钟卡片组件
 * 在主页上显示一个可拖动的七段数码管时钟，点击可跳转到全屏时钟页面。
 * 支持显示/隐藏秒数，并可根据配置显示圣诞装饰。
 */
export default function ClockCard() {
	const router = useRouter() // 用于页面导航
	const center = useCenterStore() // 获取布局中心的坐标，用于卡片定位
	const { cardStyles, siteContent } = useConfigStore() // 获取卡片样式和站点内容配置
	const editing = useLayoutEditStore(state => state.editing) // 是否处于布局编辑模式
	const [time, setTime] = useState(new Date()) // 当前时间状态
	const styles = cardStyles.clockCard // 时钟卡片的样式配置
	const hiCardStyles = cardStyles.hiCard // Hi卡片的样式，用于计算偏移量
	const showSeconds = siteContent.clockShowSeconds ?? false // 是否显示秒数

	// 定时更新当前时间，根据是否显示秒数决定更新频率
	useEffect(() => {
		const interval = showSeconds ? 1000 : 5000 // 显示秒时每秒更新，否则每5秒更新
		const timer = setInterval(() => {
			setTime(new Date())
		}, interval)

		return () => clearInterval(timer) // 清理定时器
	}, [showSeconds])

	// 格式化时、分、秒，确保两位数显示
	const hours = time.getHours().toString().padStart(2, '0')
	const minutes = time.getMinutes().toString().padStart(2, '0')
	const seconds = time.getSeconds().toString().padStart(2, '0')

	// 计算卡片的 x 坐标：若样式中有自定义偏移则使用，否则根据中心点及Hi卡片宽度计算默认位置
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2
	// 计算卡片的 y 坐标：若样式中有自定义偏移则使用，否则根据中心点、卡片偏移量和高度计算默认位置
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.offset - styles.height

	return (
		// 外层可拖动的图层，提供拖拽和定位能力
		<HomeDraggableLayer cardKey='clockCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 基础卡片容器，应用层叠顺序和尺寸 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='p-2'>
				{/* 如果启用了圣诞模式，显示圣诞装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-5.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 60, left: 2, bottom: 2, opacity: 0.6 }}
						/>
						<img
							src='/images/christmas/snow-6.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 80, right: -4, top: -10, opacity: 0.6 }}
						/>
					</>
				)}
				{/* 时钟显示区域，点击进入全屏时钟（编辑模式下不跳转） */}
				<div
					onClick={() => {
						if (!editing) {
							router.push('/clock')
						}
					}}
					className='bg-secondary/20 card-rounded flex h-full w-full cursor-pointer items-center justify-center gap-1.5 p-2'
				>
					{/* 七段数码管显示小时十位 */}
					<SevenSegmentDigit value={parseInt(hours[0])} />
					{/* 七段数码管显示小时个位 */}
					<SevenSegmentDigit value={parseInt(hours[1])} />
					{/* 冒号分隔符 */}
					<Colon />
					{/* 分钟十位 */}
					<SevenSegmentDigit value={parseInt(minutes[0])} />
					{/* 分钟个位 */}
					<SevenSegmentDigit value={parseInt(minutes[1])} />
					{/* 如果显示秒数，则追加秒数部分 */}
					{showSeconds && (
						<>
							<Colon />
							<SevenSegmentDigit value={parseInt(seconds[0])} />
							<SevenSegmentDigit value={parseInt(seconds[1])} />
						</>
					)}
				</div>
			</Card>
		</HomeDraggableLayer>
	)
}

// 七段数码管数字组件的属性接口
interface SevenSegmentDigitProps {
	value: number // 要显示的数字 (0-9)
	className?: string // 可选的外部样式类名
}

/**
 * 七段数码管数字组件
 * 用 SVG 模拟七段数码管，根据传入的数字点亮对应的段。
 */
function SevenSegmentDigit({ value, className }: SevenSegmentDigitProps) {
	// 数字0-9对应的七段亮灭状态 (A,B,C,D,E,F,G)
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

	// 获取当前数字对应的段状态，默认显示0
	const segments = segmentMap[value as keyof typeof segmentMap] || segmentMap[0]
	const activeColor = 'var(--color-primary)' // 激活段的颜色
	const inactiveColor = 'rgba(0, 0, 0, 0.05)' // 未激活段的颜色（半透明）

	return (
		<svg width='29' height='52' viewBox='0 0 29 52' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
			{/* A段（顶部横段） */}
			<path
				d='M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z'
				fill={segments[0] ? activeColor : inactiveColor}
			/>
			{/* G段（中间横段） */}
			<path
				d='M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z'
				fill={segments[6] ? activeColor : inactiveColor}
			/>
			{/* F段（左上竖段） */}
			<path
				d='M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z'
				fill={segments[5] ? activeColor : inactiveColor}
			/>
			{/* B段（右上竖段） */}
			<path
				d='M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z'
				fill={segments[1] ? activeColor : inactiveColor}
			/>
			{/* D段（底部横段） */}
			<path
				d='M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z'
				fill={segments[3] ? activeColor : inactiveColor}
			/>
			{/* C段（右下竖段） */}
			<path
				d='M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z'
				fill={segments[2] ? activeColor : inactiveColor}
			/>
			{/* E段（左下竖段） */}
			<path
				d='M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z'
				fill={segments[4] ? activeColor : inactiveColor}
			/>
		</svg>
	)
}

/**
 * 冒号分隔符组件
 * 显示两个上下排列的小圆点，用于模拟数码时钟的时、分、秒分隔符。
 */
function Colon({ className }: { className?: string }) {
	return (
		<div className={`flex flex-col justify-center gap-2 ${className}`}>
			<div className='bg-primary h-1.5 w-1.5' />
			<div className='bg-primary h-1.5 w-1.5' />
		</div>
	)
}