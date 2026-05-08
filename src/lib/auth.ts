// 从 github-client 模块导入与 GitHub App 认证相关的工具函数
import { createInstallationToken, getInstallationId, signAppJwt } from './github-client'
// 导入 GitHub 相关配置常量（如 App ID、仓库所有者等）
import { GITHUB_CONFIG } from '@/consts'
// 导入 zustand 的认证状态 store（用于获取存储的私钥）
import { useAuthStore } from '@/hooks/use-auth'
// 导入 toast 通知库，用于显示操作提示
import { toast } from 'sonner'
// 导入 AES-256 加密/解密工具，用于保护缓存的 PEM 私钥
import { decrypt, encrypt } from './aes256-util'

// sessionStorage 中用于存储 GitHub Token 的键名
const GITHUB_TOKEN_CACHE_KEY = 'github_token'
// sessionStorage 中用于存储加密后 PEM 私钥的键名
const GITHUB_PEM_CACHE_KEY = 'p_info'

/**
 * 从 sessionStorage 缓存中获取 GitHub Token
 * @returns 缓存的 Token 字符串，如果不存在或不可用则返回 null
 */
function getTokenFromCache(): string | null {
	// 确保 sessionStorage 可用（SSR 环境会返回 null）
	if (typeof sessionStorage === 'undefined') return null
	try {
		return sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY)
	} catch {
		return null
	}
}

/**
 * 将 GitHub Token 保存到 sessionStorage 缓存
 * @param token 待缓存的 Token 字符串
 */
function saveTokenToCache(token: string): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(GITHUB_TOKEN_CACHE_KEY, token)
	} catch (error) {
		console.error('Failed to save token to cache:', error)
	}
}

/**
 * 清除 sessionStorage 中缓存的 GitHub Token
 */
function clearTokenCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_TOKEN_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear token cache:', error)
	}
}

/**
 * 从 sessionStorage 中获取加密的 PEM 私钥并解密
 * @returns 解密后的 PEM 字符串，如果不存在或解密失败则返回 null
 */
export async function getPemFromCache(): Promise<string | null> {
	if (typeof sessionStorage === 'undefined') return null
	try {
		// 解密缓存中的 pem
		const encryptedPem = sessionStorage.getItem(GITHUB_PEM_CACHE_KEY)
		if (!encryptedPem) return null
		return await decrypt(encryptedPem, GITHUB_CONFIG.ENCRYPT_KEY)
	} catch {
		return null
	}
}

/**
 * 将 PEM 私钥加密后保存到 sessionStorage
 * @param pem 原始的 PEM 格式私钥字符串
 */
export async function savePemToCache(pem: string): Promise<void> {
	if (typeof sessionStorage === 'undefined') return
	try {
		// 加密 pem 后存储
		const encryptedPem = await encrypt(pem, GITHUB_CONFIG.ENCRYPT_KEY)
		sessionStorage.setItem(GITHUB_PEM_CACHE_KEY, encryptedPem)
	} catch (error) {
		console.error('Failed to save pem to cache:', error)
	}
}

/**
 * 清除 sessionStorage 中缓存的 PEM 私钥
 */
function clearPemCache(): void {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.removeItem(GITHUB_PEM_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear pem cache:', error)
	}
}

/**
 * 清除所有与认证相关的缓存（Token 和 PEM）
 */
export function clearAllAuthCache(): void {
	clearTokenCache()
	clearPemCache()
}

/**
 * 检查当前是否已有有效的认证凭据（Token 或私钥）
 * @returns true 表示已有认证信息，否则 false
 */
export async function hasAuth(): Promise<boolean> {
	return !!getTokenFromCache() || !!(await getPemFromCache())
}

/**
 * 统一的认证 Token 获取
 * 自动处理缓存、签发等逻辑
 * @returns GitHub Installation Token
 */
export async function getAuthToken(): Promise<string> {
	// 1. 先尝试从缓存获取 token
	const cachedToken = getTokenFromCache()
	if (cachedToken) {
		toast.info('使用缓存的令牌...')
		return cachedToken
	}

	// 2. 从 zustand store 中获取私钥（若不存在则抛出错误）
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥。请使用 useAuth().setPrivateKey()')
	}

	// 3. 签发 GitHub App 的 JSON Web Token (JWT)
	toast.info('正在签发 JWT...')
	const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)

	// 4. 获取当前 App 在指定仓库中的安装 ID
	toast.info('正在获取安装信息...')
	const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO)

	// 5. 使用安装 ID 创建短期的 Installation Access Token
	toast.info('正在创建安装令牌...')
	const token = await createInstallationToken(jwt, installationId)

	// 6. 将新 Token 存入缓存并返回
	saveTokenToCache(token)

	return token
}
