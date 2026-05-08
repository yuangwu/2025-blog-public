'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
// 颜色转换与辅助函数：hex字符串 ↔ HSVA对象、HSVA → HSL、数值钳位、保留固定小数
import { hexToHsva, hsvaToHex, hsvToHsl, clamp, toFixed } from '@/lib/color'

// 颜色选择器面板组件的属性接口
interface ColorPickerPanelProps {
	value: string            // 当前颜色值，如 #ff0000 或 #ff000080
	onChange?: (color: string) => void  // 颜色变化回调
	style?: React.CSSProperties
	className?: string
}

// 鼠标左键事件.button 值常量
const MOUSE_LEFT = 0

/**
 * 颜色选择器面板组件
 * 提供饱和度/亮度选取区、色相滑块、透明度滑块以及十六进制直接输入
 */
export function ColorPickerPanel({ value, onChange, style, className }: ColorPickerPanelProps) {
	// 控制面板可见性，避免初次渲染闪烁
	const [show, setShow] = useState(false)

	// 各滑块对应的偏移量（像素），驱动滑块位置和颜色计算
	const [hueOffset, setHueOffset] = useState(0)           // 色相滑块偏移
	const [alphaOffset, setAlphaOffset] = useState(255)     // 透明度滑块偏移，初始255表示完全不透明
	const [saturationOffset, setSaturationOffset] = useState(255) // 饱和度（X轴）偏移
	const [brightOffset, setBrightOffset] = useState(0)     // 亮度（Y轴）偏移

	// 用于获取DOM元素尺寸的ref
	const hueRef = useRef<HTMLDivElement>(null)
	const pickerRef = useRef<HTMLDivElement>(null) // 饱和度/亮度选取区
	const alphaRef = useRef<HTMLDivElement>(null)

	// 记录当前是否处于拖拽状态
	const [hueActive, setHueActive] = useState(false)
	const [alphaActive, setAlphaActive] = useState(false)
	const [saturationActive, setSaturationActive] = useState(false)
	const [brightActive, setBrightActive] = useState(false)

	// 记录上一次通知父组件的颜色值，避免重复触发 onChange
	const prevHexRef = useRef<string>(value)

	// 根据外部传入的 value 初始化各滑块位置（仅在组件挂载时执行）
	useEffect(() => {
		if (value) {
			const hsva = hexToHsva(value)
			prevHexRef.current = value
			// 使用 setTimeout 确保 ref 已经挂载到 DOM
			setTimeout(() => {
				if (hueRef.current && pickerRef.current && alphaRef.current) {
					const hueWidth = hueRef.current.getBoundingClientRect().width
					const pickerWidth = pickerRef.current.getBoundingClientRect().width
					const pickerHeight = pickerRef.current.getBoundingClientRect().height
					const alphaWidth = alphaRef.current.getBoundingClientRect().width

					// 将颜色分量映射为像素偏移
					setHueOffset((hsva.h / 360) * hueWidth)
					setSaturationOffset(hsva.s * pickerWidth)
					setBrightOffset((1 - hsva.v) * pickerHeight)
					setAlphaOffset(hsva.a * alphaWidth)
					setShow(true) // 初始化完成后显示面板
				}
			}, 0)
		}
	}, []) // 仅在挂载时执行，后续外部 value 变化通过 hex 同步逻辑处理

	// 根据 hueOffset 计算当前色相角度 (0-360)
	const hue = useMemo(() => {
		if (hueRef.current) {
			const { width } = hueRef.current.getBoundingClientRect()
			return toFixed((hueOffset / width) * 360)
		}
		return 0
	}, [hueOffset, hueRef.current])

	// 计算当前透明度 (0-1)
	const alpha = useMemo(() => {
		if (alphaRef.current) {
			const { width } = alphaRef.current.getBoundingClientRect()
			return clamp(toFixed(alphaOffset / width, 4), 0, 1)
		}
		return 1
	}, [alphaOffset, alphaRef.current])

	// 计算当前饱和度 (0-1)
	const saturation = useMemo(() => {
		if (pickerRef.current) {
			const { width } = pickerRef.current.getBoundingClientRect()
			return clamp(toFixed(saturationOffset / width, 4), 0, 1)
		}
		return 1
	}, [saturationOffset, pickerRef.current])

	// 计算当前亮度 (0-1)，注意 Y 轴上方为亮度最小值（黑色）
	const bright = useMemo(() => {
		if (pickerRef.current) {
			const { height } = pickerRef.current.getBoundingClientRect()
			return 1 - clamp(toFixed(brightOffset / height, 4), 0, 1)
		}
		return 0
	}, [brightOffset, pickerRef.current])

	// 将 HSVA 转为 HSL 对象，供部分 UI 样式使用
	const hsl = useMemo(() => {
		return hsvToHsl(hue, saturation, bright)
	}, [hue, saturation, bright])

	// 合并为 hex 颜色字符串（含 alpha）
	const hex = useMemo(() => hsvaToHex(hue, saturation, bright, alpha), [hue, saturation, bright, alpha])

	// 当像素偏移或透明度变化导致 hex 改变时，通知父组件
	useEffect(() => {
		if (onChange && hex && hex !== prevHexRef.current) {
			prevHexRef.current = hex
			onChange(hex)
		}
	}, [hex, onChange])

	// 全局鼠标移动/松开事件处理，实现拖拽调整颜色
	useEffect(() => {
		const mousemoveHandler = (e: MouseEvent) => {
			// 色相滑块拖拽
			if (hueActive && hueRef.current) {
				const { left, right, width } = hueRef.current.getBoundingClientRect()
				if (e.pageX < left) {
					setHueOffset(0)
				} else if (e.pageX > right) {
					setHueOffset(width)
				} else {
					setHueOffset(e.pageX - left)
				}
			}

			// 透明度滑块拖拽
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

			// 饱和度/亮度选取区拖拽
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
						setBrightOffset(0)
					} else if (e.pageY > bottom) {
						setBrightOffset(height)
					} else {
						setBrightOffset(e.pageY - top)
					}
				}
			}
		}

		// 鼠标松开时结束所有拖拽状态
		const mouseupHandler = () => {
			setHueActive(false)
			setAlphaActive(false)
			setSaturationActive(false)
			setBrightActive(false)
		}

		if (hueActive || alphaActive || saturationActive || brightActive) {
			document.addEventListener('mousemove', mousemoveHandler)
			document.addEventListener('mouseup', mouseupHandler)
			// 鼠标离开文档时也终止拖拽，防止状态卡死
			document.addEventListener('mouseleave', mouseupHandler)
		}

		return () => {
			document.removeEventListener('mousemove', mousemoveHandler)
			document.removeEventListener('mouseup', mouseupHandler)
			document.removeEventListener('mouseleave', mouseupHandler)
		}
	}, [hueActive, alphaActive, saturationActive, brightActive])

	// 处理十六进制输入框的修改
	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value

		// 允许输入 #RRGGBB 或 #RRGGBBAA 格式，长度可为0-8
		if (/^#[0-9A-Fa-f]{0,8}$/.test(inputValue)) {
			// 当输入完整颜色值（7或9位）时通知父组件，并更新滑块位置
			if ((inputValue.length === 7 || inputValue.length === 9) && onChange) {
				onChange(inputValue)
			}

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

	return (
		<div
			data-color-picker-panel
			className={cn('w-56 rounded-lg border bg-white p-3 shadow-lg select-none', className, show ? 'opacity-100' : 'opacity-0')}
			style={style}>
			{/* 饱和度与亮度选取区 */}
			<div
				ref={pickerRef}
				onMouseDown={e => {
					if (e.button === MOUSE_LEFT) {
						const { left, top, width, height } = pickerRef.current!.getBoundingClientRect()
						// 根据点击位置设置饱和度和亮度偏移，并激活拖拽
						setSaturationOffset(clamp(e.pageX - left, 0, width))
						setBrightOffset(clamp(e.pageY - top, 0, height))
						setSaturationActive(true)
						setBrightActive(true)
					}
				}}
				className='relative h-32 w-full cursor-crosshair rounded-t-md'
				style={{
					// 背景：当前色相的纯色，叠加白渐变（右）和黑渐变（下）来模拟饱和度和亮度平面
					backgroundColor: `hsl(${hue}, 100%, 50%)`,
					backgroundImage: 'linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))'
				}}>
				{/* 饱和度/亮度选取指示点 */}
				<div
					className='absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white shadow-md'
					style={{
						backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}%)`,
						left: saturationOffset,
						top: brightOffset
					}}
				/>
			</div>

			{/* 色相滑块 */}
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
					// 标准彩虹色背景渐变
					background:
						'linear-gradient(to right, rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 255, 255), rgb(0, 0, 255), rgb(255, 0, 255), rgb(255, 0, 0))'
				}}>
				{/* 色相滑块指示器 */}
				<div
					className='absolute h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border-2 border-white shadow-md'
					style={{ backgroundColor: `hsl(${hue} 100% 50%)`, left: hueOffset }}
				/>
			</div>

			{/* 透明度滑块（带棋盘格背景展示半透明区域） */}
			<div
				style={{
					backgroundSize: '12px 12px',
					// 内嵌 SVG 实现棋盘格背景
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
						// 从完全透明到完全不透明的当前颜色渐变
						background: `linear-gradient(to right, hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 0%), hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 100%))`
					}}>
					{/* 透明度指示器：外层白圈，内层填充当前颜色及透明度 */}
					<div style={{ left: alphaOffset }} className='absolute h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border-2 border-white bg-white shadow-md'>
						<div className='h-full w-full rounded-full' style={{ backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / ${alpha * 100}%)` }} />
					</div>
				</div>
			</div>

			{/* 十六进制颜色输入框 */}
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
