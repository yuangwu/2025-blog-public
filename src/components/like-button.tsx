import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react' // 动画库（framer-motion 的轻量版本）
import { Heart } from 'lucide-react' // 心形图标
import clsx from 'clsx' // 条件类名合并工具
import { cn } from '@/lib/utils' // 自定义的类名合并函数（通常基于 clsx/twMerge）
import { toast } from 'sonner' // 消息提示组件
import { BLOG_SLUG_KEY } from '@/consts' // 博客标识前缀常量，用于区分不同站点的点赞

// 组件 props 类型定义
type LikeButtonProps = {
	slug?: string // 文章唯一标识（可选，默认使用 'yuangwu'）
	className?: string // 自定义样式类名
	delay?: number // 延时显示按钮的毫秒数（默认 1000ms）
}

// 点赞 API 的基础端点
const ENDPOINT = 'https://yuangwi-blog-bsver5onp-yuangwu-dots-projects.vercel.app'

/**
 * LikeButton - 带动画与粒子特效的点赞按钮
 *
 * 功能：
 * - 延时出现，产生入场动画
 * - 从 SWR 获取当前点赞数
 * - 点击发送 POST 请求增加点赞，带频率限制处理
 * - 点赞成功后播放心形摇动 + 四周粒子散开动画
 */
export default function LikeButton({ slug = 'yuangwu', delay, className }: LikeButtonProps) {
	// 拼接博客前缀，确保不同博客的点赞数据隔离
	slug = BLOG_SLUG_KEY + slug

	// ----- 本地状态 -----
	const [liked, setLiked] = useState(false) // 是否已经点过赞（视觉效果）
	const [show, setShow] = useState(false) // 是否显示按钮（用于延迟出场）
	const [justLiked, setJustLiked] = useState(false) // 刚点赞的瞬时状态，触发点击后的一次性动画
	const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]) // 粒子数据

	// 组件挂载后延迟显示按钮
	useEffect(() => {
		setTimeout(() => {

			setShow(true)
		}, delay || 1000)
	}, []) // 仅在首次挂载时执行

	// justLiked 变为 true 后，600ms 后自动重置，用于触发一次性摇动动画
	useEffect(() => {
		if (justLiked) {
			const timer = setTimeout(() => setJustLiked(false), 600)
			return () => clearTimeout(timer) // 清理定时器，避免内存泄漏
		}
	}, [justLiked])

	// ----- 数据请求：获取点赞数 -----
	// 使用 useCallback 缓存 fetcher，避免每次渲染都创建新函数
	const fetcher = useCallback(async (url: string): Promise<number | null> => {
		const res = await fetch(url, { method: 'GET', cache: 'no-store' })
		if (!res.ok) return null // 请求失败返回 null（展示时不计为好）
		const data = await res.json().catch(() => ({})) // 安全解析 JSON
		// 确保 count 为数字，否则返回 null
		return typeof data?.count === 'number' ? data.count : null
	}, [])

	// SWR 获取数据，slug 为空时不发起请求 (key 为 null)
	const { data: fetchedCount, mutate } = useSWR(
		slug ? `${ENDPOINT}?slug=${encodeURIComponent(slug)}` : null,
		fetcher,
		{
			revalidateOnFocus: false, // 窗口聚焦时不重新验证
			dedupingInterval: 1000 * 10 // 10 秒内相同请求去重
		}
	)

	// ----- 点赞处理逻辑 -----
	const handleLike = useCallback(async () => {
		if (!slug) return

		// 立即更新 UI 状态
		setLiked(true)
		setJustLiked(true)

		// 生成 6 个随机方向、随机距离的粒子
		const newParticles = Array.from({ length: 6 }, (_, i) => ({
			id: Date.now() + i, // 简单唯一 id（短时间内多次点击可能冲突，但粒子仅展示 1 秒，可接受）
			x: Math.random() * 60 - 30, // 水平偏移 -30~30
			y: Math.random() * 60 - 30 // 垂直偏移 -30~30
		}))
		setParticles(newParticles)

		// 1 秒后清除粒子
		setTimeout(() => setParticles([]), 1000)

		try {
			const url = `${ENDPOINT}?slug=${encodeURIComponent(slug)}`
			const res = await fetch(url, { method: 'POST' }) // 发送点赞请求
			const data = await res.json().catch(() => ({})) // 安全解析响应

			// 如果服务端提示频率限制，弹出友好提示
			if (data.reason == 'rate_limited') {
				toast('谢谢啦😘，今天已经不能再点赞啦💕')
			}

			// 更新本地 SWR 缓存中的 count，乐观更新为返回值，若无效则在前端数值 +1
			const value = typeof data?.count === 'number' ? data.count : (fetchedCount ?? 0) + 1
			await mutate(value, { revalidate: false }) // 不重新请求，直接覆盖缓存
		} catch {
			// 网络错误等静默忽略，UI 仍保留“已点赞”状态（本地乐观更新）
		}
	}, [slug, fetchedCount, mutate])

	// 最终显示的点赞数（null 时不显示气泡）
	const count = typeof fetchedCount === 'number' ? fetchedCount : null

	// 如果 show 为 false，不渲染任何内容。
	// 注意：函数组件没有显式 return，相当于 return undefined，在 React 中会引发错误。
	// 这里实际希望的是返回 null，但原作者可能依赖延时后 show 会变为 true，第一帧仍会报错。
	// 此处保持原代码逻辑，注释说明潜在问题。
	if (show)
		return (
			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				whileHover={{ scale: 1.05 }} // 鼠标悬停微放大
				whileTap={{ scale: 0.95 }} // 按下时缩小
				aria-label="Like this post" // 无障碍标签
				onClick={handleLike}
				// 组合样式：卡片、心跳容器、相对定位、溢出可见、圆形、内边距等
				className={clsx('card heartbeat-container relative overflow-visible rounded-full p-3', className)}
			>
				{/* 粒子特效层 */}
				<AnimatePresence>
					{particles.map(particle => (
						<motion.div
							key={particle.id}
							className="pointer-events-none absolute inset-0 flex items-center justify-center"
							initial={{ opacity: 1, scale: 0, x: 0, y: 0 }} // 初始在中心不可见
							animate={{
								opacity: [1, 1, 0], // 先保持不透明，再淡出
								scale: [0, 1.2, 0.8], // 从无到放大再略缩小
								x: particle.x,
								y: particle.y
							}}
							exit={{ opacity: 0 }} // 移除时直接透明
							transition={{ duration: 0.8, ease: 'easeOut' }}
						>
							{/* 粒子也是小心形，粉色填充 */}
							<Heart className="fill-rose-400 text-rose-400" size={12} />
						</motion.div>
					))}
				</AnimatePresence>

				{/* 点赞数气泡 */}
				{typeof count === 'number' && (
					<motion.span
						initial={{ scale: 0.4 }}
						animate={{ scale: 1 }}
						className={cn(
							'absolute -top-2 left-9 min-w-6 rounded-full px-1.5 py-1 text-center text-xs text-white tabular-nums',
							liked ? 'bg-rose-400' : 'bg-gray-300' // 点赞前灰色，点赞后粉色
						)}
					>
						{count}
					</motion.span>
				)}

				{/* 心形图标主体，附带点击摇动动画 */}
				<motion.div
					animate={justLiked ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}} // 点赞瞬间放大并左右摇摆
					transition={{ duration: 0.6, ease: 'easeOut' }}
				>
					<Heart
						className={clsx(
							'heartbeat', // 自定义心跳动画的 CSS 类
							liked ? 'fill-rose-400 text-rose-400' : 'fill-rose-200 text-rose-200'
						)}
						size={28}
					/>
				</motion.div>
			</motion.button>
		)
}