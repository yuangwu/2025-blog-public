// 从常量文件中导入动画延迟基础值（秒）
import { ANIMATION_DELAY } from '@/consts'
// 引入 framer-motion 动画组件
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
// 全局配置状态（卡片样式、站点内容等）
import { useConfigStore } from './stores/config-store'
// 获取屏幕/窗口中心坐标的自定义 hook
import { useCenterStore } from '@/hooks/use-center'
// 响应式断点判断 hook（这里用来判断是否为小屏设备）
import { useSize } from '@/hooks/use-size'
// 可拖拽的容器组件，用于包裹帽子卡片
import { HomeDraggableLayer } from './home-draggable-layer'

export default function HatCard() {
	// 获取窗口中心点坐标
	const center = useCenterStore()
	// 从全局配置中取出卡片样式和站点内容数据
	const { cardStyles, siteContent } = useConfigStore()
	// maxSM 为 true 表示当前视口宽度小于 sm 断点（一般认为是移动端）
	const { maxSM } = useSize()
	// 取帽子卡片的专属样式配置
	const styles = cardStyles.hatCard

	// 控制卡片是否显示的延迟状态
	const [show, setShow] = useState(false)
	// 点击时叠加的帽子数量，初始为 1
	const [number, setNumber] = useState(1)

	// 根据样式配置中的 order 延迟显示卡片，形成错峰入场动画
	useEffect(() => {
		// 延迟时间为 styles.order * ANIMATION_DELAY 秒，转换为毫秒
		const timer = setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
		// 清除定时器，防止内存泄漏
		return () => clearTimeout(timer)
	}, [styles.order])

	// 从站点内容中获取当前帽子的图片索引及是否翻转，默认值为 1 和不翻转
	const hatIndex = siteContent.currentHatIndex ?? 1
	const hatFlipped = siteContent.hatFlipped ?? false

	// 移动端视口下不渲染该卡片（直接返回 null）
	if (maxSM) return null

	// 未到显示时间时也不渲染任何内容
	if (!show) return null

	// 计算卡片的 x 坐标：
	// 如果配置了 offsetX 偏移量则使用 中心点 + 偏移量，否则默认居中（中心点 - 宽度/2）
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	// y 坐标同理，offsetY 有值时使用 中心点 + offsetY，否则默认贴底（中心点 - 高度）
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height

	return (
		// 可拖拽层：提供拖拽能力，并传入初始位置、尺寸等信息
		<HomeDraggableLayer cardKey='hatCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 动画包裹层：控制入场、悬停、点击时的缩放效果 */}
			<motion.div
				// 初始状态：透明、缩小为 0.6 倍，并设置位置与尺寸
				initial={{ opacity: 0, scale: 0.6, left: x, top: y, width: styles.width, height: styles.height }}
				// 入场动画目标：完全不透明、原始大小
				animate={{ opacity: 1, scale: 1, left: x, top: y, width: styles.width, height: styles.height }}
				// 鼠标悬停时放大至 1.05 倍
				whileHover={{ scale: 1.05 }}
				// 按下时缩小至 0.95 倍，增加点击反馈
				whileTap={{ scale: 0.95 }}
				// 每次点击帽子数量 +1，用于叠加更多帽子
				onClick={() => setNumber(number + 1)}
				className='absolute flex h-full w-full items-center justify-center'
			>
				{/* 根据 number 动态渲染多个帽子图片 */}
				{new Array(number)
					.fill(0)
					.map((_, index) =>
						// 第一张图片作为底层完全显示，后续图片叠加在上方并带有向上偏移
						index === 0 ? (
							<img
								key={index}
								// 帽子图片路径，索引来自配置
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='h-full w-full object-contain'
								// 应用翻转样式（如果需要水平镜像）
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none' }}
							/>
						) : (
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='absolute h-full w-full object-contain'
								// 叠加图片，通过 bottom 偏移产生层叠效果，每层向上 16px
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none', bottom: index * 16 }}
							/>
						)
					)}
			</motion.div>
		</HomeDraggableLayer>
	)
}
