// 导入自定义卡片组件，用于承载备案信息的容器
import Card from '@/components/card'
// 中心坐标状态管理 hook，存储页面中心点位置，用于卡片定位
import { useCenterStore } from '@/hooks/use-center'
// 当前首页的配置 store，包含卡片样式和站点内容（如备案号）
import { useConfigStore } from './stores/config-store'
// 卡片之间的标准间距常量
import { CARD_SPACING } from '@/consts'
// Next.js 的 Link 组件，用于可选的备案链接跳转
import Link from 'next/link'
// 首页可拖拽图层组件，支持卡片在页面上自由拖动并记住位置
import { HomeDraggableLayer } from './home-draggable-layer'

// 备案卡片组件，展示 ICP 备案号，可选链接到备案查询页面
export default function BeianCard() {
	// 获取当前视口或布局的中心参考点坐标
	const center = useCenterStore()
	// 从配置 store 中取出卡片样式集合和站点基础内容
	const { cardStyles, siteContent } = useConfigStore()
	// 备案卡片自身的样式配置（宽高、层级、偏移量等）
	const styles = cardStyles.beianCard
	// Hi 卡片的样式，用于计算默认相对位置时的参照
	const hiCardStyles = cardStyles.hiCard
	// 文章卡片的样式（本例未直接使用，仅解构出）
	const articleCardStyles = cardStyles.articleCard

	// 计算卡片的 X 坐标：
	// 如果有自定义偏移 offsetX，则直接基于中心点加上偏移量；
	// 否则默认定位在 Hi 卡片右侧附近（Hi 卡片宽度一半 + 间隔 200px 偏移）
	const x = styles.offsetX !== null 
		? center.x + styles.offsetX 
		: center.x + hiCardStyles.width / 2 - styles.width + 200

	// 计算卡片的 Y 坐标：
	// 如果有自定义偏移 offsetY，则基于中心点加上偏移量；
	// 否则默认放在 Hi 卡片下方（Hi 卡片高度一半 + 卡片间距 + 额外 180px 偏移）
	const y = styles.offsetY !== null 
		? center.y + styles.offsetY 
		: center.y + hiCardStyles.height / 2 + CARD_SPACING + 180

	// 从站点内容中提取备案信息对象
	const beian = siteContent.beian

	// 如果没有备案文本内容，则不渲染任何东西
	if (!beian?.text) {
		return null
	}

	return (
		// 使用可拖拽图层包裹，传入唯一标识 cardKey 以及计算好的位置和尺寸
		<HomeDraggableLayer cardKey='beianCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 卡片容器，设置层级、宽高，并使其内容垂直水平居中，小屏幕下去掉绝对定位 */}
			<Card 
				order={styles.order} 
				width={styles.width} 
				height={styles.height} 
				x={x} 
				y={y} 
				className='flex items-center justify-center max-sm:static'
			>
				{/* 如果配置了备案链接，则使用 Link 组件，新标签页打开 */}
				{beian.link ? (
					<Link 
						href={beian.link} 
						target='_blank' 
						rel='noopener noreferrer' 
						className='text-secondary text-xs transition-opacity hover:opacity-80'
					>
						{beian.text}
					</Link>
				) : (
					// 否则仅显示纯文本的备案号
					<span className='text-secondary text-xs'>{beian.text}</span>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}