import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
// 从全局常量中导入动画延迟系数和卡片间距值

import PenSVG from '@/svgs/pen.svg'
// 导入钢笔图标的 SVG 组件，用于“写文章”按钮的图标

import { motion } from 'motion/react'
// 从 motion 库引入 motion 组件，用于为按钮添加入场动画和交互效果（缩放、透明度等）

import { useEffect, useState } from 'react'
// 引入 React 的 useEffect 和 useState 钩子

import { useConfigStore } from './stores/config-store'
// 引入全局配置状态管理钩子，包含卡片样式、站点内容、对话框开关等数据和方法

import { useCenterStore } from '@/hooks/use-center'
// 引入自定义 hook，用于获取当前页面中心点的坐标（通常基于窗口大小和布局计算）

import { useRouter } from 'next/navigation'
// 从 Next.js 导航模块引入 useRouter，用于编程式页面跳转

import { useSize } from '@/hooks/use-size'
// 引入自定义 hook，用于获取响应式断点信息，这里用于判断是否为小屏幕（maxSM）

import DotsSVG from '@/svgs/dots.svg'
// 引入三个点的图标 SVG 组件，用于“更多/设置”按钮

import { HomeDraggableLayer } from './home-draggable-layer'
// 引入可拖拽的容器组件，包裹按钮以实现拖拽定位功能，并提供统一的拖拽行为管理

export default function WriteButton() {
	// 获取当前视图的中心坐标（通常基于窗口大小动态计算）
	const center = useCenterStore()

	// 从配置 store 中取出卡片样式集合、控制配置弹窗的方法，以及站点内容配置（如节日开关）
	const { cardStyles, setConfigDialogOpen, siteContent } = useConfigStore()

	// 获取当前是否为小屏幕（maxSM 为 true 表示屏幕宽度小于 sm 断点）
	const { maxSM } = useSize()

	// Next.js 路由实例，用于跳转到写作页面
	const router = useRouter()

	// 从卡片样式集合中解构出写文章按钮的样式配置（宽高、偏移量、动画顺序等）
	const styles = cardStyles.writeButtons

	// 问候卡片的样式，用于计算默认偏移位置
	const hiCardStyles = cardStyles.hiCard

	// 时钟卡片的样式，同样用于布局计算
	const clockCardStyles = cardStyles.clockCard

	// 控制按钮是否显示的本地状态
	const [show, setShow] = useState(false)

	useEffect(() => {
		// 根据样式里定义的动画顺序，设置延时后显示按钮，形成依次出现的动画效果
		// styles.order 是数字序号，ANIMATION_DELAY 是基础延迟秒数，乘以 1000 转为毫秒
		setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
	}, [styles.order])

	// 小屏幕下直接不渲染该组件
	if (maxSM) return null

	// 未到显示时间时也返回空，避免按钮过早出现
	if (!show) return null

	// 计算最终的水平位置 x
	// 如果设置了自定义偏移量 styles.offsetX 则使用，否则按默认规则计算：
	// 默认位于中心点右侧：中心x + 卡片间距 + 问候卡宽度的一半（使得与问候卡保持合适的间距）
	const x = styles.offsetX !== null 
		? center.x + styles.offsetX 
		: center.x + CARD_SPACING + hiCardStyles.width / 2

	// 计算最终的垂直位置 y
	// 如果设置了自定义偏移量 styles.offsetY 则使用，否则默认位于时钟卡片上方：
	// 中心y - 时钟卡片的偏移量 - 当前按钮高度 - 半个卡片间距 - 时钟卡片高度
	// 这通常会将按钮摆放在时钟卡片的正上方，留有一定间隙
	const y = styles.offsetY !== null 
		? center.y + styles.offsetY 
		: center.y - clockCardStyles.offset - styles.height - CARD_SPACING / 2 - clockCardStyles.height

	return (
		// 使用可拖拽层包裹内容，传入卡片 key 用于持久化位置，以及计算好的初始坐标和宽高
		<HomeDraggableLayer cardKey='writeButtons' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 外层 motion.div 用于整体包裹两个按钮，初始与动画状态均同步为计算好的 x, y */}
			<motion.div 
				initial={{ left: x, top: y }} 
				animate={{ left: x, top: y }} 
				className='absolute flex items-center gap-4'
			>
				{/* 写文章按钮 */}
				<motion.button
					onClick={() => router.push('/write')}  // 点击跳转到写作页
					initial={{ opacity: 0, scale: 0.6 }}    // 初始状态：透明且缩小
					animate={{ opacity: 1, scale: 1 }}      // 入场动画：完全显示且正常大小
					whileHover={{ scale: 1.05 }}            // 悬停时轻微放大
					whileTap={{ scale: 0.95 }}              // 按下时轻微缩小
					style={{ boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.4)' }} // 内发光效果
					className='brand-btn whitespace-nowrap'  // 预设品牌按钮样式，防止文字换行
				>
					{/* 如果启用了圣诞主题，则显示装饰图片 */}
					{siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-8.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute' // 不阻挡点击，绝对定位覆盖在按钮上
								style={{ width: 60, left: -2, top: -4, opacity: 0.95 }}
							/>
						</>
					)}

					{/* 钢笔图标 */}
					<PenSVG />
					{/* 按钮文字 */}
					<span>写文章</span>
				</motion.button>

				{/* 设置按钮（三点图标） */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setConfigDialogOpen(true)} // 点击打开配置弹窗
					className='p-2' // 内边距
				>
					<DotsSVG className='h-6 w-6' /> {/* 三点图标，固定尺寸 */}
				</motion.button>
			</motion.div>
		</HomeDraggableLayer>
	)
}