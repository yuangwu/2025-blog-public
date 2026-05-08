// 颜色转换工具：适用于 hex 模式
// 包含 hex、RGB、HSL、HSV 之间的互相转换，以及数值钳制与格式化

// HSVA 颜色接口（色调、饱和度、明度、透明度）
export interface HSVA {
	h: number // 色相 0-360
	s: number // 饱和度 0-1
	v: number // 明度 0-1
	a: number // 透明度 0-1
}

// HSL 颜色接口（色调、饱和度、亮度）
export interface HSL {
	h: number // 色相 0-360
	s: number // 饱和度 0-1
	l: number // 亮度 0-1
}

// RGB 颜色接口（红、绿、蓝）
export interface RGB {
	r: number // 红色 0-255
	g: number // 绿色 0-255
	b: number // 蓝色 0-255
}

// RGBA 颜色接口，继承 RGB 并增加透明度
export interface RGBA extends RGB {
	a: number // 透明度 0-1
}

/**
 * 将 6 位 hex 颜色字符串转换为 RGB 对象
 * @param hex 6 位 hex 字符串，如 "#ff0000" 或 "ff0000"
 * @returns 对应的 RGB 对象，解析失败返回黑色
 */
export function hexToRgb(hex: string): RGB {
	const cleaned = hex.replace('#', '')
	const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: { r: 0, g: 0, b: 0 }
}

/**
 * 将 hex（6 位或 8 位）转换为 RGBA 对象
 * @param hex 6 位或 8 位 hex 字符串，支持带或不带 "#"
 * @returns RGBA 对象，包含透明度（无 alpha 通道时默认为 1）
 */
export function hexToRgba(hex: string): RGBA {
	const cleaned = hex.replace('#', '')

	// 6 位 hex：不包含透明度，默认完全不透明
	if (cleaned.length === 6) {
		const r = parseInt(cleaned.slice(0, 2), 16)
		const g = parseInt(cleaned.slice(2, 4), 16)
		const b = parseInt(cleaned.slice(4, 6), 16)

		return { r, g, b, a: 1 }
	}

	// 8 位 hex：最后两位代表透明度（0-255），需转换为 0-1
	if (cleaned.length === 8) {
		const r = parseInt(cleaned.slice(0, 2), 16)
		const g = parseInt(cleaned.slice(2, 4), 16)
		const b = parseInt(cleaned.slice(4, 6), 16)
		const a = parseInt(cleaned.slice(6, 8), 16) / 255

		return { r, g, b, a }
	}

	// 格式不正确时返回不透明黑色
	return { r: 0, g: 0, b: 0, a: 1 }
}

/**
 * 将 RGB 颜色值转换为 6 位 hex 字符串
 * @param r 红色 0-255
 * @param g 绿色 0-255
 * @param b 蓝色 0-255
 * @returns 以 "#" 开头的 6 位十六进制颜色字符串
 */
export function rgbToHex(r: number, g: number, b: number): string {
	return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')
}

/**
 * 将 RGB 转换为 HSL
 * @param r 红色 0-255
 * @param g 绿色 0-255
 * @param b 蓝色 0-255
 * @returns HSL 对象，h 为 0-360，s 和 l 为 0-1
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
	r /= 255
	g /= 255
	b /= 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6
				break
			case g:
				h = ((b - r) / d + 2) / 6
				break
			case b:
				h = ((r - g) / d + 4) / 6
				break
		}
	}

	return {
		h: h * 360,
		s: s,
		l: l
	}
}

/**
 * 将 HSL 转换为 RGB
 * @param h 色相 0-360
 * @param s 饱和度 0-1
 * @param l 亮度 0-1
 * @returns RGB 对象，各通道值为 0-255 整数
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
	h /= 360
	let r, g, b

	if (s === 0) {
		r = g = b = l
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1
			if (t > 1) t -= 1
			if (t < 1 / 6) return p + (q - p) * 6 * t
			if (t < 1 / 2) return q
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
			return p
		}

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s
		const p = 2 * l - q

		r = hue2rgb(p, q, h + 1 / 3)
		g = hue2rgb(p, q, h)
		b = hue2rgb(p, q, h - 1 / 3)
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	}
}

/**
 * 将 HSL 转换为 HSV
 * @param h 色相 0-360
 * @param s 饱和度 0-1
 * @param l 亮度 0-1
 * @returns HSVA 对象，透明度固定为 1
 */
export function hslToHsv(h: number, s: number, l: number): HSVA {
	const v = l + s * Math.min(l, 1 - l)
	const s2 = v === 0 ? 0 : 2 * (1 - l / v)

	return {
		h: h,
		s: s2,
		v: v,
		a: 1
	}
}

/**
 * 将 HSV 转换为 HSL
 * @param h 色相 0-360
 * @param s 饱和度 0-1
 * @param v 明度 0-1
 * @returns HSL 对象，不包含透明度
 */
export function hsvToHsl(h: number, s: number, v: number) {
	let l = (v * (2 - s)) / 2
	if (l != 0) {
		if (l == 1) {
			s = 0
		} else if (l < 0.5) {
			s = (s * v) / (l * 2)
		} else {
			s = (s * v) / (2 - l * 2)
		}
	}

	return { h, s, l }
}

/**
 * 将 hex 颜色字符串直接转换为 HSVA
 * @param hex 6 位或 8 位 hex 字符串
 * @returns HSVA 对象，包含从 hex 提取的透明度
 */
export function hexToHsva(hex: string): HSVA {
	const rgba = hexToRgba(hex)
	const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b)
	const hsv = hslToHsv(hsl.h, hsl.s, hsl.l)

	return {
		h: hsv.h,
		s: hsv.s,
		v: hsv.v,
		a: rgba.a
	}
}

/**
 * 将 HSVA 转换为 hex 字符串
 * 当透明度为 1 时输出 6 位 hex，否则输出 8 位 hex（包含透明度通道）
 * @param h 色相 0-360
 * @param s 饱和度 0-1
 * @param v 明度 0-1
 * @param a 透明度 0-1，默认为 1
 * @returns 6 位或 8 位 hex 颜色字符串（带 "#"）
 */
export function hsvaToHex(h: number, s: number, v: number, a: number = 1): string {
	const hsl = hsvToHsl(h, s, v)
	const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
	const baseHex = rgbToHex(rgb.r, rgb.g, rgb.b)

	// 将透明度钳制在 0-1 之间
	const alpha = clamp(a, 0, 1)

	// 完全不透明时保持 6 位 hex，兼容旧版
	if (alpha >= 1) {
		return baseHex
	}

	// 将透明度转换为两位十六进制
	const alphaHex = Math.round(alpha * 255)
		.toString(16)
		.padStart(2, '0')

	return `${baseHex}${alphaHex}`
}

/**
 * 将数值钳制在指定的最小值和最大值之间
 * @param value 输入值
 * @param min 最小值
 * @param max 最大值
 * @returns 钳制后的值
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * 将数字格式化为指定小数位数并返回数字类型
 * @param value 输入数字
 * @param decimals 保留的小数位数，默认 2 位
 * @returns 格式化后的数字（因 toFixed 返回字符串，此处转回数字）
 */
export function toFixed(value: number, decimals: number = 2): number {
	return Number(value.toFixed(decimals))
}
