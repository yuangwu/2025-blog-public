import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
// 引入 motion 动画库的 React 组件
import { motion, AnimatePresence } from 'motion/react'
// 引入心形图标
import { Heart } from 'lucide-react'
// 用于拼接类名
import clsx from 'clsx'
// 工具函数，合并 Tailwind 类名
import { cn } from '@/lib/utils'
// 弹出提示
import { toast } from 'sonner'
// 博客标识前缀常量
import { BLOG_SLUG_KEY } from '@/consts'

// 点赞按钮组件的 Props 类型定义
type LikeButtonProps = {
	slug?: string      // 文章的标识符，默认值为 'yysuni'
	className?: string // 附加的自定义类名
	delay?: number     // 按钮出现的延迟时间（毫秒）
}

// 点赞 API 的地址
const ENDPOINT = 'https://blog-liker.yysuni1001.workers.dev/api/like'

export default function LikeButton({ slug = 'yysuni', delay, className }: LikeButtonProps) {
	// 拼接完整的文章标识，加上博客前缀避免冲突
	slug = BLOG_SLUG_KEY + slug

	// 是否已点赞（用于控制爱心填充颜色和计数背景色）
	const [liked, setLiked] = useState(false)
	// 是否显示按钮（延迟出现用）
	const [show, setShow] = useState(false)
	// 刚完成点赞，用于触发心跳动画
	const [justLiked, setJustLiked] = useState(false)
	// 点赞时飞出的粒子特效数据
	const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

	// 组件挂载后延迟显示按钮
	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, delay || 1000)
	}, []) // 仅在挂载时执行一次

	// 刚点赞状态持续时间结束后自动重置
	useEffect(() => {
		if (justLiked) {
			const timer = setTimeout(() => setJustLiked(false), 600)
			return () => clearTimeout(timer) // 清理定时器，防止内存泄漏
		}
	}, [justLiked])

	// 数据请求器，用于 SWR 获取点赞数
	const fetcher = useCallback(async (url: string): Promise<number | null> => {
		const res = await fetch(url, { method: 'GET', cache: 'no-store' }) // 禁用缓存，确保拿到最新计数
		if (!res.ok) return null
		const data = await res.json().catch(() => ({})) // 安全解析 JSON
		return typeof data?.count === 'number' ? data.count : null
	}, [])

	// 使用 SWR 管理点赞数据，slug 为空时不发起请求（这里 slug 总是有值）
	const { data: fetchedCount, mutate } = useSWR(
		slug ? `${ENDPOINT}?slug=${encodeURIComponent(slug)}` : null,
		fetcher,
		{
			revalidateOnFocus: false,      // 窗口获得焦点时不重新验证
			dedupingInterval: 1000 * 10    // 10 秒内不重复请求
		}
	)

	// 处理点赞点击事件
	const handleLike = useCallback(async () => {
		if (!slug) return // 无标识时直接返回
		setLiked(true)    // 标记为已点赞
		setJustLiked(true) // 触发爱心弹跳动画

		// 生成 6 个随机方向的粒子
		const newParticles = Array.from({ length: 6 }, (_, i) => ({
			id: Date.now() + i,
			x: Math.random() * 60 - 30, // 水平偏移范围 -30~30
			y: Math.random() * 60 - 30  // 垂直偏移范围 -30~30
		}))
		setParticles(newParticles)

		// 动画结束后清除粒子
		setTimeout(() => setParticles([]), 1000)

		try {
			// 发送 POST 请求增加点赞数
			const url = `${ENDPOINT}?slug=${encodeURIComponent(slug)}`
			const res = await fetch(url, { method: 'POST' })
			const data = await res.json().catch(() => ({}))
			// 如果被限流，给出友好提示
			if (data.reason == 'rate_limited') toast('谢谢啦😘，今天已经不能再点赞啦💕')
			// 使用服务端返回的 count，如果不可用则在前端本地计数 +1
			const value = typeof data?.count === 'number' ? data.count : (fetchedCount ?? 0) + 1
			// 乐观更新 SWR 缓存，不需要重新请求
			await mutate(value, { revalidate: false })
		} catch {
			// 忽略网络错误，不做任何处理
		}
	}, [slug, fetchedCount, mutate])

	// 将获取到的点赞数标准化（无效时显示 null）
	const count = typeof fetchedCount === 'number' ? fetchedCount : null

	// 只有在延迟结束后才渲染按钮
	if (show)
		return (
			<motion.button
				// 入场动画：从透明缩小到完整大小
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				whileHover={{ scale: 1.05 }}  // 悬停放大
				whileTap={{ scale: 0.95 }}    // 点击缩小
				aria-label='Like this post'    // 无障碍标签
				onClick={handleLike}
				className={clsx(
					'card heartbeat-container relative overflow-visible rounded-full p-3',
					className
				)}
			>
				{/* 粒子飞出动画，使用 AnimatePresence 处理退出 */}
				<AnimatePresence>
					{particles.map(particle => (
						<motion.div
							key={particle.id}
							className='pointer-events-none absolute inset-0 flex items-center justify-center'
							initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
							animate={{
								opacity: [1, 1, 0],       // 从不透明到消失
								scale: [0, 1.2, 0.8],     // 放大再缩小
								x: particle.x,            // 随机水平位移
								y: particle.y             // 随机垂直位移
							}}
							exit={{ opacity: 0 }}         // 退出时淡出
							transition={{ duration: 0.8, ease: 'easeOut' }}
						>
							{/* 粒子本身是一个填充的玫红色小心形 */}
							<Heart className='fill-rose-400 text-rose-400' size={12} />
						</motion.div>
					))}
				</AnimatePresence>

				{/* 点赞数徽标，有数据时才显示 */}
				{typeof count === 'number' && (
					<motion.span
						initial={{ scale: 0.4 }}
						animate={{ scale: 1 }}
						className={cn(
							'absolute -top-2 left-9 min-w-6 rounded-full px-1.5 py-1 text-center text-xs text-white tabular-nums',
							liked ? 'bg-rose-400' : 'bg-gray-300' // 已点赞则玫红背景，否则灰色
						)}
					>
						{count}
					</motion.span>
				)}

				{/* 主心形图标，刚点赞时会有缩放和旋转的弹跳动画 */}
				<motion.div
					animate={
						justLiked
							? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] }
							: {}
					}
					transition={{ duration: 0.6, ease: 'easeOut' }}
				>
					<Heart
						className={clsx(
							'heartbeat',
							liked
								? 'fill-rose-400 text-rose-400'   // 已点赞填充玫红色
								: 'fill-rose-200 text-rose-200'   // 未点赞浅玫红
						)}
						size={28}
					/>
				</motion.div>
			</motion.button>
		)
}
