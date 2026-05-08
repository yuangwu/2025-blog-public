import { useCenterStore } from '@/hooks/use-center'
import GithubSVG from '@/svgs/github.svg'
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import { useConfigStore } from './stores/config-store'
import JuejinSVG from '@/svgs/juejin.svg'
import EmailSVG from '@/svgs/email.svg'
import XSVG from '@/svgs/x.svg'
import TgSVG from '@/svgs/tg.svg'
import WechatSVG from '@/svgs/wechat.svg'
import FacebookSVG from '@/svgs/facebook.svg'
import TiktokSVG from '@/svgs/tiktok.svg'
import InstagramSVG from '@/svgs/instagram.svg'
import WeiboSVG from '@/svgs/weibo.svg'
import XiaohongshuSVG from '@/svgs/小红书.svg'
import ZhihuSVG from '@/svgs/知乎.svg'
import BilibiliSVG from '@/svgs/哔哩哔哩.svg'
import QqSVG from '@/svgs/qq.svg'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState, useMemo, useRef } from 'react'
import type React from 'react'
import { toast } from 'sonner'
import { useSize } from '@/hooks/use-size'
import { HomeDraggableLayer } from './home-draggable-layer'
import { createPortal } from 'react-dom'

/**
 * 支持的社交按钮类型
 * - github: GitHub
 * - juejin: 掘金
 * - email: 邮箱
 * - link: 通用链接
 * - x: X（原 Twitter）
 * - tg: Telegram
 * - wechat: 微信
 * - facebook: Facebook
 * - tiktok: TikTok
 * - instagram: Instagram
 * - weibo: 微博
 * - xiaohongshu: 小红书
 * - zhihu: 知乎
 * - bilibili: 哔哩哔哩
 * - qq: QQ
 */
type SocialButtonType =
	| 'github'
	| 'juejin'
	| 'email'
	| 'link'
	| 'x'
	| 'tg'
	| 'wechat'
	| 'facebook'
	| 'tiktok'
	| 'instagram'
	| 'weibo'
	| 'xiaohongshu'
	| 'zhihu'
	| 'bilibili'
	| 'qq'

/** 社交按钮配置项的结构定义 */
interface SocialButtonConfig {
	id: string
	type: SocialButtonType
	value: string
	label?: string
	order: number
}

/**
 * 社交按钮组件
 * 根据配置动态渲染一组社交链接按钮，支持点击复制文本、弹出二维码等交互，
 * 并集成拖拽定位功能（通过 HomeDraggableLayer 包裹）。
 */
export default function SocialButtons() {
	// 获取中心点坐标（拖拽定位基准）
	const center = useCenterStore()
	// 获取卡片样式配置与站点内容数据
	const { cardStyles, siteContent } = useConfigStore()
	// 获取屏幕尺寸状态：maxSM 表示是否小屏，init 表示是否已完成初始化
	const { maxSM, init } = useSize()
	// 当前卡片社交按钮的样式配置
	const styles = cardStyles.socialButtons
	// hiCard 的样式配置，用于计算默认偏移位置
	const hiCardStyles = cardStyles.hiCard
	// 动画顺序：小屏或未初始化时置为 0（立即展示）
	const order = maxSM && init ? 0 : styles.order
	// 每个按钮出现的间隔延迟（毫秒），小屏或未初始化时不做延迟
	const delay = maxSM && init ? 0 : 100

	/**
	 * 按 order 字段排序后的社交按钮列表
	 * 使用 useMemo 避免重复排序
	 */
	const sortedButtons = useMemo(() => {
		const buttons = (siteContent.socialButtons || []) as SocialButtonConfig[]
		return [...buttons].sort((a, b) => a.order - b.order)
	}, [siteContent.socialButtons])

	// 各个按钮的显示状态（用于入场动画）
	const [showStates, setShowStates] = useState<Record<string, boolean>>({})
	// 各个按钮的下拉菜单开关状态（如微信/QQ 的二维码弹窗）
	const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
	// 存储各个下拉菜单 DOM 的 ref
	const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
	// 存储各个按钮 DOM 的 ref
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

	/**
	 * 依次触发每个按钮的入场动画（逐个显示）
	 * 依赖 order、delay、sortedButtons，当它们变化时重新规划动画时序
	 */
	useEffect(() => {
		const baseDelay = order * ANIMATION_DELAY * 1000

		sortedButtons.forEach((button, index) => {
			const showDelay = baseDelay + index * delay
			setTimeout(() => {
				setShowStates(prev => ({ ...prev, [button.id]: true }))
			}, showDelay)
		})

		// 容器本身的显示也跟随动画顺序
		setTimeout(() => {
			setShowStates(prev => ({ ...prev, container: true }))
		}, baseDelay)
	}, [order, delay, sortedButtons])

	/**
	 * 监听全局点击，实现弹出二维码时点击外部区域自动关闭
	 */
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			Object.keys(openDropdowns).forEach(buttonId => {
				if (openDropdowns[buttonId]) {
					const buttonRef = buttonRefs.current[buttonId]
					const dropdownRef = dropdownRefs.current[buttonId]
					// 如果点击的不是按钮本身，也不是下拉面板，则关闭该下拉
					if (buttonRef && !buttonRef.contains(target) && dropdownRef && !dropdownRef.contains(target)) {
						setOpenDropdowns(prev => ({ ...prev, [buttonId]: false }))
					}
				}
			})
		}

		// 只有在存在至少一个打开的下拉时才绑定事件
		if (Object.values(openDropdowns).some(Boolean)) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => {
				document.removeEventListener('mousedown', handleClickOutside)
			}
		}
	}, [openDropdowns])

	/**
	 * 计算按钮容器在页面上的 x 坐标
	 * 优先使用配置的 offsetX，否则根据 hiCard 居中对齐计算
	 */
	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - styles.width
	/**
	 * 计算按钮容器在页面上的 y 坐标
	 * 优先使用配置的 offsetY，否则放在 hiCard 下方，并加上卡片间距
	 */
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING

	// 在容器本身尚未到展示时机时，不渲染任何内容
	if (!showStates.container) return null

	/**
	 * 按钮类型到对应 SVG 图标组件的映射
	 * link 类型没有图标，返回一个空 Fragment 组件
	 */
	const iconMap: Record<SocialButtonType, React.ComponentType<{ className?: string }>> = {
		github: GithubSVG,
		juejin: JuejinSVG,
		email: EmailSVG,
		wechat: WechatSVG,
		x: XSVG,
		tg: TgSVG,
		facebook: FacebookSVG,
		tiktok: TiktokSVG,
		instagram: InstagramSVG,
		weibo: WeiboSVG,
		xiaohongshu: XiaohongshuSVG,
		zhihu: ZhihuSVG,
		bilibili: BilibiliSVG,
		qq: QqSVG,
		link: () => null
	}

	/**
	 * 根据单个按钮配置渲染对应的 UI
	 * - GitHub 有特殊深色样式
	 * - email/wechat/qq 类型支持点击复制（若 value 为图片路径则显示二维码弹窗）
	 * - link 类型为纯链接
	 * - 其它默认为带图标（可选标签）的链接按钮
	 */
	const renderButton = (button: SocialButtonConfig) => {
		// 尚未到该按钮显示的时间，不渲染
		if (!showStates[button.id]) return null

		// 按钮通用动画配置（入场、悬停、点击效果）
		const commonProps = {
			initial: { opacity: 0, scale: 0.6 } as const,
			animate: { opacity: 1, scale: 1 } as const,
			whileHover: { scale: 1.05 } as const,
			whileTap: { scale: 0.95 } as const
		}

		const Icon = iconMap[button.type]
		const hasLabel = Boolean(button.label)
		// 有标签文字时图标稍小
		const iconSize = hasLabel ? 'size-6' : 'size-8'

		// GitHub 按钮：特殊样式 + 内阴影
		if (button.type === 'github') {
			return (
				<motion.a
					key={button.id}
					href={button.value}
					target='_blank'
					{...commonProps}
					className={`font-averia flex items-center gap-2 rounded-xl border bg-[#070707] text-xl text-white ${!hasLabel ? 'p-1.5' : 'px-3 py-1.5'}`}
					style={{ boxShadow: ' inset 0 0 12px rgba(255, 255, 255, 0.4)' }}>
					<Icon className={'size-8'} />
					{hasLabel && button.label}
				</motion.a>
			)
		}

		// 邮箱、微信、QQ：支持复制到剪贴板，微信/QQ 也可以展示二维码
		if (button.type === 'email' || button.type === 'wechat' || button.type === 'qq') {
			// 复制成功后提示消息的映射
			const messageMap: Record<'email' | 'wechat' | 'qq', string> = {
				email: '邮箱已复制到剪贴板',
				wechat: '微信号已复制到剪贴板',
				qq: 'QQ号已复制到剪贴板'
			}

			// 判断 value 是否为图片路径（用于展示二维码）
			const isImagePath = button.value.startsWith('/images/social-buttons/')
			const isOpen = openDropdowns[button.id] || false

			// 如果是图片路径并且是微信/QQ，则点击弹出二维码
			if (isImagePath && (button.type === 'wechat' || button.type === 'qq')) {
				return (
					<div key={button.id} className='relative'>
						<motion.button
							ref={el => {
								buttonRefs.current[button.id] = el
							}}
							onClick={() => {
								setOpenDropdowns(prev => ({ ...prev, [button.id]: !prev[button.id] }))
							}}
							{...commonProps}
							className='card btn relative rounded-xl p-1.5'>
							<Icon className='size-8' />
						</motion.button>
						{/* 二维码弹窗使用 Portal 挂载到 body，避免定位受父容器约束 */}
						{typeof window !== 'undefined' &&
							createPortal(
								<AnimatePresence>
									{isOpen && (
										<>
											{/* 遮罩层，点击关闭二维码 */}
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												onClick={() => setOpenDropdowns(prev => ({ ...prev, [button.id]: false }))}
												className='fixed inset-0 z-40'
											/>
											{/* 二维码卡片 */}
											<motion.div
												ref={el => {
													dropdownRefs.current[button.id] = el
												}}
												initial={{ opacity: 0, y: -8, scale: 0.95 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: -8, scale: 0.95 }}
												transition={{ duration: 0.2 }}
												className='bg-card fixed z-50 rounded-2xl border p-4 backdrop-blur-xl'
												style={{
													// 根据按钮位置定位弹窗位置
													top: buttonRefs.current[button.id] ? `${buttonRefs.current[button.id]!.getBoundingClientRect().bottom + 8}px` : '0px',
													left: buttonRefs.current[button.id] ? `${buttonRefs.current[button.id]!.getBoundingClientRect().left}px` : '0px',
													boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
												}}>
												<img src={button.value} alt='QR Code' className='h-48 w-48 rounded-lg object-cover' />
											</motion.div>
										</>
									)}
								</AnimatePresence>,
								document.body
							)}
					</div>
				)
			}

			// 非图片路径：点击直接复制 value 到剪贴板并 toast 提示
			return (
				<motion.button
					key={button.id}
					onClick={() => {
						navigator.clipboard.writeText(button.value).then(() => {
							toast.success(messageMap[button.type as 'email' | 'wechat' | 'qq'])
						})
					}}
					{...commonProps}
					className='card btn relative rounded-xl p-1.5'>
					<Icon className='size-8' />
				</motion.button>
			)
		}

		// 通用链接类型：显示文字（标签或值），无图标
		if (button.type === 'link') {
			return (
				<motion.a
					key={button.id}
					href={button.value}
					target='_blank'
					{...commonProps}
					className='card relative flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium whitespace-nowrap'>
					{hasLabel ? button.label : button.value}
				</motion.a>
			)
		}

		// 其余类型（如掘金、X、Telegram 等）：带图标，可选标签
		return (
			<motion.a
				key={button.id}
				href={button.value}
				target='_blank'
				{...commonProps}
				className={`card relative rounded-xl font-medium whitespace-nowrap ${hasLabel ? 'flex items-center gap-2 px-3 py-2.5' : 'p-1.5'}`}>
				<Icon className={iconSize} />
				{hasLabel && button.label}
			</motion.a>
		)
	}

	return (
		// 使用 HomeDraggableLayer 包裹，使整个社交按钮区域可拖拽
		<HomeDraggableLayer cardKey='socialButtons' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 外层 motion.div 用于整体入场动画定位 */}
			<motion.div className='absolute max-sm:static' animate={{ left: x, top: y }} initial={{ left: x, top: y }}>
				{/* 按钮列表容器：flex 反向排列（从右向左），小屏幕无绝对定位 */}
				<div className='absolute top-0 left-0 flex flex-row-reverse items-center gap-3 max-sm:static' style={{ width: styles.width }}>
					{sortedButtons.map(button => renderButton(button))}
				</div>
			</motion.div>
		</HomeDraggableLayer>
	)
}
