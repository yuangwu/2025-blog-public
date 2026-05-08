import { ANIMATION_DELAY } from '@/consts'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useConfigStore } from './stores/config-store'
import { useCenterStore } from '@/hooks/use-center'
import { useSize } from '@/hooks/use-size'
import { HomeDraggableLayer } from './home-draggable-layer'

/**
 * 帽子卡片组件
 * 
 * 一个可以在主页面上拖拽的帽子装饰卡片，支持：
 * - 通过动画延迟按顺序显示
 * - 根据配置动态调整位置和尺寸
 * - 水平翻转显示
 * - 点击堆叠显示多顶帽子（用于趣味交互）
 */
export default function HatCard() {
	// 获取页面中心坐标，用于默认居中定位
	const center = useCenterStore()
	// 从全局配置中获取卡片样式和站点内容设置
	const { cardStyles, siteContent } = useConfigStore()
	// 响应式断点检测，用于在小屏幕上隐藏该卡片
	const { maxSM } = useSize()
	// 提取帽子卡片的专属样式配置
	const styles = cardStyles.hatCard

	// 控制卡片的显示/隐藏（配合入场动画）
	const [show, setShow] = useState(false)
	// 控制帽子的叠加数量（点击时递增，实现趣味堆叠效果）
	const [number, setNumber] = useState(1)

	/**
	 * 延迟显示卡片，实现按序入场动画
	 * 延迟时间 = 样式中的 order * 全局动画延迟常量（秒） * 1000 转为毫秒
	 */
	useEffect(() => {
		setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
	}, [styles.order])

	// 当前选择的帽子款式索引（1-based），未配置时默认使用第一顶
	const hatIndex = siteContent.currentHatIndex ?? 1
	// 当前帽子是否水平翻转
	const hatFlipped = siteContent.hatFlipped ?? false

	// 在小屏幕下不渲染该组件（根据设计需求隐藏）
	if (maxSM) return null

	// 未到显示时间时不渲染（配合动画延迟）
	if (!show) return null

	/**
	 * 计算卡片的最终定位
	 * 如果配置了明确的偏移量则使用 中心 + 偏移
	 * 否则默认水平居中（left = center.x - 宽度/2），垂直放置在中心点上方
	 */
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height

	return (
		// 可拖拽容器，提供拖拽功能，并约束位置和尺寸
		<HomeDraggableLayer cardKey='hatCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 动画包装元素，使用 motion 实现入场、悬停、点击动画 */}
			<motion.div
				// 初始状态：透明且缩小到 60%
				initial={{ opacity: 0, scale: 0.6, left: x, top: y, width: styles.width, height: styles.height }}
				// 动画目标状态：完全显示并恢复原始大小
				animate={{ opacity: 1, scale: 1, left: x, top: y, width: styles.width, height: styles.height }}
				// 鼠标悬停时轻微放大
				whileHover={{ scale: 1.05 }}
				// 点击时轻微缩小（按压反馈）
				whileTap={{ scale: 0.95 }}
				// 点击增加帽子数量，实现堆叠效果
				onClick={() => setNumber(number + 1)}
				// 绝对定位并居中内容
				className='absolute flex h-full w-full items-center justify-center'>
				{/* 根据当前 number 值渲染对应数量的帽子图片 */}
				{new Array(number)
					.fill(0)
					.map((_, index) =>
						// 第一顶帽子作为底层，后续帽子叠加在上方
						index === 0 ? (
							<img
								key={index}
								// 动态加载对应款式的帽子图片
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='h-full w-full object-contain'
								// 应用配置的尺寸和翻转效果
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none' }}
							/>
						) : (
							// 叠加的帽子：绝对定位，通过 bottom 属性向上偏移，制造多层堆叠的视觉效果
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='absolute h-full w-full object-contain'
								style={{
									width: styles.width,
									height: styles.height,
									transform: hatFlipped ? 'scaleX(-1)' : 'none',
									bottom: index * 16 // 每层向上偏移 16px，形成层叠感
								}}
							/>
						)
					)}
			</motion.div>
		</HomeDraggableLayer>
	)
}