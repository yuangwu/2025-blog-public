// 导入 clsx 库及其 ClassValue 类型，用于条件性地组合 CSS 类名
import clsx, { ClassValue } from 'clsx'
// 导入 tailwind-merge 的 twMerge 函数，用于智能合并 Tailwind CSS 类名，避免冲突
import { twMerge } from 'tailwind-merge'

/**
 * 合并 CSS 类名的工具函数
 * 先使用 clsx 处理各种类名输入（字符串、对象、数组等），
 * 再通过 twMerge 合并 Tailwind CSS 类，解决样式冲突
 * @param inputs 任意数量的类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * 为数字或数字字符串添加千位分隔符
 * 支持整数和小数，默认分隔符为逗号
 * @param n 需要格式化的数字、数字字符串或其他类型（非数字时返回 0）
 * @param sign 分隔符，默认为 ','
 * @returns 格式化后的字符串，或 0（如果输入不是有效数字）
 */
export function thousandsSeparator(n: string | number | any, sign: string = ',') {
	if (typeof n === 'string' || typeof n === 'number') {
		n = String(n)
		const reg = /\B(?=(\d{3})+($|\.))/g

		if (n.includes('.')) {
			const nArr = n.split('.')
			nArr[0] = nArr[0].replace(reg, `$&${sign}`)

			return nArr.join('.')
		}

		return n.replace(reg, `$&${sign}`)
	} else return 0
}

/**
 * 根据文件名获取对应的文件扩展名，统一返回小写扩展名
 * 主要支持常见图片格式，默认返回 '.png'
 * @param filename 文件名
 * @returns 文件扩展名，如 '.jpg'、'.png' 等
 */
export function getFileExt(filename: string): string {
	const lower = filename.toLowerCase()
	if (lower.endsWith('.jpg')) return '.jpg'
	if (lower.endsWith('.jpeg')) return '.jpeg'
	if (lower.endsWith('.webp')) return '.webp'
	if (lower.endsWith('.png')) return '.png'
	if (lower.endsWith('.svg')) return '.svg'
	return '.png'
}

/**
 * 生成指定范围内的随机浮点数
 * @param a 范围下限（包含）
 * @param b 范围上限（不包含）
 * @returns 介于 a 和 b 之间的随机数
 */
export function rand(a: number, b: number) {
	return a + Math.random() * (b - a)
}
