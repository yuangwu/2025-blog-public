// 导入点赞按钮组件
import LikeButton from '@/components/like-button'
// 动画延迟和卡片间距常量
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
// 从 motion 库导入 motion 组件，用于动画
import { motion } from 'motion/react'
// 自定义 Hook，用于获取可拖拽区域的中心坐标
import { useCenterStore } from '@/hooks/use-center'
// 全局配置状态管理，提供卡片布局样式与网站内容开关
import { useConfigStore } from './stores/config-store'
// 可拖拽容器组件，卡片可在此范围内被拖动
import { HomeDraggableLayer } from './home-draggable-layer'

export default function LikePosition() {
	// 获取当前中心点坐标 { x, y }
	const center = useCenterStore()
	// 从配置 Store 中解构出卡片样式集合和站点内容配置
	const { cardStyles, siteContent } = useConfigStore()
	// 当前卡片（点赞位置）的样式（含宽高、偏移等）
	const styles = cardStyles.likePosition
	// 名片卡片（hiCard）的样式，用于计算默认坐标
	const hiCardStyles = cardStyles.hiCard
	// 社交按钮卡片的样式
	const socialButtonsStyles = cardStyles.socialButtons
	// 音乐卡片的样式
	const musicCardStyles = cardStyles.musicCard
	// 分享卡片的样式
	const shareCardStyles = cardStyles.shareCard

	// 计算卡片的最终 X 坐标
	// 如果自身样式中有明确的 offsetX，则使用中心点 + offsetX；
	// 否则根据其他卡片的尺寸和间距动态推导默认位置：
	// 中心点 + 名片宽度的一半 - 社交按钮宽度 + 分享卡片宽度 + 卡片间距
	const x =
		styles.offsetX !== null
			? center.x + styles.offsetX
			: center.x +
			  hiCardStyles.width / 2 -
			  socialButtonsStyles.width +
			  shareCardStyles.width +
			  CARD_SPACING

	// 计算卡片的最终 Y 坐标
	// 如果自身样式中有明确的 offsetY，则使用中心点 + offsetY；
	// 否则默认位于名片下方，依次加上名片高度、多个间距、社交按钮高度、音乐卡片高度
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
		// 用可拖拽层包裹，传入卡片唯一标识、计算出的坐标及卡片自身宽高
		<HomeDraggableLayer
			cardKey='likePosition'
			x={x}
			y={y}
			width={styles.width}
			height={styles.height}
		>
			{/* motion.div 负责根据计算好的 x, y 执行平滑的移动动画 */}
			<motion.div
				className='absolute max-sm:static'
				initial={{ left: x, top: y }}
				animate={{ left: x, top: y }}
			>
				{/* 如果开启了圣诞模式，渲染一个装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-13.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 40, left: -4, top: -4, opacity: 0.9 }}
						/>
					</>
				)}

				{/* 点赞按钮，其入场延迟根据分享卡片的显示顺序动态计算 */}
				<LikeButton
					delay={
						cardStyles.shareCard.order * ANIMATION_DELAY * 1000
					}
				/>
			</motion.div>
		</HomeDraggableLayer>
	)
}