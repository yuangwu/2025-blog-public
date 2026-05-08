import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
// 注意：确保项目存在 @/config/site-content.json 文件，
// 且其中包含 backgroundColors 数组，否则会导致运行时错误。
import siteContent from '@/config/site-content.json'
// 注意：需要确保 ./utils 文件导出了 makeNoise2D 和 rand 两个函数。
import { makeNoise2D, rand } from './utils'

/**
 * 模糊浮动圆形背景组件
 * - 使用类似蓝噪声的间距生成圆形（气泡）
 * - 运动方式 = Perlin/Simplex 流场 + 柔和的分离力
 * - 覆盖率控制：低占用区域吸引力，防止出现大面积空白
 * - 限制在底部区域（默认高度 80%–100% 范围）
 */
export default function BlurredBubblesBackground({
	count = 6,                      // 气泡数量
	colors = siteContent.backgroundColors, // 气泡颜色数组
	minRadius = 250,                // 最小半径（像素）
	maxRadius = 400,                // 最大半径（像素）
	bottomBandStart = 0.8,          // 底部区域的起始比例（0-1，默认从 80% 高度开始）
	speed = 0.12,                   // 基础移动速度
	noiseScale = 0.0008,            // 空间噪声缩放（影响流动复杂度）
	noiseTimeScale = 0.00015,       // 时间噪声缩放（影响流动速度随时间变化）
	targetFps = 6,                  // 目标帧率，用于性能控制
	debugFps = false,               // 是否在控制台输出 FPS 调试信息
	startDelayMs = 1500,            // 移动端延迟启动动画的时间（毫秒）
	regenerateKey = 0               // 外部传入键值，改变时重新生成气泡
}) {
	const ref = useRef<HTMLCanvasElement>(null)
	// 创建二维噪声函数实例，用于流动场计算
	const noise = useRef(makeNoise2D())
	// 保存 requestAnimationFrame 的 ID，便于清理
	const animRef = useRef(0)

	useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')!
		// 获取 CSS 布局尺寸
		let width = (canvas.width = canvas.clientWidth)
		let height = (canvas.height = canvas.clientHeight)

		// 处理设备像素比，保证清晰度，但限制最高为 2 以避免性能问题
		const DPR = Math.min(2, window.devicePixelRatio || 1)
		canvas.width = Math.floor(width * DPR)
		canvas.height = Math.floor(height * DPR)
		ctx.scale(DPR, DPR)

		const effectiveFps = Math.max(1, targetFps)

		// -------------- ResizeObserver 防抖处理（1秒） --------------
		let resizeTimer: number | null = null
		const handleResize: ResizeObserverCallback = () => {
			if (!canvas || !ctx) return
			const nextWidth = canvas.clientWidth
			const nextHeight = canvas.clientHeight
			if (nextWidth === width && nextHeight === height) return
			width = nextWidth
			height = nextHeight
			canvas.width = Math.floor(width * DPR)
			canvas.height = Math.floor(height * DPR)
			// 重置变换矩阵并重新应用缩放
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.scale(DPR, DPR)
			// 重新分配占用网格并重绘
			allocateGrid()
			draw()
		}
		const onResize: ResizeObserverCallback = (...args) => {
			if (resizeTimer !== null) window.clearTimeout(resizeTimer)
			resizeTimer = window.setTimeout(() => {
				handleResize(...args)
				resizeTimer = null
			}, 1000)
		}
		const ro = new ResizeObserver(onResize)
		ro.observe(canvas)

		// -------------- 占用网格（用于覆盖率引导） --------------
		const gridCell = 80 // 网格单元格尺寸（像素）
		let gridCols = 0,
			gridRows = 0,
			grid: Float32Array

		// 根据画布尺寸分配网格
		function allocateGrid() {
			gridCols = Math.max(1, Math.ceil(width / gridCell))
			gridRows = Math.max(1, Math.ceil(height / gridCell))
			grid = new Float32Array(gridCols * gridRows)
		}
		// 在网格中增加某个区域的占用权重
		function stampOccupancy(x: number, y: number, r: number) {
			const c0 = Math.floor((x - r) / gridCell)
			const c1 = Math.floor((x + r) / gridCell)
			const r0 = Math.floor((y - r) / gridCell)
			const r1 = Math.floor((y + r) / gridCell)
			for (let cy = r0; cy <= r1; cy++) {
				for (let cx = c0; cx <= c1; cx++) {
					if (cx < 0 || cy < 0 || cx >= gridCols || cy >= gridRows) continue
					const idx = cy * gridCols + cx
					grid[idx] += 0.5 // 每次增加 0.5 的权重
				}
			}
		}
		// 找到底部区域中占用最低的网格单元，作为吸引力目标
		function lowestOccupancyTarget() {
			const startRow = Math.floor(gridRows * bottomBandStart)
			let bestIdx = startRow * gridCols
			let bestVal = Infinity
			for (let cy = startRow; cy < gridRows; cy++) {
				for (let cx = 0; cx < gridCols; cx++) {
					const idx = cy * gridCols + cx
					const v = grid[idx]
					if (v < bestVal) {
						bestVal = v
						bestIdx = idx
					}
				}
			}
			const ty = (Math.floor(bestIdx / gridCols) + 0.5) * gridCell
			const tx = ((bestIdx % gridCols) + 0.5) * gridCell
			return { tx, ty }
		}
		allocateGrid()

		// -------------- 初始位置生成（类似泊松采样，避免聚集） --------------
		const bubbles: { x: number; y: number; r: number; color: string; vx: number; vy: number; jitter: number; blur: number }[] = []
		const minDist = Math.max(minRadius * 0.2, 80) // 最小间距
		const maxTries = 5000                      // 最大尝试次数，防止无限循环
		let tries = 0
		while (bubbles.length < count && tries < maxTries) {
			tries++
			const r = rand(minRadius, maxRadius)
			// 初始 X 可以在画布外侧一点，便于平滑循环
			const x = rand(-r / 2, width + r / 2)
			// Y 限制在底部区域并略微超出底部
			const y = rand(height * bottomBandStart, height * 1.2)
			let ok = true
			for (let b of bubbles) {
				const dx = b.x - x
				const dy = b.y - y
				// 保证与现有气泡之间的距离不小于 (半径和 * 0.6) 且不小于最小间距
				if (Math.hypot(dx, dy) < (b.r + r) * 0.6 || Math.hypot(dx, dy) < minDist) {
					ok = false
					break
				}
			}
			if (ok) {
				bubbles.push({
					x,
					y,
					r,
					color: colors[bubbles.length % colors.length | 0],
					vx: rand(-0.2, 0.2),
					vy: rand(-0.2, 0.2),
					jitter: rand(0.6, 1.2),
					blur: rand(200, 400)
				})
			}
		}

		// -------------- 动画循环与帧率控制 --------------
		const FRAME_INTERVAL = 1000 / effectiveFps // 每帧之间的理想间隔（毫秒）
		let lastTime = 0
		let accumulatedTime = 0
		let fpsCounter = 0
		let fpsStart = 0

		// 更新物理状态（应用流场、分离力、覆盖率引导和边界约束）
		function updatePhysics(t: number) {
			const { tx, ty } = lowestOccupancyTarget()

			for (let i = 0; i < bubbles.length; i++) {
				const b = bubbles[i]

				// 1) 流场力（通过噪声函数产生平滑的游荡运动）
				const n = noise.current(b.x * noiseScale, b.y * noiseScale + t * noiseTimeScale)
				const angle = n * Math.PI * 2
				const fx = Math.cos(angle) * speed * b.jitter
				const fy = Math.sin(angle) * speed * b.jitter

				// 2) 分离力（防止气泡互相重叠）
				let sx = 0,
					sy = 0
				for (let j = 0; j < bubbles.length; j++)
					if (j !== i) {
						const o = bubbles[j]
						const dx = b.x - o.x
						const dy = b.y - o.y
						const d2 = dx * dx + dy * dy
						const minD = (b.r + o.r) * 0.4
						if (d2 < minD * minD && d2 > 0.001) {
							const d = Math.sqrt(d2)
							const push = (minD - d) / minD // 分离力度 0..1
							sx += (dx / d) * push * 0.8
							sy += (dy / d) * push * 0.8
						}
					}

				// 3) 覆盖率引导（轻微吸引到占用最低的区域）
				const dxT = tx - b.x
				const dyT = ty - b.y
				const dT = Math.hypot(dxT, dyT) + 1e-3
				const cx = (dxT / dT) * 0.05
				const cy = (dyT / dT) * 0.05

				// 4) 垂直区域约束（将气泡限制在底部区域内）
				const bandMin = height * bottomBandStart
				const bandMax = height * 1.5
				let bx = 0,
					by = 0
				if (b.y < bandMin) by += (bandMin - b.y) * 0.01
				if (b.y > bandMax) by -= (b.y - bandMax) * 0.01

				// 合成总力
				b.vx += fx + sx + cx + bx
				b.vy += fy + sy + cy + by

				// 速度阻尼，避免累积过快
				const damping = 0.95
				b.vx *= damping
				b.vy *= damping

				// 速度上限，防止失控
				const maxVel = 2
				const vel = Math.hypot(b.vx, b.vy)
				if (vel > maxVel) {
					b.vx = (b.vx / vel) * maxVel
					b.vy = (b.vy / vel) * maxVel
				}

				// 位置积分
				b.x += b.vx
				b.y += b.vy

				// 水平方向软环绕，避免在边缘堆积
				if (b.x < -b.r - b.blur / 3) b.x = width + b.r + b.blur / 3
				if (b.x > width + b.r + b.blur / 3) b.x = -b.r - b.blur / 3

				// 垂直方向限制在允许范围内，不实现环绕
				b.y = Math.min(Math.max(b.y, bandMin - b.r * 0.25), bandMax + b.r * 0.25)

				// 更新占用网格
				stampOccupancy(b.x, b.y, b.r * 0.6)
			}
		}
		// 绘制所有气泡
		function draw() {
			for (const b of bubbles) {
				ctx.save()
				// 使用 CSS blur 滤镜绘制模糊圆
				ctx.filter = `blur(${b.blur}px)`
				ctx.globalAlpha = 0.8
				ctx.beginPath()
				ctx.fillStyle = b.color
				ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
				ctx.fill()
				ctx.restore()
			}
		}

		// 动画帧回调，包含帧率限制与页面隐藏时暂停
		function frame(t: number) {
			if (!ctx) return

			// 页面隐藏时跳过绘制，但仍注册下一帧以便恢复
			{
				if (document.hidden) {
					animRef.current = requestAnimationFrame(frame)
					return
				}

				// 基于累积时间的帧率限制
				const deltaTime = lastTime ? t - lastTime : 0
				lastTime = t
				accumulatedTime += deltaTime

				if (accumulatedTime < FRAME_INTERVAL) {
					animRef.current = requestAnimationFrame(frame)
					return
				}

				accumulatedTime = 0
			}

			ctx.clearRect(0, 0, width, height)

			updatePhysics(t)

			draw()

			// 可选的 FPS 调试信息
			if (debugFps) {
				if (fpsStart === 0) fpsStart = t
				fpsCounter++
				if (t - fpsStart >= 1000) {
					// eslint-disable-next-line no-console
					console.log('[blurred-bubbles] fps=', fpsCounter, 'target=', effectiveFps)
					fpsCounter = 0
					fpsStart = t
				}
			}

			animRef.current = requestAnimationFrame(frame)
		}

		// 仅在小屏幕（移动端）启动动画循环，桌面端可能只显示静态背景（根据设计决定）
		if (window.innerWidth < 640) {
			setTimeout(() => {
				animRef.current = requestAnimationFrame(frame)
			}, startDelayMs)
		}

		// 绘制初始帧，保证首次渲染有内容
		draw()

		return () => {
			cancelAnimationFrame(animRef.current)
			ro.disconnect()
			if (resizeTimer !== null) window.clearTimeout(resizeTimer)
		}
	}, [colors, regenerateKey]) // 依赖 colors 和 regenerateKey，变化时重新生成气泡

	return (
		<motion.div
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			transition={{ duration: 1 }}
			className='fixed inset-0 z-0 overflow-hidden'
			style={{ filter: 'blur(50px)' }} // 外层额外模糊，增强视觉效果
		>
			<canvas ref={ref} className='h-full w-full' style={{ display: 'block' }} />
		</motion.div>
	)
}
