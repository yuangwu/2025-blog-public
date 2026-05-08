import { create } from 'zustand'
// 从认证工具模块导入所需函数
import { clearAllAuthCache, getAuthToken as getToken, hasAuth as checkAuth, getPemFromCache, savePemToCache } from '@/lib/auth'
// 从全局配置 store 中获取配置状态
import { useConfigStore } from '@/app/(home)/stores/config-store'

// 定义认证 store 的接口（类型）
interface AuthStore {
	// ========== 状态 ==========
	/** 是否已通过认证 */
	isAuth: boolean
	/** 私钥字符串（PEM 格式） */
	privateKey: string | null

	// ========== 动作 ==========
	/** 设置私钥并更新认证状态，同时根据配置决定是否缓存到本地 */
	setPrivateKey: (key: string) => Promise<void>
	/** 清除所有认证缓存并重置认证状态 */
	clearAuth: () => void
	/** 刷新当前认证状态（异步检查） */
	refreshAuthState: () => Promise<void>
	/** 获取认证令牌，同时刷新认证状态 */
	getAuthToken: () => Promise<string>
}

/**
 * 认证状态管理 store
 * 基于 zustand 实现，用于管理用户私钥和认证状态，
 * 并提供与缓存层交互的方法。
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
	// 初始状态：未认证，无私钥
	isAuth: false,
	privateKey: null,

	/**
	 * 设置私钥
	 * 1. 更新 store 中的认证状态与私钥
	 * 2. 若全局配置允许缓存 PEM，则将其持久化保存
	 * @param key - PEM 格式的私钥字符串
	 */
	setPrivateKey: async (key: string) => {
		// 更新状态
		set({ isAuth: true, privateKey: key })
		// 读取全局站点配置
		const { siteContent } = useConfigStore.getState()
		// 如果配置中开启了缓存 PEM，则调用保存函数
		if (siteContent?.isCachePem) {
			await savePemToCache(key)
		}
	},

	/**
	 * 清除认证状态
	 * 调用底层清理函数删除所有认证缓存，并重置前端认证标志。
	 */
	clearAuth: () => {
		// 清除所有认证相关的本地缓存
		clearAllAuthCache()
		// 将认证状态置为 false
		set({ isAuth: false })
	},

	/**
	 * 刷新认证状态
	 * 通过检查本地是否存在有效认证信息来更新 isAuth 标志。
	 */
	refreshAuthState: async () => {
		// 异步调用 checkAuth，将结果写入 store
		set({ isAuth: await checkAuth() })
	},

	/**
	 * 获取认证令牌
	 * 先尝试获取令牌，然后刷新一次认证状态，确保前端状态与实际缓存同步。
	 * @returns 认证令牌字符串
	 */
	getAuthToken: async () => {
		// 从缓存或登录流程获取 token
		const token = await getToken()
		// 获取成功后立即刷新认证状态（例如 token 可能失效的情况）
		get().refreshAuthState()
		return token
	}
}))

/**
 * 应用启动时自动执行：
 * 如果缓存中已存在 PEM 私钥，则直接恢复到 store 中，
 * 避免用户重复输入。
 */
getPemFromCache().then((key) => {
	if (key) {
		// 直接用 setState 更新 privateKey，不触发缓存写入逻辑
		useAuthStore.setState({ privateKey: key })
	}
})

/**
 * 应用启动时自动执行：
 * 检查已有认证状态，如果已认证则同步到 store，
 * 保证页面刷新后认证标志正确。
 */
checkAuth().then((isAuth) => {
	if (isAuth) {
		useAuthStore.setState({ isAuth })
	}
})
