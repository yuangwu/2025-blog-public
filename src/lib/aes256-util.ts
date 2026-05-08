export async function encrypt(text:string, key:string) {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 12字节IV
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']/**
 * 使用 AES-GCM 算法加密明文文本
 * @param text - 需要加密的明文字符串
 * @param key - 用户提供的原始密钥字符串（将通过 SHA-256 派生为 256 位密钥）
 * @returns 返回 Base64 编码的字符串，包含 12 字节 IV 和后续密文
 */
export async function encrypt(text: string, key: string) {
  const enc = new TextEncoder()

  // 生成 12 字节随机初始化向量 (IV)，对 AES-GCM 安全且高效
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 使用 SHA-256 将原始密钥字符串派生为 256 位（32 字节）的密钥材料
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  // 导入派生后的密钥材料，指定用于 AES-GCM 加密操作
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    // 密钥格式：原始字节数组
    keyData, 
    // 密钥数据（SHA-256 哈希结果）
    { name: 'AES-GCM' },
    // 算法名称
    false,
    // 密钥不可再导出
    ['encrypt']
    // 密钥用途：仅加密
  )

  // 执行加密，返回包含认证标签的密文（ArrayBuffer）
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, // 算法与 IV
    cryptoKey,
    // 派生后的密钥
    enc.encode(text)
    // 明文字节
  )

  // 将 IV 与密文拼接成一个 Uint8Array，以便传输或存储
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv, 0)
  // 前 12 字节存放 IV
  result.set(new Uint8Array(encrypted), iv.length)
  // 之后存放密文

  // 将 IV+密文的整体转换为 Base64 字符串，便于存储和传输
  return btoa(String.fromCharCode(...result))
}

/**
 * 解密由上述 encrypt 函数生成的 Base64 密文字符串
 * @param cipherText - Base64 编码的字符串，前 12 字节为 IV，后续为密文
 * @param key - 与加密时相同的原始密钥字符串
 * @returns 解密后的明文字符串
 */
export async function decrypt(cipherText: string, key: string) {
  // 将 Base64 字符串解码回 Uint8Array
  const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0))

  // 按约定提取前 12 字节作为 IV，剩余部分为密文
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)

  const enc = new TextEncoder()

  // 使用与加密完全相同的密钥派生过程
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  // 导入派生后的密钥，用途限定为解密
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  // 执行解密，AES-GCM 会自动验证认证标签，防止篡改
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )

  // 将解密后的字节解码为 UTF-8 字符串
  return new TextDecoder().decode(decrypted)
}
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(text)
  )

  // iv + 密文 一起转 base64 方便存储
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...result))
}

export async function decrypt(cipherText:string, key:string) {
  const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0))
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)

  const enc = new TextEncoder()
  const keyData = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(key)
  )

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}
