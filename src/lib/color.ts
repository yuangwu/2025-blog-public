// 简单的颜色转换工具，主要用于 hex 颜色模式

// ---------- 颜色接口定义 ----------

/** HSVA 颜色模型（色相、饱和度、明度、透明度） */
export interface HSVA {
	h: number // 色相，范围 0–360
	s: number // 饱和度，范围 0–1
	v: number // 明度，范围 0–1
	a: number // 透明度，范围 0–1
}

/** HSL 颜色模型（色相、饱和度、亮度） */
export interface HSL {
	h: number // 色相，范围 0–360
	s: number // 饱和度，范围 0–1
	l: number // 亮度，范围 0–1
}

/** RGB 颜色模型（红、绿、蓝） */
export interface RGB {
	r: number // 红色通道，范围 0–255
	g: number // 绿色通道，范围 0–255
	b: number // 蓝色通道，范围 0–255
}

/** RGBA 颜色模型，在 RGB 之外增加了透明度通道 */
export interface RGBA extends RGB {
	a: number // 透明度，范围 0–1
}

// ---------- Hex 与 RGB 的转换 ----------

/**
 * 将 6 位 hex 颜色字符串转换为 RGB 对象（不含透明度）
 * @param hex - 6 位十六进制颜色字符串，可带或不带 '#' 前缀
 * @returns RGB 对象；若格式不合法，则返回黑色 (0,0,0)
 */
export function hexToRgb(hex: string): RGB {
	// 去除开头的 '#' 符号
	const cleaned = hex.replace('#', '')
	// 使用正则匹配 6 位十六进制数字（大小写均可）
	const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
	return result
		? {
				r: parseInt(result[1], 16), // 红色分量（16进制转10进制）
				g: parseInt(result[2], 16), // 绿色分量
				b: parseInt(result[3], 16)  // 蓝色分量
			}
		: { r: 0, g: 0, b: 0 } // 格式不符时，安全降级为黑色
}

/**
 * 将 hex 颜色字符串（6 位或 8 位）转换为 RGBA 对象
 * 6 位 hex 视为完全不透明（a=1），8 位 hex 的最后两位代表透明度（0-255，转换为0-1）
 * @param hex - 6 位或 8 位 hex 字符串，可带 '#' 前缀
 * @returns RGBA 对象，透明度范围 0–1
 */
export function hexToRgba(hex: string): RGBA {
	const cleaned = hex.replace('#', '')

	if (cleaned.length === 6) {
		// 6 位：#RRGGBB → 完全透明
		const r = parseInt(cleaned.slice(0, 2), 16)
		const g = parseInt(cleaned.slice(2, 4), 16)
		const b = parseInt(cleaned.slice(4, 6), 16)
		return { r, g, b, a: 1 }
	}

	if (cleaned.length === 8) {
		// 8 位：#RRGGBBAA → 提取 alpha 并归一化到 0–1
		const r = parseInt(cleaned.slice(0, 2), 16)
		const g = parseInt(cleaned.slice(2, 4), 16)
		const b = parseInt(cleaned.slice(4, 6), 16)
		const a = parseInt(cleaned.slice(6, 8), 16) / 255
		return { r, g, b, a }
	}

	// 长度既不是 6 也不是 8，则返回透明黑色
	return { r: 0, g: 0, b: 0, a: 1 }
}

/**
 * 将 RGB 颜色值转换为 6 位 hex 字符串（#RRGGBB）
 * @param r - 红色 0–255
 * @param g - 绿色 0–255
 * @param b - 蓝色 0–255
 * @returns 以 '#' 开头的 6 位十六进制颜色字符串
 */
export function rgbToHex(r: number, g: number, b: number): string {
	return '#' + [r, g, b]
		.map(x =>
			Math.round(x)                // 取整，避免小数
				.toString(16)             // 转为十六进制
				.padStart(2, '0')         // 不足两位时前面补0
		)
		.join('')
}

// ---------- RGB 与 HSL 的相互转换 ----------

/**
 * 将 RGB 颜色转换为 HSL 颜色模型（色相、饱和度、亮度）
 * 算法基于色光混合最大值、最小值计算，标准数学公式
 * @param r - 红色 0–255
 * @param g - 绿色 0–255
 * @param b - 蓝色 0–255
 * @returns HSL 对象，h 范围 0–360，s 和 l 范围 0–1
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
	// 先归一化到 0–1
	r /= 255
	g /= 255
	b /= 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2 // 亮度计算

	// 当最大最小值不等时才存在饱和度与色相
	if (max !== min) {
		const d = max - min
		// 饱和度根据不同亮度分段计算
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

		// 根据哪个通道是最大值来决定色相偏移
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
		h: h * 360, // 转换为角度 0–360
		s: s,
		l: l
	}
}

/**
 * 将 HSL 颜色转换为 RGB 颜色
 * @param h - 色相 0–360
 * @param s - 饱和度 0–1
 * @param l - 亮度 0–1
 * @returns RGB 对象，各通道 0–255
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
	h /= 360 // 转为 0–1 便于计算
	let r, g, b

	if (s === 0) {
		// 灰阶：饱和度为零，红绿蓝相同，均为亮度值
		r = g = b = l
	} else {
		// 辅助函数：根据色调偏移返回对应通道值
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

// ---------- HSL 与 HSV 的相互转换 ----------

/**
 * 将 HSL 颜色转换为 HSV（HSVA）格式
 * @param h - 色相 0–360
 * @param s - 饱和度 0–1
 * @param l - 亮度 0–1
 * @returns HSVA 对象，透明度假定为 1
 */
export function hslToHsv(h: number, s: number, l: number): HSVA {
	// V = L + S * min(L, 1 - L)
	const v = l + s * Math.min(l, 1 - l)
	// 修正后的饱和度 SV
	const s2 = v === 0 ? 0 : 2 * (1 - l / v)

	return {
		h: h,
		s: s2,
		v: v,
		a: 1 // 由 HSL 转换时透明度固定为 1
	}
}

/**
 * 将 HSV 颜色转换为 HSL
 * @param h - 色相 0–360
 * @param s - 饱和度 0–1
 * @param v - 明度 0–1
 * @returns HSL 对象（未显式声明返回值类型，实际返回包含 h,s,l 的对象）
 */
export function hsvToHsl(h: number, s: number, v: number) {
	// 先计算亮度 L = (2 - S) * V / 2
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

// ---------- Hex 与 HSVA 的转换 ----------

/**
 * 将 hex 颜色字符串（6 位或 8 位）转换为 HSVA
 * 借助 hexToRgba → rgbToHsl → hslToHsv 的中间步骤
 * @param hex - hex 颜色串
 * @returns HSVA 对象，透明度取自 hex 的 alpha 部分
 */
export function hexToHsva(hex: string): HSVA {
	const rgba = hexToRgba(hex)              // 16进制 → RGBA
	const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b) // RGB → HSL
	const hsv = hslToHsv(hsl.h, hsl.s, hsl.l)    // HSL → HSV

	return {
		h: hsv.h,
		s: hsv.s,
		v: hsv.v,
		a: rgba.a // 保留原始透明度
	}
}

/**
 * 将 HSVA 颜色转换为 hex 字符串
 * - 当 alpha ≈ 1 时，返回 6 位 hex (#RRGGBB)，保持向后兼容
 * - 当 alpha < 1 时，返回 8 位 hex (#RRGGBBAA)，AA 表示透明度
 * @param h - 色相 0–360
 * @param s - 饱和度 0–1
 * @param v - 明度 0–1
 * @param a - 透明度 0–1，默认为 1
 * @returns 6 位或 8 位 hex 字符串
 */
export function hsvaToHex(h: number, s: number, v: number, a: number = 1): string {
	// HSVA → HSL → RGB → Hex
	const hsl = hsvToHsl(h, s, v)
	const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
	const baseHex = rgbToHex(rgb.r, rgb.g, rgb.b)

	// 将 alpha 裁剪到 0–1 的安全范围
	const alpha = clamp(a, 0, 1)

	// 完全透明时直接返回 6 位 hex
	if (alpha >= 1) {
		return baseHex
	}

	// 否则拼接 2 位十六进制透明度（0–255 映射）
	const alphaHex = Math.round(alpha * 255)
		.toString(16)
		.padStart(2, '0')

	return `${baseHex}${alphaHex}`
}

// ---------- 通用辅助函数 ----------

/**
 * 将数值限制在 [min, max] 区间内
 * @param value - 输入数值
 * @param min - 下限
 * @param max - 上限
 * @returns 被裁剪后的数值
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * 将数字四舍五入到指定的小数位数，并返回数字类型（注意可能会因浮点数精度原因产生尾部误差）
 * @param value - 需要格式化的数值
 * @param decimals - 保留的小数位数，默认 2
 * @returns 格式化后的数值
 */
export function toFixed(value: number, decimals: number = 2): number {
	return Number(value.toFixed(decimals))
}