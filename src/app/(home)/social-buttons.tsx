// 从自定义 hook 中获取中心点坐标（用于定位组件）
import { useCenterStore } from '@/hooks/use-center'
// 导入各社交平台 SVG 图标组件
import GithubSVG from '@/svgs/github.svg'
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
// 导入动画延迟、卡片间距常量
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
// 全局配置状态管理
import { useConfigStore } from './stores/config-store'
// 动画和过渡组件
import { motion, AnimatePresence } from 'motion/react'
// React hooks
import { useEffect, useState, useMemo, useRef } from 'react'
import type React from 'react'
// 轻提示库
import { toast } from 'sonner'
// 响应式尺寸检测 hook
import { useSize } from '@/hooks/use-size'
// 可拖拽图层容器组件
import { HomeDraggableLayer } from './home-draggable-layer'
// 将子节点渲染到 body 的 Portal
import { createPortal } from 'react-dom'

// 所有支持的社交按钮类型
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

// 单个社交按钮的配置结构
interface SocialButtonConfig {
	id: string                 // 唯一标识
	type: SocialButtonType     // 按钮类型
	value: string              // 链接或内容值
	label?: string             // 显示文本标签（可选）
	order: number              // 排序权重
}

// 默认导出：社交按钮组件
export default function SocialButtons() {
	// 获取中心坐标
	const center = useCenterStore()
	// 获取卡片样式配置和站点内容配置
	const { cardStyles, siteContent } = useConfigStore()
	// 响应式断点检测及是否已完成初始化
	const { maxSM, init } = useSize()
	// 社交按钮容器样式
	const styles = cardStyles.socialButtons
	// 主卡片样式（用于计算默认相对位置）
	const hiCardStyles = cardStyles.hiCard

	// 小屏幕且已初始化时，order 和 delay 为 0，否则使用配置值
	const order = maxSM && init ? 0 : styles.order
	const delay = maxSM && init ? 0 : 100

	// 从站点内容中取出社交按钮列表，并按 order 排序
	const sortedButtons = useMemo(() => {
		const buttons = (siteContent.socialButtons || []) as SocialButtonConfig[]
		return [...buttons].sort((a, b) => a.order - b.order)
	}, [siteContent.socialButtons])

	// 记录每个按钮是否已显示（用于入场动画）
	const [showStates, setShowStates] = useState<Record<string, boolean>>({})
	// 记录每个按钮的下拉弹窗是否打开
	const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
	// 存储各下拉框 DOM 引用
	const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
	// 存储各按钮 DOM 引用
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

	// 入场动画时序控制：按 order 和排序后的索引逐个显示按钮
	useEffect(() => {
		// 基础延迟：order * 动画延迟常量（秒转毫秒）
		const baseDelay = order * ANIMATION_DELAY * 1000

		sortedButtons.forEach((button, index) => {
			const showDelay = baseDelay + index * delay
			setTimeout(() => {
				setShowStates(prev => ({ ...prev, [button.id]: true }))
			}, showDelay)
		})

		// 容器自身的显示
		setTimeout(() => {
			setShowStates(prev => ({ ...prev, container: true }))
		}, baseDelay)
	}, [order, delay, sortedButtons])

	// 点击外部关闭下拉弹窗的逻辑
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			Object.keys(openDropdowns).forEach(buttonId => {
				if (openDropdowns[buttonId]) {
					const buttonRef = buttonRefs.current[buttonId]
					const dropdownRef = dropdownRefs.current[buttonId]
					// 如果点击的目标不在按钮或下拉框内，则关闭下拉框
					if (buttonRef && !buttonRef.contains(target) && dropdownRef && !dropdownRef.contains(target)) {
						setOpenDropdowns(prev => ({ ...prev, [buttonId]: false }))
					}
				}
			})
		}

		// 当存在任何打开的下拉框时才绑定全局监听
		if (Object.values(openDropdowns).some(Boolean)) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => {
				document.removeEventListener('mousedown', handleClickOutside)
			}
		}
	}, [openDropdowns])

	// 计算容器最终坐标 x, y
	// 优先使用显式偏移量，否则以主卡片右上角为基准并加上间距
	const x = styles.offsetX !== null
		? center.x + styles.offsetX
		: center.x + hiCardStyles.width / 2 - styles.width
	const y = styles.offsetY !== null
		? center.y + styles.offsetY
		: center.y + hiCardStyles.height / 2 + CARD_SPACING

	// 如果容器尚未到显示时机，返回 null
	if (!showStates.container) return null

	// 类型到图标组件的映射
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
		link: () => null  // link 类型无图标
	}

	// 渲染单个按钮
	const renderButton = (button: SocialButtonConfig) => {
		// 该按钮还未到显示时间则返回 null
		if (!showStates[button.id]) return null

		// 所有按钮通用的动画属性
		const commonProps = {
			initial: { opacity: 0, scale: 0.6 } as const,
			animate: { opacity: 1, scale: 1 } as const,
			whileHover: { scale: 1.05 } as const,
			whileTap: { scale: 0.95 } as const
		}

		const Icon = iconMap[button.type]
		const hasLabel = Boolean(button.label)
		const iconSize = hasLabel ? 'size-6' : 'size-8'

		// GitHub 按钮：特殊样式处理
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

		// 邮箱、微信、QQ 按钮：点击复制内容
		if (button.type === 'email' || button.type === 'wechat' || button.type === 'qq') {
			const messageMap: Record<'email' | 'wechat' | 'qq', string> = {
				email: '邮箱已复制到剪贴板',
				wechat: '微信号已复制到剪贴板',
				qq: 'QQ号已复制到剪贴板'
			}

			// 判断 value 是否为图片路径
			const isImagePath = button.value.startsWith('/images/social-buttons/')
			const isOpen = openDropdowns[button.id] || false

			// 如果是图片路径且为微信或QQ，点击展示二维码下拉弹窗
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
						{/* 使用 Portal 将二维码弹出层渲染到 body */}
						{typeof window !== 'undefined' &&
							createPortal(
								<AnimatePresence>
									{isOpen && (
										<>
											{/* 透明遮罩层，点击关闭 */}
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
													// 定位在按钮正下方
													top: buttonRefs.current[button.id]
														? `${buttonRefs.current[button.id]!.getBoundingClientRect().bottom + 8}px`
														: '0px',
													left: buttonRefs.current[button.id]
														? `${buttonRefs.current[button.id]!.getBoundingClientRect().left}px`
														: '0px',
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

			// 普通邮箱/微信/QQ（文本值），点击复制并提示
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

		// link 类型：纯文字链接
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

		// 其他社交平台按钮（X, TG, Facebook 等）：图标 + 可选标签
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
		// 使用可拖拽图层包裹，整个块可响应拖拽
		<HomeDraggableLayer cardKey='socialButtons' x={x} y={y} width={styles.width} height={styles.height}>
			<motion.div className='absolute max-sm:static' animate={{ left: x, top: y }} initial={{ left: x, top: y }}>
				<div className='absolute top-0 left-0 flex flex-row-reverse items-center gap-3 max-sm:static' style={{ width: styles.width }}>
					{/* 从右向左渲染排序后的按钮（flex-row-reverse）*/}
					{sortedButtons.map(button => renderButton(button))}
				</div>
			</motion.div>
		</HomeDraggableLayer>
	)
}