'use client' 
// Next.js 的客户端组件声明，表示该组件仅在客户端渲染，可使用浏览器 API 和事件监听

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils' // 工具函数，用于拼接 className
import { hexToHsva, hsvaToHex, hsvToHsl, clamp, toFixed } from '@/lib/color' // 颜色转换工具

// 组件的 Props 定义
interface ColorPickerPanelProps {
	value: string            // 当前颜色值（HEX 字符串）
	onChange?: (color: string) => void // 颜色变化回调
	style?: React.CSSProperties
	className?: string
}

// 鼠标左键的 event.button 值，用于判断是否左键点击
const MOUSE_LEFT = 0

export function ColorPickerPanel({ value, onChange, style, className }: ColorPickerPanelProps) {
	// ---- 状态定义 ----
	const [show, setShow] = useState(false) // 控制面板可见性（初始隐藏，初始化完成后显示，避免布局闪烁）
	const [hueOffset, setHueOffset] = useState(0) // 色相滑块上的水平偏移（像素）
	const [alphaOffset, setAlphaOffset] = useState(255) // 透明度滑块上的水平偏移（像素，初始 255 表示完全不透明）
	const [saturationOffset, setSaturationOffset] = useState(255) // 饱和度在二维拾色器中的 x 偏移（像素）
	const [brightOffset, setBrightOffset] = useState(0) // 亮度在二维拾色器中的 y 偏移（像素，0 代表顶部/最亮）

	// ---- DOM 引用 ----
	const hueRef = useRef<HTMLDivElement>(null) // 色相条容器
	const pickerRef = useRef<HTMLDivElement>(null) // 饱和度-亮度二维拾色区
	const alphaRef = useRef<HTMLDivElement>(null) // 透明度条容器

	// 各种拖拽激活状态，用于标识当前正在拖拽哪个滑块
	const [hueActive, setHueActive] = useState(false)
	const [alphaActive, setAlphaActive] = useState(false)
	const [saturationActive, setSaturationActive] = useState(false)
	const [brightActive, setBrightActive] = useState(false)

	// 记录上一次输出的 hex 值，用于去重，避免重复触发 onChange
	const prevHexRef = useRef<string>(value)

	// ---- 初始化：根据外部传入的 value 设置各滑块的初始位置 ----
	useEffect(() => {
		if (value) {
			const hsva = hexToHsva(value) // 将 HEX 转为 HSVA 对象
			prevHexRef.current = value
			// 使用 setTimeout 确保 DOM 已经挂载，能获取到元素的宽高
			setTimeout(() => {
				if (hueRef.current && pickerRef.current && alphaRef.current) {
					const hueWidth = hueRef.current.getBoundingClientRect().width
					const pickerWidth = pickerRef.current.getBoundingClientRect().width
					const pickerHeight = pickerRef.current.getBoundingClientRect().height
					const alphaWidth = alphaRef.current.getBoundingClientRect().width

					// 根据 HSVA 的比例换算成像素偏移
					setHueOffset((hsva.h / 360) * hueWidth)
					setSaturationOffset(hsva.s * pickerWidth)
					setBrightOffset((1 - hsva.v) * pickerHeight) // 亮度从顶部(1)到底部(0)，偏移则从上往下
					setAlphaOffset(hsva.a * alphaWidth)
					setShow(true) // 初始化完成，显示面板
				}
			}, 0)
		}
	}, []) // 仅在组件挂载时执行一次

	// ---- 根据当前偏移量计算颜色属性 (useMemo 用于派生计算) ----
	const hue = useMemo(() => {
		if (hueRef.current) {
			const { width } = hueRef.current.getBoundingClientRect()
			return toFixed((hueOffset / width) * 360) // 将像素偏移映射为 0-360 的色相角度
		}
		return 0
	}, [hueOffset, hueRef.current])

	const alpha = useMemo(() => {
		if (alphaRef.current) {
			const { width } = alphaRef.current.getBoundingClientRect()
			return clamp(toFixed(alphaOffset / width, 4), 0, 1) // 像素 -> 0-1 的透明度，限制范围
		}
		return 1
	}, [alphaOffset, alphaRef.current])

	const saturation = useMemo(() => {
		if (pickerRef.current) {
			const { width } = pickerRef.current.getBoundingClientRect()
			return clamp(toFixed(saturationOffset / width, 4), 0, 1)
		}
		return 1
	}, [saturationOffset, pickerRef.current])

	const bright = useMemo(() => {
		if (pickerRef.current) {
			const { height } = pickerRef.current.getBoundingClientRect()
			// 亮度方向：顶部 bright=1，底部 bright=0，因此用 1 - 偏移比例
			return 1 - clamp(toFixed(brightOffset / height, 4), 0, 1)
		}
		return 0
	}, [brightOffset, pickerRef.current])

	// 将 HSV 转换为 HSL（用于某些背景渐变显示）
	const hsl = useMemo(() => {
		return hsvToHsl(hue, saturation, bright)
	}, [hue, saturation, bright])

	// 最终输出的 HEX 颜色（包含透明度）
	const hex = useMemo(() => hsvaToHex(hue, saturation, bright, alpha), [hue, saturation, bright, alpha])

	// ---- 当计算出的 hex 变化时，通知父组件 ----
	useEffect(() => {
		if (onChange && hex && hex !== prevHexRef.current) {
			prevHexRef.current = hex
			onChange(hex)
		}
	}, [hex, onChange])

	// ---- 全局鼠标事件处理：实现拖拽滑块更新偏移 ----
	useEffect(() => {
		const mousemoveHandler = (e: MouseEvent) => {
			// 如果正在拖拽色相条
			if (hueActive && hueRef.current) {
				const { left, right, width } = hueRef.current.getBoundingClientRect()
				if (e.pageX < left) {
					setHueOffset(0) // 超出左边界，固定为 0
				} else if (e.pageX > right) {
					setHueOffset(width) // 超出右边界，固定为最大宽度
				} else {
					setHueOffset(e.pageX - left) // 计算相对偏移
				}
			}

			// 如果正在拖拽透明度条
			if (alphaActive && alphaRef.current) {
				const { left, right, width } = alphaRef.current.getBoundingClientRect()
				if (e.pageX < left) {
					setAlphaOffset(0)
				} else if (e.pageX > right) {
					setAlphaOffset(width)
				} else {
					setAlphaOffset(e.pageX - left)
				}
			}

			// 如果正在二维拾色器内拖拽（同时可能调整饱和度和亮度）
			if ((saturationActive || brightActive) && pickerRef.current) {
				const { left, top, right, bottom, width, height } = pickerRef.current.getBoundingClientRect()

				if (saturationActive) {
					if (e.pageX < left) {
						setSaturationOffset(0)
					} else if (e.pageX > right) {
						setSaturationOffset(width)
					} else {
						setSaturationOffset(e.pageX - left)
					}
				}

				if (brightActive) {
					if (e.pageY < top) {
						setBrightOffset(0) // 顶部偏移为 0（亮度最高）
					} else if (e.pageY > bottom) {
						setBrightOffset(height) // 底部偏移为最大高度（亮度最低）
					} else {
						setBrightOffset(e.pageY - top)
					}
				}
			}
		}

		// 鼠标松开或离开窗口时，结束所有拖拽状态
		const mouseupHandler = () => {
			setHueActive(false)
			setAlphaActive(false)
			setSaturationActive(false)
			setBrightActive(false)
		}

		// 只有在任何拖拽激活时才添加全局监听，减少不必要的性能开销
		if (hueActive || alphaActive || saturationActive || brightActive) {
			document.addEventListener('mousemove', mousemoveHandler)
			document.addEventListener('mouseup', mouseupHandler)
			document.addEventListener('mouseleave', mouseupHandler)
		}

		return () => {
			document.removeEventListener('mousemove', mousemoveHandler)
			document.removeEventListener('mouseup', mouseupHandler)
			document.removeEventListener('mouseleave', mouseupHandler)
		}
	}, [hueActive, alphaActive, saturationActive, brightActive])

	// ---- 处理 HEX 输入框的变更 ----
	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value

		// 支持 #RRGGBB 或 #RRGGBBAA 格式，输入中允许部分字符
		if (/^#[0-9A-Fa-f]{0,8}$/.test(inputValue)) {
			// 只有当长度为 7 或 9 时才算完整输入，触发 onChange
			if ((inputValue.length === 7 || inputValue.length === 9) && onChange) {
				onChange(inputValue)
			}

			// 完整输入时，同步更新滑块位置
			if (inputValue.length === 7 || inputValue.length === 9) {
				const hsva = hexToHsva(inputValue)
				if (hueRef.current && pickerRef.current && alphaRef.current) {
					const hueWidth = hueRef.current.getBoundingClientRect().width
					const pickerWidth = pickerRef.current.getBoundingClientRect().width
					const pickerHeight = pickerRef.current.getBoundingClientRect().height
					const alphaWidth = alphaRef.current.getBoundingClientRect().width

					setHueOffset((hsva.h / 360) * hueWidth)
					setSaturationOffset(hsva.s * pickerWidth)
					setBrightOffset((1 - hsva.v) * pickerHeight)
					setAlphaOffset(hsva.a * alphaWidth)
				}
			}
		}
	}

	// ---- 渲染 UI ----
	return (
		<div
			data-color-picker-panel
			className={cn('w-56 rounded-lg border bg-white p-3 shadow-lg select-none', className, show ? 'opacity-100' : 'opacity-0')}
			style={style}>
			{/* 饱和度-亮度二维拾色区域 */}
			<div
				ref={pickerRef}
				onMouseDown={e => {
					if (e.button === MOUSE_LEFT) {
						const { left, top, width, height } = pickerRef.current!.getBoundingClientRect()
						// 点击时直接设置位置并激活拖拽
						setSaturationOffset(clamp(e.pageX - left, 0, width))
						setBrightOffset(clamp(e.pageY - top, 0, height))
						setSaturationActive(true)
						setBrightActive(true)
					}
				}}
				className='relative h-32 w-full cursor-crosshair rounded-t-md'
				style={{
					backgroundColor: `hsl(${hue}, 100%, 50%)`, // 底部为纯色相
					// 通过两层渐变叠加：从上到下黑色透明（控制亮度），从左到右白色透明（控制饱和度）
					backgroundImage: 'linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))'
				}}>
				{/* 当前选中位置指示点 */}
				<div
					className='absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white shadow-md'
					style={{
						backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}%)`, // 显示该位置的饱和度和亮度颜色
						left: saturationOffset,
						top: brightOffset
					}}
				/>
			</div>

			{/* 色相调节条 */}
			<div
				ref={hueRef}
				onMouseDown={e => {
					if (e.button === MOUSE_LEFT) {
						const { left, width } = hueRef.current!.getBoundingClientRect()
						setHueOffset(clamp(e.pageX - left, 0, width))
						setHueActive(true)
					}
				}}
				className='relative flex h-5 cursor-pointer items-center'
				style={{
					background:
						'linear-gradient(to right, rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 255, 255), rgb(0, 0, 255), rgb(255, 0, 255), rgb(255, 0, 0))'
				}}>
				<div
					className='absolute h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border-2 border-white shadow-md'
					style={{ backgroundColor: `hsl(${hue} 100% 50%)`, left: hueOffset }}
				/>
			</div>

			{/* 透明度调节条（带渐变背景和棋盘格） */}
			<div
				style={{
					backgroundSize: '12px 12px',
					// 棋盘格背景用于体现透明效果
					backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='12' height='12' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 12 0 L 0 0 0 12' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
				}}
				className='rounded-b-md'>
				<div
					ref={alphaRef}
					onMouseDown={e => {
						if (e.button === MOUSE_LEFT) {
							const { left, width } = alphaRef.current!.getBoundingClientRect()
							setAlphaOffset(clamp(e.pageX - left, 0, width))
							setAlphaActive(true)
						}
					}}
					className='relative flex h-5 cursor-pointer items-center'
					style={{
						// 渐变从完全透明到当前颜色的完全不透明
						background: `linear-gradient(to right, hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 0%), hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 100%))`
					}}>
					<div style={{ left: alphaOffset }} className='absolute h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border-2 border-white bg-white shadow-md'>
						{/* 指示点内部显示当前透明度对应的颜色 */}
						<div className='h-full w-full rounded-full' style={{ backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / ${alpha * 100}%)` }} />
					</div>
				</div>
			</div>

			{/* 十六进制颜色值输入框 */}
			<input
				type='text'
				value={hex}
				onChange={handleHexInputChange}
				className='w-full rounded-md border px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
				placeholder='#000000'
			/>
		</div>
	)
}