'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * PIXI Application 实例类型（通过 CDN 加载，此处仅定义需要的属性和方法）
 */
interface PixiAppInstance {
	stage: { addChild: (child: unknown) => void }
	view: HTMLCanvasElement
	destroy: (opts?: { removeView?: boolean }) => void
}

/**
 * Live2D 模型实例类型（用于控制模型的位置、缩放等）
 */
interface Live2DModelInstance {
	anchor: { set: (x: number, y: number) => void }
	x: number
	y: number
	scale: { set: (x: number, y: number) => void }
}

/**
 * 需要从 CDN 加载的脚本列表
 * 依次为：PIXI.js 渲染引擎、Live2D Cubism Core、pixi-live2d-display 适配层
 */
const CDN_SCRIPTS = [
	'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.2.0/browser/pixi.min.js',
	'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
	'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'
]

/**
 * Live2D 模型配置文件路径
 * 注意：部署到 Vercel 前，请确保将完整的 Live2D 模型文件（.model3.json、.moc 等）
 * 放置在 public/live2d/ 目录下，否则运行时会提示加载错误。
 */
const MODEL_URL = '/live2d/live2d.model3.json'

/**
 * 动态加载外部 JavaScript 脚本
 * @param src 脚本地址
 * @returns Promise，加载成功时 resolve，失败时 reject
 */
function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// 避免重复加载相同脚本
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve()
			return
		}
		const script = document.createElement('script')
		script.src = src
		script.crossOrigin = 'anonymous' // 允许跨域加载
		script.onload = () => resolve()
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
		document.head.appendChild(script)
	})
}

/**
 * Live2D 查看器组件
 * 会在客户端动态加载所需的 CDN 脚本和模型文件，并在圆形区域内展示 Live2D 模型。
 */
export default function Live2DViewer() {
	// 用于挂载 canvas 的容器引用
	const containerRef = useRef<HTMLDivElement>(null)
	// 加载状态：loading（加载中）、ready（就绪）、error（出错）
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	// 错误信息描述
	const [errorMsg, setErrorMsg] = useState<string>('')

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		let app: PixiAppInstance | null = null

		/**
		 * 初始化 PIXI 和 Live2D 环境，加载并显示模型
		 */
		const init = async () => {
			try {
				// 1. 依次加载所有 CDN 脚本
				for (const src of CDN_SCRIPTS) {
					await loadScript(src)
				}

				// 2. 获取挂载到 window 上的 PIXI 对象
				const PIXI = (window as unknown as { PIXI: unknown }).PIXI
				if (!PIXI) {
					throw new Error('PIXI not found on window')
				}
				// 确保 window.PIXI 存在（有些库要求 window.PIXI）
				;(window as unknown as { PIXI: unknown }).PIXI = PIXI

				// 3. 获取 PIXI Application 和 Live2DModel 构造器
				const PIXIApp = (
					PIXI as { Application: new (opts: { view: HTMLCanvasElement; width?: number; height?: number; backgroundAlpha?: number }) => PixiAppInstance }
				).Application

				const Live2DModel = (PIXI as { live2d?: { Live2DModel: { from: (url: string) => Promise<Live2DModelInstance> } } }).live2d?.Live2DModel

				if (!Live2DModel) {
					throw new Error('PIXI.live2d.Live2DModel not found')
				}

				// 4. 根据容器大小创建 canvas
				const width = container.clientWidth || 500
				const height = container.clientHeight || 500
				const canvas = document.createElement('canvas')
				canvas.style.width = '100%'
				canvas.style.height = '100%'
				canvas.style.display = 'block'
				container.appendChild(canvas)

				// 5. 创建 PIXI 应用实例（背景透明）
				app = new PIXIApp({
					view: canvas,
					width,
					height,
					backgroundAlpha: 0
				})

				// 6. 加载 Live2D 模型并添加到舞台
				const model = await Live2DModel.from(MODEL_URL)
				app.stage.addChild(model)

				// 7. 调整模型位置和缩放（居中显示，缩放可根据实际模型调整）
				model.anchor.set(0.5, 0.5)
				model.x = width / 2
				model.y = height / 2
				model.scale.set(0.25, 0.25)

				setStatus('ready')
			} catch (err) {
				// 捕获所有错误，显示错误信息
				setErrorMsg(err instanceof Error ? err.message : String(err))
				setStatus('error')
			}
		}

		init()

		// 组件卸载时清理资源
		return () => {
			if (app !== null && typeof app === 'object' && 'destroy' in app && typeof app.destroy === 'function') {
				app.destroy({ removeView: true })
			}
			// 清空容器内所有内容（包括 canvas）
			container.innerHTML = ''
		}
	}, [])

	return (
		<div className='relative aspect-square w-full overflow-hidden rounded-full'>
			{/* 画布容器，绝对定位填满父级 */}
			<div ref={containerRef} className='absolute inset-0 h-full w-full' />
			{/* 加载中提示 */}
			{status === 'loading' && (
				<div className='text-secondary absolute inset-0 flex items-center justify-center'>
					加载 Live2D 模型中…
				</div>
			)}
			{/* 错误信息展示 */}
			{status === 'error' && (
				<div className='absolute inset-0 flex items-center justify-center p-4 text-center text-red-500'>
					{errorMsg}
				</div>
			)}
		</div>
	)
}
