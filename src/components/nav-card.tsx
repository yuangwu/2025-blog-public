// 声明该文件为客户端组件（Next.js App Router）
'use client'

import Card from '@/components/card' // 通用卡片容器
import Image from 'next/image' // Next.js 图片优化组件
import Link from 'next/link' // Next.js 客户端路由链接
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react' // 动画库（Framer Motion 的 React 封装）
import { useCenterStore } from '@/hooks/use-center' // 全局中心点状态（用于拖拽定位）
import { CARD_SPACING } from '@/consts' // 卡片间距常量
// SVG 图标组件
import ScrollOutlineSVG from '@/svgs/scroll-outline.svg'
import ScrollFilledSVG from '@/svgs/scroll-filled.svg'
import ProjectsFilledSVG from '@/svgs/projects-filled.svg'
import ProjectsOutlineSVG from '@/svgs/projects-outline.svg'
import AboutFilledSVG from '@/svgs/about-filled.svg'
import AboutOutlineSVG from '@/svgs/about-outline.svg'
import ShareFilledSVG from '@/svgs/share-filled.svg'
import ShareOutlineSVG from '@/svgs/share-outline.svg'
import WebsiteFilledSVG from '@/svgs/website-filled.svg'
import WebsiteOutlineSVG from '@/svgs/website-outline.svg'
import { usePathname } from 'next/navigation' // 获取当前路径
import clsx from 'clsx' // 条件类名组合
import { cn } from '@/lib/utils' // 自定义类名合并工具
import { useSize } from '@/hooks/use-size' // 响应式尺寸判断
import { useConfigStore } from '@/app/(home)/stores/config-store' // 全局配置（站点内容、卡片样式）
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer' // 可拖拽层容器

// 导航项列表，每个包含未选中/选中图标、标签和跳转路径
const list = [
	{
		icon: ScrollOutlineSVG,
		iconActive: ScrollFilledSVG,
		label: '近期文章',
		href: '/blog'
	},
	{
		icon: ProjectsOutlineSVG,
		iconActive: ProjectsFilledSVG,
		label: '我的项目',
		href: '/projects'
	},
	{
		icon: AboutOutlineSVG,
		iconActive: AboutFilledSVG,
		label: '关于网站',
		href: '/about'
	},
	{
		icon: ShareOutlineSVG,
		iconActive: ShareFilledSVG,
		label: '推荐分享',
		href: '/share'
	},
	{
		icon: WebsiteOutlineSVG,
		iconActive: WebsiteFilledSVG,
		label: '优秀博客',
		href: '/bloggers'
	}
]

// 悬停高亮矩形的额外扩展尺寸（用于圆角胶囊效果）
const extraSize = 8

export default function NavCard() {
	const pathname = usePathname() // 当前路由
	const center = useCenterStore() // 拖拽参考中心点
	const [show, setShow] = useState(false) // 控制初次渲染动画（延迟显示）
	const { maxSM } = useSize() // 是否小屏（移动端）
	const [hoveredIndex, setHoveredIndex] = useState<number>(0) // 当前鼠标悬停的导航项索引
	const { siteContent, cardStyles } = useConfigStore() // 站点内容与卡片样式配置
	const styles = cardStyles.navCard // 从配置中取出导航卡片的样式
	const hiCardStyles = cardStyles.hiCard // Hi卡片的样式，用于计算相对偏移

	// 根据当前路径自动计算激活的导航项索引
	const activeIndex = useMemo(() => {
		const index = list.findIndex(item => pathname === item.href)
		return index >= 0 ? index : undefined
	}, [pathname])

	// 组件挂载后触发显示，用于入场动画
	useEffect(() => {
		setShow(true)
	}, [])

	// 根据路径和屏幕大小决定卡片形态：全尺寸 / 迷你 / 仅图标
	let form = useMemo(() => {
		if (pathname == '/') return 'full'        // 首页展示全尺寸卡片
		else if (pathname == '/write') return 'mini' // 写作页展示最小化
		else return 'icons'                       // 其他页面只显示图标条
	}, [pathname])
	if (maxSM) form = 'icons' // 小屏强制只显示图标条

	const itemHeight = form === 'full' ? 52 : 28 // 每个导航项的高度

	// 计算卡片在屏幕上的绝对位置
	let position = useMemo(() => {
		if (form === 'full') {
			// 全尺寸时以 Hi卡片 为参考进行左右或自定义偏移
			const x = styles.offsetX !== null 
				? center.x + styles.offsetX 
				: center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			const y = styles.offsetY !== null 
				? center.y + styles.offsetY 
				: center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}
		// 图标和迷你模式固定在左上角
		return { x: 24, y: 16 }
	}, [form, center, styles, hiCardStyles])

	// 卡片实际渲染尺寸
	const size = useMemo(() => {
		if (form === 'mini') return { width: 64, height: 64 }
		else if (form === 'icons') return { width: 340, height: 64 }
		else return { width: styles.width, height: styles.height }
	}, [form, styles])

	// 当页面路径改变且不是通过悬停触发时，自动将高亮移到激活项（延迟1.5秒）
	useEffect(() => {
		if (form === 'icons' && activeIndex !== undefined && hoveredIndex !== activeIndex) {
			const timer = setTimeout(() => {
				setHoveredIndex(activeIndex)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [hoveredIndex, activeIndex, form])

	// 小屏时重新计算居中位置
	if (maxSM) position = { x: center.x - size.width / 2, y: 16 }

	if (show)
		return (
			<HomeDraggableLayer 
				cardKey='navCard' // 唯一标识，供拖拽层复用
				x={position.x} 
				y={position.y} 
				width={styles.width} 
				height={styles.height}
			>
				<Card
					order={styles.order} // 卡片层叠顺序
					width={size.width}
					height={size.height}
					x={position.x}
					y={position.y}
					className={clsx(
						form != 'full' && 'overflow-hidden', // 非全尺寸时裁剪溢出
						form === 'mini' && 'p-3',            // 迷你模式内边距
						form === 'icons' && 'flex items-center gap-6 p-3' // 图标模式水平布局
					)}
				>
					{/* 圣诞节装饰图（仅在首页且启用时显示） */}
					{form === 'full' && siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-4.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 160, left: -18, top: -20, opacity: 0.9 }}
							/>
						</>
					)}

					{/* 头像 + 站点名称（全尺寸时显示） */}
					<Link className='flex items-center gap-3' href='/'>
						<Image 
							src='/images/avatar.png' 
							alt='avatar' 
							width={40} 
							height={40} 
							style={{ boxShadow: '0 12px 20px -5px #E2D9CE' }} 
							className='rounded-full' 
						/>
						{form === 'full' && (
							<span className='font-averia mt-1 text-2xl leading-none font-medium'>
								{siteContent.meta.title}
							</span>
						)}
						{form === 'full' && (
							<span className='text-brand mt-2 text-xs font-medium'>(开发中)</span>
						)}
					</Link>

					{/* 导航菜单区域（全尺寸或图标模式） */}
					{(form === 'full' || form === 'icons') && (
						<>
							{/* 全尺寸时显示“General”标题 */}
							{form !== 'icons' && (
								<div className='text-secondary mt-6 text-sm uppercase'>General</div>
							)}

							{/* 导航项列表（含悬停动画） */}
							<div 
								className={cn(
									'relative mt-2 space-y-2', 
									form === 'icons' && 'mt-0 flex items-center gap-6 space-y-0'
								)}
							>
								{/* 跟随悬停移动的背景高亮 */}
								<motion.div
									className='absolute max-w-[230px] rounded-full border'
									layoutId='nav-hover' // 共享布局动画ID，保证平滑过渡
									initial={false}
									animate={
										form === 'icons'
											? {
													left: hoveredIndex * (itemHeight + 24) - extraSize,
													top: -extraSize,
													width: itemHeight + extraSize * 2,
													height: itemHeight + extraSize * 2
											  }
											: {
													top: hoveredIndex * (itemHeight + 8),
													left: 0,
													width: '100%',
													height: itemHeight
											  }
									}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 30
									}}
									style={{
										backgroundImage:
											'linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%)'
									}}
								/>

								{/* 渲染每个导航链接 */}
								{list.map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											'text-secondary text-md relative z-10 flex items-center gap-3 rounded-full px-5 py-3',
											form === 'icons' && 'p-0' // 图标模式不需要内边距
										)}
										onMouseEnter={() => setHoveredIndex(index)} // 悬停时更新索引
									>
										{/* 图标容器，固定28px */}
										<div className='flex h-7 w-7 items-center justify-center'>
											{hoveredIndex == index ? (
												<item.iconActive className='text-brand absolute h-7 w-7' />
											) : (
												<item.icon className='absolute h-7 w-7' />
											)}
										</div>
										{/* 非图标模式显示文字标签，悬停项加粗 */}
										{form !== 'icons' && (
											<span className={clsx(index == hoveredIndex && 'text-primary font-medium')}>
												{item.label}
											</span>
										)}
									</Link>
								))}
							</div>
						</>
					)}
				</Card>
			</HomeDraggableLayer>
		)
}