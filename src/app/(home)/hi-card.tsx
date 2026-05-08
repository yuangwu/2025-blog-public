// 导入全局居中坐标状态管理 hook
import { useCenterStore } from '@/hooks/use-center'
// 导入通用卡片组件
import Card from '@/components/card'
// 导入站点配置（样式、内容）状态管理 hook
import { useConfigStore } from './stores/config-store'
// 导入首页可拖拽图层组件
import { HomeDraggableLayer } from './home-draggable-layer'
// Next.js 的链接组件，用于客户端导航
import Link from 'next/link'

/**
 * 根据当前时间返回对应的问候语
 * @returns {string} 问候语字符串
 */
function getGreeting() {
	// 获取当前小时数（0-23）
	const hour = new Date().getHours()

	if (hour >= 6 && hour < 12) {
		return 'Good Morning'
	} else if (hour >= 12 && hour < 18) {
		return 'Good Afternoon'
	} else if (hour >= 18 && hour < 22) {
		return 'Good Evening'
	} else {
		return 'Good Night'
	}
}

/**
 * 首页问候卡片组件
 * 根据配置项展示可拖拽的问候卡片，包含头像、用户名称以及节日装饰等
 */
export default function HiCard() {
	// 获取当前视口中心坐标（用于卡片默认居中定位）
	const center = useCenterStore()
	// 从配置 store 中取出卡片样式和站点内容
	const { cardStyles, siteContent } = useConfigStore()
	// 获取当前时段的问候语
	const greeting = getGreeting()
	// 解构出 hiCard 对应的样式配置
	const styles = cardStyles.hiCard
	// 用户名默认为 'Suni'
	const username = siteContent.meta.username || 'Suni'

	// 计算卡片的 x 坐标：如果有手动偏移量则基于中心偏移，否则基于中心自动居中
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	// 计算卡片的 y 坐标：同理，优先使用偏移量，否则垂直居中
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height / 2

	return (
		// 可拖拽图层包裹，传入卡片唯一标识、坐标和尺寸
		<HomeDraggableLayer cardKey='hiCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 卡片组件，控制层级、尺寸和位置；响应式下变为静态定位 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='relative text-center max-sm:static max-sm:translate-0'>
				{/* 如果站点开启圣诞主题，则显示圣诞装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-1.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 180, left: -20, top: -25, opacity: 0.9 }}
						/>
						<img
							src='/images/christmas/snow-2.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 160, bottom: -12, right: -8, opacity: 0.9 }}
						/>
					</>
				)}
				{/* 头像区域，点击可跳转到 Live2D 页面 */}
				<Link href='/live2d'>
					<img src='/images/avatar.png' className='mx-auto rounded-full' style={{ width: 120, height: 120, boxShadow: ' 0 16px 32px -5px #E2D9CE' }} />
				</Link>
				{/* 问候文本及用户名展示，应用渐变文字样式 */}
				<h1 className='font-averia mt-3 text-2xl'>
					{greeting} <br /> I'm <span className='text-linear text-[32px]'>{username}</span> , Nice to <br /> meet you!
				</h1>
			</Card>
		</HomeDraggableLayer>
	)
}
