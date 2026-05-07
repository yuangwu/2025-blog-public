// 'use client' 指令表明该文件是 Next.js（App Router）中的客户端组件或客户端工具模块，
// 所有代码仅在浏览器环境执行，可以安全使用 FileReader、crypto.subtle 等 Web API。
'use client'

/**
 * 将文件内容以纯文本方式读取
 * @param file - 浏览器 File 对象
 * @returns 返回 Promise，解析为文件的文本内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // 读取成功时，将结果转为字符串并 resolve
    reader.onload = () => resolve(String(reader.result || ''))
    // 读取失败时，直接 reject 错误对象
    reader.onerror = reject
    // 以文本格式读取文件内容
    reader.readAsText(file)
  })
}

/**
 * 将文件转换为 Base64 编码（去除 Data URL 前缀）
 * @param file - 浏览器 File 对象
 * @returns 返回 Promise，解析为纯净的 Base64 字符串（不含 "data:...;base64," 前缀）
 */
export function fileToBase64NoPrefix(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // reader.result 为完整的 Data URL，例如 "data:image/png;base64,iVBORw0..."
      const dataUrl = String(reader.result || '')
      // 利用正则移除 "data:<MIME>;base64," 部分，仅保留纯 Base64 字符串
      resolve(dataUrl.replace(/^data:[^;]+;base64,/, ''))
    }
    reader.onerror = reject
    // 以 Data URL 格式读取文件，自动进行 Base64 编码
    reader.readAsDataURL(file)
  })
}

/**
 * 计算文件的 SHA-256 哈希值并返回前 16 位十六进制字符串
 * （常用于生成文件的短标识符）
 * @param file - 浏览器 File 对象
 * @returns 返回 Promise，解析为 16 个字符的十六进制哈希字符串
 */
export async function hashFileSHA256(file: File): Promise<string> {
  // 将文件内容读取为 ArrayBuffer
  const buf = await file.arrayBuffer()
  // 使用 Web Crypto API 计算 SHA-256 摘要
  const digest = await crypto.subtle.digest('SHA-256', buf)
  // 将摘要结果转为字节数组
  const bytes = new Uint8Array(digest)
  let hex = ''
  // 逐字节转换为两位十六进制字符串并拼接
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, '0')
    hex += h
  }
  // 截取前 16 个字符作为短哈希返回
  return hex.slice(0, 16)
}