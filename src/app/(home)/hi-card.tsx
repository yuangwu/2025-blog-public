// 导入自定义 Hook，用于获取全局中心坐标状态（可能来自 Zustand 等全局状态管理）
import { useCenterStore } from '@/hooks/use-center'
// 导入通用卡片组件，提供基础布局与样式
import Card from '@/components/card'
// 导入当前模块的配置 Store，存储卡片样式与站点全局内容
import { useConfigStore } from './stores/config-store'
// 导入首页可拖拽容器组件，使卡片可以被自由拖动并定位
import { HomeDraggableLayer } from './home-draggable-layer'
// 导入 Next.js 的 Link 组件，用于客户端路由跳转
import Link from 'next/link'

/**
 * 根据当前小时返回对应的问候语
 * 6-11: Good Morning
 * 12-17: Good Afternoon
 * 18-21: Good Evening
 * 其他: Good Night
 */
function getGreeting() {
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
 * HiCard 组件
 * 作用：在首页显示一个可拖拽的问候卡片，包含头像、圣诞装饰（条件渲染）和个性化欢迎语
 */
export default function HiCard() {
	// 获取全局中心点坐标，用于初始定位
	const center = useCenterStore()
	// 从配置 Store 中读取卡片样式集合与站点内容（如用户名、圣诞开关）
	const { cardStyles, siteContent } = useConfigStore()
	// 获取实时问候语
	const greeting = getGreeting()
	// 取出 hiCard 对应的样式配置（宽高、偏移、层级等）
	const styles = cardStyles.hiCard
	// 用户名：优先使用站点配置中的 meta.username，默认 'Suni'
	const username = siteContent.meta.username || 'Suni'

	// 计算 X 轴坐标：若有自定义偏移则使用“中心点+偏移”，否则居中摆放（中心点 - 宽度/2）
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	// 计算 Y 轴坐标：同理，有自定义偏移则使用“中心点+偏移”，否则居中摆放
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height / 2

	return (
		// HomeDraggableLayer 提供可拖拽区域，根据 cardKey 持久化位置，并传入宽高与坐标
		<HomeDraggableLayer cardKey='hiCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* Card 为展示容器，传入层级、宽高、坐标以及额外的样式类 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='relative text-center max-sm:static max-sm:translate-0'>
				{/* 如果全局配置开启了圣诞模式，则显示两张圣诞装饰图片 */}
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
				{/* 头像区域：点击可跳转至 /live2d 页面 */}
				<Link href='/live2d'>
					<img src='/images/avatar.png' className='mx-auto rounded-full' style={{ width: 120, height: 120, boxShadow: ' 0 16px 32px -5px #E2D9CE' }} />
				</Link>
				{/* 问候语及用户名展示，使用特殊字体、渐变文字 */}
				<h1 className='font-averia mt-3 text-2xl'>
					{greeting} <br /> I'm <span className='text-linear text-[32px]'>{username}</span> , Nice to <br /> meet you!
				</h1>
			</Card>
		</HomeDraggableLayer>
	)
}