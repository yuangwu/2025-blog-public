/**
 * 使用 AES-GCM 算法加密文本
 * @param text - 需要加密的明文字符串
 * @param key - 用户提供的密钥字符串（会通过 SHA-256 派生为实际加密密钥）
 * @returns Base64 编码的字符串，包含 12 字节随机 IV 和密文
 */
export async function encrypt(text: string, key: string) {
  const enc = new TextEncoder()
  // 生成 12 字节的随机初始化向量（IV），符合 AES-GCM 建议
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 将用户密钥通过 SHA-256 哈希，得到固定长度的密钥材料
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  // 导入密钥材料，生成用于加密的 CryptoKey 对象
  const cryptoKey = await crypto.subtle.importKey(
    'raw',           // 密钥格式：原始二进制
    keyData,         // 密钥数据
    { name: 'AES-GCM' }, // 算法
    false,           // 是否可导出
    ['encrypt']      // 用途：仅加密
  )

  // 执行加密操作，输出 ArrayBuffer
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(text)
  )

  // 将 IV 和密文拼接成单一 Uint8Array
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(encrypted), iv.length)

  // 将拼接结果转换为 Base64 字符串，方便存储和传输
  return btoa(String.fromCharCode(...result))
}

/**
 * 使用 AES-GCM 算法解密文本
 * @param cipherText - Base64 编码的密文（包含 12 字节 IV + 密文）
 * @param key - 与加密时相同的密钥字符串
 * @returns 解密后的明文字符串
 */
export async function decrypt(cipherText: string, key: string) {
  // 将 Base64 字符串解码为 Uint8Array
  const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0))
  // 前 12 字节为 IV
  const iv = data.slice(0, 12)
  // 剩余部分为密文
  const encrypted = data.slice(12)

  const enc = new TextEncoder()
  // 与加密相同：通过 SHA-256 派生密钥材料
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  // 导入密钥材料，生成用于解密的 CryptoKey 对象
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']      // 用途：仅解密
  )

  // 执行解密操作
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )

  // 将解密后的 ArrayBuffer 解码为 UTF-8 字符串
  return new TextDecoder().decode(decrypted)
}
