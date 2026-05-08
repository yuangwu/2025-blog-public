import Card from '@/components/card' // 引入通用卡片组件
import { useCenterStore } from '@/hooks/use-center' // 获取视口中心坐标的 store
import { useConfigStore } from './stores/config-store' // 当前页面配置（卡片样式、站点内容等）
import { CARD_SPACING } from '@/consts' // 卡片之间的间距常量
import { useRouter } from 'next/navigation' // Next.js 路由，用于点击跳转
import { HomeDraggableLayer } from './home-draggable-layer' // 可拖拽容器组件

export default function ArtCard() {
	// 获取视口中心坐标，用于默认定位卡片
	const center = useCenterStore()
	// 从配置 store 中获取卡片样式设置和站点内容
	const { cardStyles, siteContent } = useConfigStore()
	const router = useRouter()
	// 取出艺术卡片和问候卡片的样式配置
	const styles = cardStyles.artCard
	const hiCardStyles = cardStyles.hiCard

	// 计算卡片的 x 坐标：如果有自定义偏移则使用偏移，否则基于 center 水平居中
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	// 计算卡片的 y 坐标：若有偏移则使用偏移，否则放在 hiCard 上方并留出间距
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - hiCardStyles.height / 2 - styles.height - CARD_SPACING

	// 获取艺术图片列表，默认为空数组
	const artImages = siteContent.artImages ?? []
	// 当前选中的艺术图片 ID
	const currentId = siteContent.currentArtImageId
	// 根据 currentId 查找对应图片，如果找不到或未设置，则回退到第一张图片
	const currentArt = (currentId ? artImages.find(item => item.id === currentId) : undefined) ?? artImages[0]
	// 最终展示的图片地址，如果都没有则使用占位图
	const artUrl = currentArt?.url || '/images/art/cat.png'

	return (
		// 使用可拖拽容器包裹，传入位置、尺寸和唯一标识 cardKey
		<HomeDraggableLayer cardKey='artCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* Card 组件实现具体的卡片样式与层级 */}
			<Card className='p-2 max-sm:static max-sm:translate-0' order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{/* 如果启用了圣诞装饰，显示角上的装饰图片 */}
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

				{/* 主图展示：点击跳转到图片浏览页面 */}
				<img onClick={() => router.push('/pictures')} src={artUrl} alt='wall art' className='h-full w-full rounded-[32px] object-cover' />
			</Card>
		</HomeDraggableLayer>
	)
}
