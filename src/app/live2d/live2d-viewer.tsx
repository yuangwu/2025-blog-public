'use client' // 声明这是一个客户端组件（用于 Next.js App Router），仅在浏览器端运行

import { useEffect, useRef, useState } from 'react'

/**
 * PIXI Application 实例的类型描述  
 * 由于通过 CDN 加载脚本，没有 TypeScript 类型包，这里手动声明需要的属性和方法
 */
interface PixiAppInstance {
	stage: { addChild: (child: unknown) => void } // 用于添加显示对象的舞台
	view: HTMLCanvasElement // PIXI 渲染对应的 canvas 元素
	destroy: (opts?: { removeView?: boolean }) => void // 销毁应用实例的方法
}

/**
 * Live2D 模型实例的类型描述  
 * 用于定位、缩放等基本操作
 */
interface Live2DModelInstance {
	anchor: { set: (x: number, y: number) => void } // 设置模型的锚点（旋转/缩放中心）
	x: number // 模型在舞台上的 x 坐标
	y: number // 模型在舞台上的 y 坐标
	scale: { set: (x: number, y: number) => void } // 设置模型缩放比例
}

// 需要从 CDN 加载的三个脚本：PIXI 核心、Cubism 核心、Live2D 显示插件(cubism4)
const CDN_SCRIPTS = [
	'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.2.0/browser/pixi.min.js',
	'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
	'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'
]

// 模型配置文件路径，位于 public/live2d/ 下
const MODEL_URL = '/live2d/live2d.model3.json'

/**
 * 动态加载外部 JavaScript 脚本
 * 会检查页面中是否已存在相同 src 的 script 标签，避免重复加载
 * @param src 脚本的 URL
 * @returns 加载完成的 Promise，失败则 reject
 */
function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// 如果已经存在相同 src 的脚本标签，直接 resolve
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve()
			return
		}
		const script = document.createElement('script')
		script.src = src
		script.crossOrigin = 'anonymous' // 允许跨域
		script.onload = () => resolve()
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
		document.head.appendChild(script)
	})
}

/**
 * Live2D 查看器组件
 * 负责加载并显示一个 Live2D 模型，圆形裁剪容器中居中展示
 */
export default function Live2DViewer() {
	// 用于挂载 canvas 的容器引用
	const containerRef = useRef<HTMLDivElement>(null)
	// 组件状态：loading -> 脚本和模型加载中，ready -> 已显示，error -> 出错
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	// 错误信息文本
	const [errorMsg, setErrorMsg] = useState<string>('')

	useEffect(() => {
		const container = containerRef.current
		if (!container) return // 容器不存在则退出

		let app: PixiAppInstance | null = null // 保存 PIXI 应用实例，用于清理

		const init = async () => {
			try {
				// 顺序加载所有依赖脚本
				for (const src of CDN_SCRIPTS) {
					await loadScript(src)
				}

				// 加载完成后 PIXI 会挂载到 window 上
				const PIXI = (window as unknown as { PIXI: unknown }).PIXI
				if (!PIXI) {
					throw new Error('PIXI not found on window')
				}
				// 确保 window.PIXI 存在（pixi-live2d-display 会从这里读取）
				;(window as unknown as { PIXI: unknown }).PIXI = PIXI

				// 从 PIXI 对象中获取 Application 构造函数
				const PIXIApp = (
					PIXI as { Application: new (opts: { view: HTMLCanvasElement; width?: number; height?: number; backgroundAlpha?: number }) => PixiAppInstance }
				).Application

				// 获取 Live2DModel.from 静态方法，用于异步加载模型
				const Live2DModel = (PIXI as { live2d?: { Live2DModel: { from: (url: string) => Promise<Live2DModelInstance> } } }).live2d?.Live2DModel

				if (!Live2DModel) {
					throw new Error('PIXI.live2d.Live2DModel not found')
				}

				// 使用容器的尺寸，或降级为默认 500×500
				const width = container.clientWidth || 500
				const height = container.clientHeight || 500
				// 创建 canvas 元素并设置样式以填充容器
				const canvas = document.createElement('canvas')
				canvas.style.width = '100%'
				canvas.style.height = '100%'
				canvas.style.display = 'block'
				container.appendChild(canvas)

				// 创建 PIXI Application，背景透明
				app = new PIXIApp({
					view: canvas,
					width,
					height,
					backgroundAlpha: 0
				})

				// 异步加载 Live2D 模型
				const model = await Live2DModel.from(MODEL_URL)
				// 将模型添加到舞台
				app.stage.addChild(model)

				// 设置锚点为中心，便于水平和垂直居中定位
				model.anchor.set(0.5, 0.5)
				// 模型移动到舞台中心
				model.x = width / 2
				model.y = height / 2
				// 缩放到合适的大小（可根据实际模型调整）
				model.scale.set(0.25, 0.25)

				// 标记为加载成功
				setStatus('ready')
			} catch (err) {
				// 捕获任意错误，显示错误信息
				setErrorMsg(err instanceof Error ? err.message : String(err))
				setStatus('error')
			}
		}

		init()

		// 清理函数：组件卸载时销毁 PIXI 应用并清空容器
		return () => {
			if (app !== null && typeof app === 'object' && 'destroy' in app && typeof app.destroy === 'function') {
				// 调用 destroy 并移除创建的 canvas
				app.destroy({ removeView: true })
			}
			container.innerHTML = '' // 清空容器
		}
	}, []) // 空依赖数组，仅在组件挂载时执行一次

	return (
		// 外层容器：相对定位、宽高 1:1 正方形容器，裁剪为圆形
		<div className='relative aspect-square w-full overflow-hidden rounded-full'>
			{/* canvas 的实际容器，绝对定位填满外层 */}
			<div ref={containerRef} className='absolute inset-0 h-full w-full' />
			{/* 加载中提示 */}
			{status === 'loading' && <div className='text-secondary absolute inset-0 flex items-center justify-center'>加载 Live2D 模型中…</div>}
			{/* 错误信息展示 */}
			{status === 'error' && <div className='absolute inset-0 flex items-center justify-center p-4 text-center text-red-500'>{errorMsg}</div>}
		</div>
	)
}