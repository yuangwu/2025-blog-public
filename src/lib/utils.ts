import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并类名工具函数
 * 使用 clsx 将任意数量的参数（字符串、对象、数组等）合并成单个类名字符串，
 * 再通过 tailwind-merge 解决 Tailwind CSS 类名冲突（后面的同名样式覆盖前面的）。
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * 给数字添加千位分隔符（默认为逗号）
 * @param n - 要处理的数字或数字字符串，也可以是其他类型（此时直接返回 0）
 * @param sign - 分隔符，默认 ','
 * @returns 带分隔符的字符串，若输入不合法则返回 0
 */
export function thousandsSeparator(n: string | number | any, sign: string = ',') {
	// 仅当输入为字符串或数字时才进行转换
	if (typeof n === 'string' || typeof n === 'number') {
		n = String(n)
		// 匹配非单词边界，且后面跟着 3 的倍数个数字，直到结尾或小数点
		const reg = /\B(?=(\d{3})+($|\.))/g

		// 如果包含小数部分，仅对整数部分添加分隔符
		if (n.includes('.')) {
			const nArr = n.split('.')
			nArr[0] = nArr[0].replace(reg, `$&${sign}`)
			return nArr.join('.')
		}

		// 纯整数直接替换
		return n.replace(reg, `$&${sign}`)
	} else return 0
}

/**
 * 根据文件名获取标准化的图片扩展名
 * @param filename - 文件名（如 "photo.jpg"）
 * @returns 对应的扩展名字符串，默认返回 '.png'
 */
export function getFileExt(filename: string): string {
	const lower = filename.toLowerCase()
	if (lower.endsWith('.jpg')) return '.jpg'
	if (lower.endsWith('.jpeg')) return '.jpeg'
	if (lower.endsWith('.webp')) return '.webp'
	if (lower.endsWith('.png')) return '.png'
	if (lower.endsWith('.svg')) return '.svg'
	// 未知或缺失扩展名时，默认按 PNG 处理
	return '.png'
}

/**
 * 生成 [a, b) 范围内的均匀随机浮点数
 * @param a - 下限（包含）
 * @param b - 上限（不包含）
 * @returns 随机浮点数
 */
export function rand(a: number, b: number) {
	return a + Math.random() * (b - a)
}