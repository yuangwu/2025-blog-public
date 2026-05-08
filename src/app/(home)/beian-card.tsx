// 导入自定义卡片组件
import Card from '@/components/card'
// 获取中心点坐标的 hook（拖拽/布局计算用）
import { useCenterStore } from '@/hooks/use-center'
// 配置 store，包含卡片样式和站点内容信息
import { useConfigStore } from './stores/config-store'
// 卡片之间的间距常量
import { CARD_SPACING } from '@/consts'
// Next.js 的链接组件，用于外链跳转
import Link from 'next/link'
// 可拖拽图层组件，使卡片支持拖拽定位
import { HomeDraggableLayer } from './home-draggable-layer'

export default function BeianCard() {
	// 获取当前中心点位置
	const center = useCenterStore()
	// 从配置 store 中获取卡片样式集合和站点内容
	const { cardStyles, siteContent } = useConfigStore()
	// 解构备案卡片的样式配置
	const styles = cardStyles.beianCard
	// hi 卡片的样式（用于位置参照）
	const hiCardStyles = cardStyles.hiCard
	// 文章卡片的样式（目前未使用，可留作将来扩展）
	const articleCardStyles = cardStyles.articleCard

	// 计算备案卡片的 X 坐标
	// 如果配置了偏移量 offsetX，直接基于中心点偏移；否则基于 hi 卡片右侧位置再向右挪 200px
	const x =
		styles.offsetX !== null
			? center.x + styles.offsetX
			: center.x + hiCardStyles.width / 2 - styles.width + 200

	// 计算备案卡片的 Y 坐标
	// 如果配置了偏移量 offsetY，直接基于中心点偏移；否则放在 hi 卡片下方增加卡片间距并再下移 180px
	const y =
		styles.offsetY !== null
			? center.y + styles.offsetY
			: center.y + hiCardStyles.height / 2 + CARD_SPACING + 180

	// 获取备案信息对象
	const beian = siteContent.beian

	// 如果备案文本不存在，不渲染该卡片
	if (!beian?.text) {
		return null
	}

	return (
		// 可拖拽图层，根据 cardKey 标识和计算出的坐标/尺寸进行定位
		<HomeDraggableLayer
			cardKey="beianCard"
			x={x}
			y={y}
			width={styles.width}
			height={styles.height}
		>
			{/* 卡片容器，设置层级、尺寸以及位置；移动端使用静态定位 */}
			<Card
				order={styles.order}
				width={styles.width}
				height={styles.height}
				x={x}
				y={y}
				className="flex items-center justify-center max-sm:static"
			>
				{/* 如果有链接则使用 Next Link 打开新标签页，否则直接显示纯文本 */}
				{beian.link ? (
					<Link
						href={beian.link}
						target="_blank"
						rel="noopener noreferrer"
						className="text-secondary text-xs transition-opacity hover:opacity-80"
					>
						{beian.text}
					</Link>
				) : (
					<span className="text-secondary text-xs">{beian.text}</span>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}
