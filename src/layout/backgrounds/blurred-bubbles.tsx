import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'             // Framer Motion 的 React 封装
import siteContent from '@/config/site-content.json' // 站点配置（例如颜色数组）
import { makeNoise2D, rand } from './utils'       // 自定义的 Perlin/Simplex 噪声生成器 和 随机函数

/**
 * Blurred Floating Circles Background
 * - Circles spawn with blue-noise-ish spacing
 * - Movement = Perlin/Simplex flow field + soft separation
 * - Coverage control: low-occupancy attraction prevents big empty holes
 * - Constrained to bottom band (e.g. 55%–100% height)
 */
export default function BlurredBubblesBackground({
  count = 6,               // 气泡数量
  colors = siteContent.backgroundColors, // 颜色列表
  minRadius = 250,         // 气泡最小半径 (px)
  maxRadius = 400,         // 气泡最大半径 (px)
  bottomBandStart = 0.8,   // 垂直方向底部区域起始比例（0.8 表示从 80% 高度开始）
  speed = 0.12,            // 基础移动速度系数
  noiseScale = 0.0008,     // 空间噪声缩放（值越小，流场变化越平缓）
  noiseTimeScale = 0.00015,// 时间噪声缩放（值越小，随时间的流动变化越慢）
  targetFps = 6,           // 目标帧率（降低性能消耗）
  debugFps = false,        // 是否在控制台打印实际 FPS
  startDelayMs = 1500,     // 移动端首次启动延迟（避免页面加载时卡顿）
  regenerateKey = 0        // 外部传入的 key，改变时强制重新生成所有气泡
}) {
  const ref = useRef<HTMLCanvasElement>(null)     // canvas 引用
  const noise = useRef(makeNoise2D())             // 创建并保存一个二维噪声生成器，避免重复初始化
  const animRef = useRef(0)                       // requestAnimationFrame 的 id，用于清理

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let width = (canvas.width = canvas.clientWidth)    // 初始逻辑宽度
    let height = (canvas.height = canvas.clientHeight)

    // 考虑设备像素比（DPR），提高清晰度
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(width * DPR)
    canvas.height = Math.floor(height * DPR)
    ctx.scale(DPR, DPR) // 让绘图坐标系按逻辑像素工作

    const effectiveFps = Math.max(1, targetFps)   // 保证至少 1 fps

    // --- ResizeObserver（带 1 秒防抖） ---
    let resizeTimer: number | null = null
    const handleResize: ResizeObserverCallback = () => {
      if (!canvas || !ctx) return
      const nextWidth = canvas.clientWidth
      const nextHeight = canvas.clientHeight
      // 尺寸未变则跳过
      if (nextWidth === width && nextHeight === height) return
      width = nextWidth
      height = nextHeight
      // 更新 Canvas 实际像素尺寸，并重新设置 DPR 缩放
      canvas.width = Math.floor(width * DPR)
      canvas.height = Math.floor(height * DPR)
      ctx.setTransform(1, 0, 0, 1, 0, 0) // 重置变换矩阵
      ctx.scale(DPR, DPR)
      // 重新分配占位网格（因为尺寸变了）
      allocateGrid()
      draw() // 立即重绘一帧
    }
    const onResize: ResizeObserverCallback = (...args) => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        handleResize(...args)
        resizeTimer = null
      }, 1000) // 1 秒防抖
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)

    // ---------------- 占位网格（Occupancy Grid） ----------------
    // 用于引导气泡向『低占用』区域移动，避免出现大块空白
    const gridCell = 80 // 每个网格单元格的大小（像素）
    let gridCols = 0,
      gridRows = 0,
      grid: Float32Array   // 一维数组，存储每个单元格的占用值

    function allocateGrid() {
      gridCols = Math.max(1, Math.ceil(width / gridCell))
      gridRows = Math.max(1, Math.ceil(height / gridCell))
      grid = new Float32Array(gridCols * gridRows) // 初始全 0
    }
    // 在气泡周围『盖章』，增加对应单元格的占用值
    function stampOccupancy(x: number, y: number, r: number) {
      const c0 = Math.floor((x - r) / gridCell)
      const c1 = Math.floor((x + r) / gridCell)
      const r0 = Math.floor((y - r) / gridCell)
      const r1 = Math.floor((y + r) / gridCell)
      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          if (cx < 0 || cy < 0 || cx >= gridCols || cy >= gridRows) continue
          const idx = cy * gridCols + cx
          grid[idx] += 0.5 // 每次累加 0.5 的权重，随时间增加密度
        }
      }
    }
    // 找出底部区域中占用值最低的单元格，返回其中心坐标
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
    allocateGrid() // 初次分配

    // ------------------ 气泡初始化 ------------------
    // 使用类似泊松盘采样的方法，避免气泡之间一开始就过度重叠
    const bubbles: {
      x: number; y: number; r: number; color: string;
      vx: number; vy: number; jitter: number; blur: number
    }[] = []
    const minDist = Math.max(minRadius * 0.2, 80) // 最小间距，防止过分拥挤
    const maxTries = 5000
    let tries = 0
    while (bubbles.length < count && tries < maxTries) {
      tries++
      const r = rand(minRadius, maxRadius)
      // 初始位置落在底部区域，并允许部分超出画布上方/右方，营造出界模糊效果
      const x = rand(-r / 2, width + r / 2)
      const y = rand(height * bottomBandStart, height * 1.2)
      let ok = true
      for (let b of bubbles) {
        const dx = b.x - x
        const dy = b.y - y
        // 两个气泡不能靠得太近（半径和的 0.6 倍 或 最小间距）
        if (Math.hypot(dx, dy) < (b.r + r) * 0.6 || Math.hypot(dx, dy) < minDist) {
          ok = false
          break
        }
      }
      if (ok) {
        bubbles.push({
          x, y, r,
          color: colors[bubbles.length % colors.length | 0], // 循环使用颜色
          vx: rand(-0.2, 0.2), // 初始随机速度
          vy: rand(-0.2, 0.2),
          jitter: rand(0.6, 1.2), // 每个气泡自己的运动扰动系数
          blur: rand(200, 400)    // 每个气泡的模糊半径 (px)
        })
      }
    }

    // ---------------- 动画循环（帧率控制） ----------------
    const FRAME_INTERVAL = 1000 / effectiveFps // 目标帧间隔 (ms)
    let lastTime = 0
    let accumulatedTime = 0
    // 调试用 FPS 计数器
    let fpsCounter = 0
    let fpsStart = 0

    /** 更新物理状态 */
    function updatePhysics(t: number) {
      // 获取当前最低占用指引点
      const { tx, ty } = lowestOccupancyTarget()

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]

        // 1) 流场驱动力（使用 Perlin/Simplex 噪声产生平滑方向场）
        const n = noise.current(b.x * noiseScale, b.y * noiseScale + t * noiseTimeScale)
        const angle = n * Math.PI * 2         // 噪声值映射到 [0, 2π] 方向
        const fx = Math.cos(angle) * speed * b.jitter
        const fy = Math.sin(angle) * speed * b.jitter

        // 2) 分离力（避免气泡挤在一起）
        let sx = 0, sy = 0
        for (let j = 0; j < bubbles.length; j++) {
          if (j !== i) {
            const o = bubbles[j]
            const dx = b.x - o.x
            const dy = b.y - o.y
            const d2 = dx * dx + dy * dy
            const minD = (b.r + o.r) * 0.4           // 期望的最小间距
            if (d2 < minD * minD && d2 > 0.001) {
              const d = Math.sqrt(d2)
              const push = (minD - d) / minD         // 距离越近，推动力越强 (0~1)
              sx += (dx / d) * push * 0.8
              sy += (dy / d) * push * 0.8
            }
          }
        }

        // 3) 低占用区域吸引（让气泡慢慢填补空白）
        const dxT = tx - b.x
        const dyT = ty - b.y
        const dT = Math.hypot(dxT, dyT) + 1e-3      // 避免除零
        const cx = (dxT / dT) * 0.05                 // 温柔地拉向目标
        const cy = (dyT / dT) * 0.05

        // 4) 垂直区域约束（将气泡限制在底部条带附近）
        const bandMin = height * bottomBandStart
        const bandMax = height * 1.5
        let bx = 0, by = 0
        if (b.y < bandMin) by += (bandMin - b.y) * 0.01   // 向上推回
        if (b.y > bandMax) by -= (b.y - bandMax) * 0.01   // 向下推回

        // 合成所有力，更新速度
        b.vx += fx + sx + cx + bx
        b.vy += fy + sy + cy + by

        // 速度阻尼，防止累积过大
        const damping = 0.95
        b.vx *= damping
        b.vy *= damping

        // 限制最大速度，避免气泡飞出太远
        const maxVel = 2
        const vel = Math.hypot(b.vx, b.vy)
        if (vel > maxVel) {
          b.vx = (b.vx / vel) * maxVel
          b.vy = (b.vy / vel) * maxVel
        }

        // 更新位置
        b.x += b.vx
        b.y += b.vy

        // 水平方向循环滚动（软换边），避免气泡长期聚集在边缘
        if (b.x < -b.r - b.blur / 3) b.x = width + b.r + b.blur / 3
        if (b.x > width + b.r + b.blur / 3) b.x = -b.r - b.blur / 3

        // 垂直方向上则硬限制，并略微放宽边界
        b.y = Math.min(Math.max(b.y, bandMin - b.r * 0.25), bandMax + b.r * 0.25)

        // 每次更新后重新记录占用
        stampOccupancy(b.x, b.y, b.r * 0.6)
      }
    }

    /** 绘制气泡（使用大模糊半径） */
    function draw() {
      for (const b of bubbles) {
        ctx.save()
        ctx.filter = `blur(${b.blur}px)` // 每个气泡不同模糊程度，增加层次感
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.fillStyle = b.color
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    /** 动画帧入口（带帧率限制） */
    function frame(t: number) {
      if (!ctx) return

      // 若页面隐藏，跳过更新但保持动画循环轮询
      if (document.hidden) {
        animRef.current = requestAnimationFrame(frame)
        return
      }

      const deltaTime = lastTime ? t - lastTime : 0
      lastTime = t
      accumulatedTime += deltaTime

      // 还没到下一帧的时间间隔，直接等待下一帧
      if (accumulatedTime < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(frame)
        return
      }

      accumulatedTime = 0 // 重置累积时间，执行本帧更新

      ctx.clearRect(0, 0, width, height) // 清空画布

      updatePhysics(t) // 更新位置
      draw()           // 绘制

      // 可选的 FPS 调试输出
      if (debugFps) {
        if (fpsStart === 0) fpsStart = t
        fpsCounter++
        if (t - fpsStart >= 1000) {
          console.log('[blurred-bubbles] fps=', fpsCounter, 'target=', effectiveFps)
          fpsCounter = 0
          fpsStart = t
        }
      }

      animRef.current = requestAnimationFrame(frame)
    }

    // 移动端延迟启动动画，避免与首屏渲染竞争资源
    if (window.innerWidth < 640) {
      setTimeout(() => {
        animRef.current = requestAnimationFrame(frame)
      }, startDelayMs)
    } else {
      // 桌面端直接开始
      animRef.current = requestAnimationFrame(frame)
    }

    draw() // 先绘制一帧静态画面，避免 Canvas 空白

    // 清理：取消动画、断开 ResizeObserver、清除定时器
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      if (resizeTimer !== null) window.clearTimeout(resizeTimer)
    }
  }, [colors, regenerateKey]) // 当颜色或外部 key 变化时，完全重新初始化

  // 外层容器：fixed 覆盖全屏，z-index 底层，应用了一个额外的模糊滤镜以整体柔化
  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className='fixed inset-0 z-0 overflow-hidden'
      style={{ filter: 'blur(50px)' }}
    >
      <canvas ref={ref} className='h-full w-full' style={{ display: 'block' }} />
    </motion.div>
  )
}