'use client' // 标记为客户端组件，确保在浏览器端运行（Next.js 13+ App Router 要求）

// 引入自定义卡片组件（需确保 components/card 存在且正确导出）
import Card from '@/components/card'
// Next.js 图片优化组件
import Image from 'next/image'
// Next.js 路由链接组件
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
// framer-motion 动画库（需确保已安装：npm install framer-motion）
import { motion } from 'motion/react'
// 自定义 hook：获取中心位置（需确保 hooks/use-center 存在）
import { useCenterStore } from '@/hooks/use-center'
// 卡片间距常量（需确保 consts 文件存在且导出 CARD_SPACING）
import { CARD_SPACING } from '@/consts'
// SVG 图标组件（需确保 svgs 目录下这些 .svg 文件存在，且作为 React 组件导出）
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
// Next.js 钩子，获取当前路径名
import { usePathname } from 'next/navigation'
// 类名合并工具（需安装 clsx）
import clsx from 'clsx'
// 自定义 cn 函数，通常用于合并 Tailwind 类名（需确保 lib/utils 存在）
import { cn } from '@/lib/utils'
// 自定义 hook：获取响应式断点（需确保 hooks/use-size 存在）
import { useSize } from '@/hooks/use-size'
// 全局配置 store（需确保 app/(home)/stores/config-store 存在）
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 可拖拽图层组件（需确保组件路径存在）
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'

// 导航项列表配置
const list = [
	{
		icon: ScrollOutlineSVG,        // 未选中图标
		iconActive: ScrollFilledSVG,   // 选中/悬停图标
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

// 悬停高亮时额外的内边距（px）
const extraSize = 8

// 主导航卡片组件
export default function NavCard() {
	const pathname = usePathname()                // 当前路由路径，例如 '/blog'
	const center = useCenterStore()               // 获取拖拽中心点坐标（可用于定位）
	const [show, setShow] = useState(false)       // 控制卡片是否显示（用于入场动画）
	const { maxSM } = useSize()                   // 是否小于 sm 断点（移动端）
	const [hoveredIndex, setHoveredIndex] = useState<number>(0) // 当前悬停项的索引
	const { siteContent, cardStyles } = useConfigStore() // 从全局配置中获取站点内容和卡片样式
	const styles = cardStyles.navCard             // 导航卡片的样式配置（宽高、偏移量等）
	const hiCardStyles = cardStyles.hiCard        // 打招呼卡片样式，用于相对定位计算

	// 计算当前激活的导航项（路径匹配）
	const activeIndex = useMemo(() => {
		const index = list.findIndex(item => pathname === item.href)
		return index >= 0 ? index : undefined
	}, [pathname])

	// 组件挂载后显示卡片（避免初始布局闪烁）
	useEffect(() => {
		setShow(true)
	}, [])

	// 根据路径决定卡片的表现形态：'full'（完整）、'mini'（迷你）、'icons'（仅图标）
	let form = useMemo(() => {
		if (pathname == '/') return 'full'        // 首页显示完整卡片
		else if (pathname == '/write') return 'mini' // 写文章页显示迷你卡片
		else return 'icons'                       // 其余页面仅显示图标栏
	}, [pathname])
	// 移动端强制使用图标栏形态（节省空间）
	if (maxSM) form = 'icons'

	// 每个导航项的高度（px），根据形态变化
	const itemHeight = form === 'full' ? 52 : 28

	// 计算卡片的位置（x, y）
	let position = useMemo(() => {
		if (form === 'full') {
			// 完整形态下，根据中心点、偏移量以及 hiCard 的位置进行定位
			// 如果 styles.offsetX 存在则使用，否则将卡片放在 hiCard 左侧并留出间距
			const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			// 垂直方向：如果有 offsetY 则使用，否则与 hiCard 底部对齐
			const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}
		// 非完整形态下，固定位于左上角偏移 (24, 16)
		return {
			x: 24,
			y: 16
		}
	}, [form, center, styles, hiCardStyles])

	// 计算卡片的尺寸（宽高）
	const size = useMemo(() => {
		if (form === 'mini') return { width: 64, height: 64 }           // 迷你卡片方形
		else if (form === 'icons') return { width: 340, height: 64 }    // 图标栏横向矩形
		else return { width: styles.width, height: styles.height }      // 完整形态使用配置中的尺寸
	}, [form, styles])

	// 当形态为“仅图标”且存在激活项时，若用户未悬停，1.5秒后自动高亮激活项（提升体验）
	useEffect(() => {
		if (form === 'icons' && activeIndex !== undefined && hoveredIndex !== activeIndex) {
			const timer = setTimeout(() => {
				setHoveredIndex(activeIndex)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [hoveredIndex, activeIndex, form])

	// 移动端强制将卡片居中显示（覆盖前面的计算位置）
	if (maxSM) position = { x: center.x - size.width / 2, y: 16 }

	// 只有当 show 为 true 时才渲染（避免初始位置错误）
	if (show)
		return (
			// 可拖拽图层包裹卡片，传入唯一标识、位置和尺寸（允许用户拖拽移动）
			<HomeDraggableLayer cardKey='navCard' x={position.x} y={position.y} width={styles.width} height={styles.height}>
				<Card
					order={styles.order}           // 卡片层级顺序
					width={size.width}
					height={size.height}
					x={position.x}
					y={position.y}
					// 根据形态添加不同的 Tailwind 类名
					className={clsx(form != 'full' && 'overflow-hidden', form === 'mini' && 'p-3', form === 'icons' && 'flex items-center gap-6 p-3')}>
					
					{/* 圣诞节装饰（仅在完整形态且开启节日效果时显示） */}
					{form === 'full' && siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-4.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute' // 禁止点击穿透
								style={{ width: 160, left: -18, top: -20, opacity: 0.9 }}
							/>
						</>
					)}

					{/* 头像和站点标题区域，点击可回到首页 */}
					<Link className='flex items-center gap-3' href='/'>
						<Image src='/images/avatar.png' alt='avatar' width={40} height={40} style={{ boxShadow: ' 0 12px 20px -5px #E2D9CE' }} className='rounded-full' />
						{form === 'full' && <span className='font-averia mt-1 text-2xl leading-none font-medium'>{siteContent.meta.title}</span>}
						{form === 'full' && <span className='text-brand mt-2 text-xs font-medium'>(开发中)</span>}
					</Link>

					{/* 导航菜单区域：仅完整形态和图标栏形态显示 */}
					{(form === 'full' || form === 'icons') && (
						<>
							{/* 完整形态下显示“General”分类标题 */}
							{form !== 'icons' && <div className='text-secondary mt-6 text-sm uppercase'>General</div>}

							<div className={cn('relative mt-2 space-y-2', form === 'icons' && 'mt-0 flex items-center gap-6 space-y-0')}>
								{/* 动画背景高亮条：根据悬停项移动位置 */}
								<motion.div
									className='absolute max-w-[230px] rounded-full border'
									layoutId='nav-hover'       // 用于共享布局动画
									initial={false}
									animate={
										form === 'icons'
											? {
													left: hoveredIndex * (itemHeight + 24) - extraSize,
													top: -extraSize,
													width: itemHeight + extraSize * 2,
													height: itemHeight + extraSize * 2
												}
											: { top: hoveredIndex * (itemHeight + 8), left: 0, width: '100%', height: itemHeight }
									}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 30
									}}
									style={{ backgroundImage: 'linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%)' }}
								/>

								{/* 遍历所有导航项 */}
								{list.map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										className={cn('text-secondary text-md relative z-10 flex items-center gap-3 rounded-full px-5 py-3', form === 'icons' && 'p-0')}
										onMouseEnter={() => setHoveredIndex(index)}>
										<div className='flex h-7 w-7 items-center justify-center'>
											{/* 根据是否悬停显示实心或轮廓图标 */}
											{hoveredIndex == index ? <item.iconActive className='text-brand absolute h-7 w-7' /> : <item.icon className='absolute h-7 w-7' />}
										</div>
										{/* 非图标形态下显示文字标签 */}
										{form !== 'icons' && <span className={clsx(index == hoveredIndex && 'text-primary font-medium')}>{item.label}</span>}
									</Link>
								))}
							</div>
						</>
					)}
				</Card>
			</HomeDraggableLayer>
		)
}
