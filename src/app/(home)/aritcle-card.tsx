// 从 @/components/card 路径导入 Card 组件，用于渲染卡片容器
import Card from '@/components/card'
// 引入 中心点坐标 状态钩子，用于获取当前视口中心位置
import { useCenterStore } from '@/hooks/use-center'
// 引入 配置状态 仓库，包含卡片样式与站点内容（如图片、圣诞开关等）
import { useConfigStore } from './stores/config-store'
// 卡片之间的间距常量，来自全局常量定义
import { CARD_SPACING } from '@/consts'
// Next.js 路由钩子，用于编程式跳转
import { useRouter } from 'next/navigation'
// 可拖拽的容器组件，使卡片能响应鼠标/触摸移动
import { HomeDraggableLayer } from './home-draggable-layer'

export default function ArtCard() {
	// 获取当前视口中心坐标 { x, y }
	const center = useCenterStore()
	// 从配置仓库获取卡片样式表与站点内容
	const { cardStyles, siteContent } = useConfigStore()
	// 获得路由实例，用于点击图片跳转到 /pictures 页面
	const router = useRouter()
	// 取 artCard 的样式配置（宽、高、偏移、层级等）
	const styles = cardStyles.artCard
	// 取 hiCard 的样式配置（主要用于计算纵向位置时的参照高度）
	const hiCardStyles = cardStyles.hiCard

	// 计算卡片的 X 轴位置：
	// 若配置了 offsetX，则使用中心 X + offsetX；否则默认居中：center.x - 宽度的一半
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	// 计算卡片的 Y 轴位置：
	// 若配置了 offsetY，则使用中心 Y + offsetY；否则默认位于 hiCard 上方，间距为 CARD_SPACING
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - hiCardStyles.height / 2 - styles.height - CARD_SPACING

	// 取站点内容中的艺术作品图片数组，若无则用空数组兜底
	const artImages = siteContent.artImages ?? []
	// 当前显示的艺术品图片 ID
	const currentId = siteContent.currentArtImageId
	// 根据 currentId 查找对应图片项，找不到或未设置时用数组第一项作为兜底
	const currentArt = (currentId ? artImages.find(item => item.id === currentId) : undefined) ?? artImages[0]
	// 最终展示的图片地址，若无则使用默认占位图
	const artUrl = currentArt?.url || '/images/art/cat.png'

	return (
		// HomeDraggableLayer 提供拖拽能力，并指定此卡片的唯一 key 及位置尺寸
		<HomeDraggableLayer cardKey='artCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* Card 组件作为卡片容器，应用样式并传递层级与位置属性 */}
			<Card className='p-2 max-sm:static max-sm:translate-0' order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{/* 如果启用了圣诞节装饰，则渲染一个装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-3.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 160, right: -8, top: -16, opacity: 0.9 }}
						/>
					</>
				)}

				{/* 点击图片跳转到 /pictures 页面；图片填满卡片并保持圆角 */}
				<img onClick={() => router.push('/pictures')} src={artUrl} alt='wall art' className='h-full w-full rounded-[32px] object-cover' />
			</Card>
		</HomeDraggableLayer>
	)
}