// 导入点赞按钮组件
import LikeButton from '@/components/like-button'
// 导入动画延迟和卡片间距常量
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
// 导入 motion 动画库的 React 封装
import { motion } from 'motion/react'
// 导入获取页面中心坐标的 hook
import { useCenterStore } from '@/hooks/use-center'
// 导入全局配置 store
import { useConfigStore } from './stores/config-store'
// 导入首页可拖拽容器组件
import { HomeDraggableLayer } from './home-draggable-layer'

export default function LikePosition() {
	// 获取中心点坐标（随窗口大小动态变化）
	const center = useCenterStore()
	// 从配置中获取卡片样式字典和网站内容开关
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.likePosition
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons
	const musicCardStyles = cardStyles.musicCard
	const shareCardStyles = cardStyles.shareCard

	// 计算 x 位置：
	// 优先使用手动偏移量 offsetX，否则按卡片布局自动计算：
	// 中心点 + HiCard半宽 - 社交按钮宽度 + 分享卡片宽度 + 卡片间距
	const x =
		styles.offsetX !== null
			? center.x + styles.offsetX
			: center.x +
				hiCardStyles.width / 2 -
				socialButtonsStyles.width +
				shareCardStyles.width +
				CARD_SPACING

	// 计算 y 位置：
	// 优先使用手动偏移量 offsetY，否则按卡片布局自动计算：
	// 中心点 + HiCard半高 + 三个间距（社交按钮高度、音乐卡片高度、额外间距）
	const y =
		styles.offsetY !== null
			? center.y + styles.offsetY
			: center.y +
				hiCardStyles.height / 2 +
				CARD_SPACING +
				socialButtonsStyles.height +
				CARD_SPACING +
				musicCardStyles.height +
				CARD_SPACING

	return (
		// 可拖拽层，用 cardKey 标识，设置初始位置和尺寸
		<HomeDraggableLayer
			cardKey='likePosition'
			x={x}
			y={y}
			width={styles.width}
			height={styles.height}
		>
			{/* 动画容器：绝对定位，移动端在小屏使用静态定位 */}
			<motion.div
				className='absolute max-sm:static'
				initial={{ left: x, top: y }}
				animate={{ left: x, top: y }}
			>
				{/* 若启用圣诞模式，显示圣诞装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-13.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{
								width: 40,
								left: -4,
								top: -4,
								opacity: 0.9,
							}}
						/>
					</>
				)}

				{/* 点赞按钮，延迟时间根据分享卡片的动画顺序计算（转换为毫秒） */}
				<LikeButton
					delay={cardStyles.shareCard.order * ANIMATION_DELAY * 1000}
				/>
			</motion.div>
		</HomeDraggableLayer>
	)
}
