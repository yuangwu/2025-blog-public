'use client'

/**
 * 将 File 对象读取为纯文本字符串
 * @param file - 需要读取的文件对象
 * @returns 解析后的文本内容
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		// 读取完成时，将结果转为字符串并 resolve
		reader.onload = () => resolve(String(reader.result || ''))
		// 读取出错时直接 reject
		reader.onerror = reject
		// 以文本方式读取文件
		reader.readAsText(file)
	})
}

/**
 * 将 File 对象转换为不带前缀的 base64 字符串
 * 例如 "data:image/png;base64,iVBORw0..." 会变成 "iVBORw0..."
 * @param file - 需要转换的文件对象
 * @returns 去掉 `data:*;base64,` 前缀后的纯 base64 内容
 */
export function fileToBase64NoPrefix(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const dataUrl = String(reader.result || '')
			// 使用正则移除 data URL 的前缀部分
			resolve(dataUrl.replace(/^data:[^;]+;base64,/, ''))
		}
		reader.onerror = reject
		// 以 Data URL 方式读取文件，得到完整 base64 字符串
		reader.readAsDataURL(file)
	})
}

/**
 * 计算文件的 SHA-256 哈希值，并返回前 16 个字符（十六进制）
 * 注意：此函数依赖浏览器环境的 crypto.subtle，仅能在安全上下文（HTTPS）中使用
 * @param file - 需要计算哈希的文件对象
 * @returns 文件哈希值的前 16 位十六进制字符串
 */
export async function hashFileSHA256(file: File): Promise<string> {
	// 将文件内容读取为 ArrayBuffer
	const buf = await file.arrayBuffer()
	// 使用 SHA-256 算法计算摘要
	const digest = await crypto.subtle.digest('SHA-256', buf)
	// 将摘要结果转为字节数组
	const bytes = new Uint8Array(digest)
	let hex = ''
	// 将每个字节转换为两位十六进制字符串并拼接
	for (let i = 0; i < bytes.length; i++) {
		const h = bytes[i].toString(16).padStart(2, '0')
		hex += h
	}
	// 仅返回前 16 个字符（相当于 8 字节）
	return hex.slice(0, 16)
}
