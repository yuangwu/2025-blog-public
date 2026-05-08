import { createInstallationToken, getInstallationId, signAppJwt } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { decrypt, encrypt } from './aes256-util'

// 存储在 sessionStorage 中的键名
const GITHUB_TOKEN_CACHE_KEY = 'github_token'   // 安装令牌的缓存键
const GITHUB_PEM_CACHE_KEY = 'p_info'           // 加密后私钥的缓存键

/**
 * 从 sessionStorage 中获取缓存的 GitHub 安装令牌
 * @returns 令牌字符串，如果没有则返回 null
 */
function getTokenFromCache(): string | null {
	// 如果运行时环境不支持 sessionStorage，直接返回 null
	if (typeof sessionStorage === 'undefined') return null
	try {
		return sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY)
	} catch {
		return null
	}
}

/**
 * 将 GitHub 安装令牌存入 sessionStorage
 * @param token 安装令牌
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
 * 清除缓存的 GitHub 安装令牌
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
 * 从 sessionStorage 中获取并解密缓存的 PEM 私钥
 * @returns 解密后的 PEM 字符串，如果没有或解密失败则返回 null
 */
export async function getPemFromCache(): Promise<string | null> {
	if (typeof sessionStorage === 'undefined') return null
	try {
		// 从缓存中取出加密后的私钥
		const encryptedPem = sessionStorage.getItem(GITHUB_PEM_CACHE_KEY)
		if (!encryptedPem) return null
		// 使用 AES-256 解密，密钥来自全局配置
		return await decrypt(encryptedPem, GITHUB_CONFIG.ENCRYPT_KEY)
	} catch {
		return null
	}
}

/**
 * 加密 PEM 私钥后存入 sessionStorage
 * @param pem 原始 PEM 格式私钥
 */
export async function savePemToCache(pem: string): Promise<void> {
	if (typeof sessionStorage === 'undefined') return
	try {
		// 先用 AES-256 加密私钥，再存储
		const encryptedPem = await encrypt(pem, GITHUB_CONFIG.ENCRYPT_KEY)
		sessionStorage.setItem(GITHUB_PEM_CACHE_KEY, encryptedPem)
	} catch (error) {
		console.error('Failed to save pem to cache:', error)
	}
}

/**
 * 清除缓存的加密私钥
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
 * 一次性清除所有认证相关缓存（令牌和私钥）
 */
export function clearAllAuthCache(): void {
	clearTokenCache()
	clearPemCache()
}

/**
 * 判断当前是否存在有效的认证凭据（令牌或私钥）
 * @returns 如果存在令牌或私钥缓存则返回 true
 */
export async function hasAuth(): Promise<boolean> {
	// 任一存在即视为已认证
	return !!getTokenFromCache() || !!(await getPemFromCache())
}

/**
 * 统一的认证 Token 获取方法
 * 自动处理缓存、JWT 签发、安装令牌创建等逻辑
 * @returns GitHub Installation Token
 */
export async function getAuthToken(): Promise<string> {
	// 1. 先尝试从 sessionStorage 获取缓存的安装令牌
	const cachedToken = getTokenFromCache()
	if (cachedToken) {
		toast.info('使用缓存的令牌...')
		return cachedToken
	}

	// 2. 从全局状态中获取私钥（需要用户事先设置）
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥。请使用 useAuth().setPrivateKey()')
	}

	// 3. 使用 GitHub App 的 App ID 和私钥签发 JWT
	toast.info('正在签发 JWT...')
	const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)

	// 4. 通过 JWT 获取当前 App 在指定仓库的安装 ID
	toast.info('正在获取安装信息...')
	const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO)

	// 5. 用 JWT 和安装 ID 创建短生命周期的 Installation Token
	toast.info('正在创建安装令牌...')
	const token = await createInstallationToken(jwt, installationId)

	// 6. 将令牌缓存，避免短时间内重复请求
	saveTokenToCache(token)

	return token
}