// 从项目常量中导入动画延迟和卡片间距
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
// 笔的 SVG 图标组件
import PenSVG from '@/svgs/pen.svg'
// 引入 motion 动画库（来自 motion 包）
import { motion } from 'motion/react'
// React hooks
import { useEffect, useState } from 'react'
// 项目配置状态管理（zustand store）
import { useConfigStore } from './stores/config-store'
// 自定义 hook：获取屏幕中心坐标
import { useCenterStore } from '@/hooks/use-center'
// Next.js 路由
import { useRouter } from 'next/navigation'
// 响应式断点判断 hook
import { useSize } from '@/hooks/use-size'
// 点状图标 SVG 组件
import DotsSVG from '@/svgs/dots.svg'
// 可拖拽层组件，用于让按钮支持拖拽定位
import { HomeDraggableLayer } from './home-draggable-layer'

export default function WriteButton() {
	// 获取屏幕中心的坐标
	const center = useCenterStore()
	// 从配置 store 中解构卡片样式、对话框开关、站点内容
	const { cardStyles, setConfigDialogOpen, siteContent } = useConfigStore()
	// 响应式断点：是否为最大小屏尺寸
	const { maxSM } = useSize()
	// Next 路由实例
	const router = useRouter()

	// 写按钮的样式配置
	const styles = cardStyles.writeButtons
	// hi 卡片的样式配置，用于计算位置偏移
	const hiCardStyles = cardStyles.hiCard
	// 时钟卡片的样式配置，用于计算位置偏移
	const clockCardStyles = cardStyles.clockCard

	// 控制按钮是否显示，初始隐藏
	const [show, setShow] = useState(false)

	// 根据样式配置中的 order 属性，延迟显示按钮，
	// 实现按序出现的动画效果
	useEffect(() => {
		const timer = setTimeout(
			() => setShow(true),
			styles.order * ANIMATION_DELAY * 1000
		)
		// 清理定时器，避免组件卸载后更新状态
		return () => clearTimeout(timer)
	}, [styles.order])

	// 如果当前是小屏设备，不渲染该按钮组
	if (maxSM) return null

	// 延迟动画未触发时不渲染
	if (!show) return null

	// 计算按钮组的初始 X 坐标：
	// 如果配置了 offsetX 则使用配置值，否则基于 hi 卡片位置计算
	const x =
		styles.offsetX !== null
			? center.x + styles.offsetX
			: center.x + CARD_SPACING + hiCardStyles.width / 2

	// 计算按钮组的初始 Y 坐标：
	// 如果配置了 offsetY 则使用配置值，否则基于时钟卡片位置计算
	const y =
		styles.offsetY !== null
			? center.y + styles.offsetY
			: center.y -
			  clockCardStyles.offset -
			  styles.height -
			  CARD_SPACING / 2 -
			  clockCardStyles.height

	return (
		// 使用可拖拽层包裹，支持在首页自由拖动按钮位置
		<HomeDraggableLayer
			cardKey='writeButtons'
			x={x}
			y={y}
			width={styles.width}
			height={styles.height}
		>
			{/* 动画容器：绝对定位，使用 motion.div 实现位置动画 */}
			<motion.div
				initial={{ left: x, top: y }}
				animate={{ left: x, top: y }}
				className='absolute flex items-center gap-4'
			>
				{/* 写文章按钮 */}
				<motion.button
					onClick={() => router.push('/write')}
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					style={{
						boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.4)',
					}}
					className='brand-btn whitespace-nowrap'
				>
					{/* 圣诞节装饰：条件渲染装饰图片 */}
					{siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-8.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{
									width: 60,
									left: -2,
									top: -4,
									opacity: 0.95,
								}}
							/>
						</>
					)}

					{/* 笔图标 */}
					<PenSVG />
					{/* 按钮文字 */}
					<span>写文章</span>
				</motion.button>

				{/* 配置按钮（点状图标） */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setConfigDialogOpen(true)}
					className='p-2'
				>
					<DotsSVG className='h-6 w-6' />
				</motion.button>
			</motion.div>
		</HomeDraggableLayer>
	)
}
