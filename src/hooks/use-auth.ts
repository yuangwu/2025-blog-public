/**
 * 认证状态管理 Store
 * 使用 Zustand 管理用户认证状态、私钥以及相关操作。
 * 同时负责与缓存层交互，在应用启动时恢复认证信息。
 */

// 导入 zustand 的 create 方法
import { create } from 'zustand'

// 导入认证相关的工具函数
import {
  clearAllAuthCache,      // 清除所有认证缓存
  getAuthToken as getToken, // 获取认证 Token（可能会自动刷新）
  hasAuth as checkAuth,    // 检查当前是否存在有效的认证状态
  getPemFromCache,        // 从本地缓存读取 PEM 私钥
  savePemToCache          // 将 PEM 私钥保存到本地缓存
} from '@/lib/auth'

// 引入全局配置 Store，用于获取站点配置（如是否缓存 PEM）
import { useConfigStore } from '@/app/(home)/stores/config-store'

/**
 * 认证 Store 的接口定义
 * 描述状态字段和可执行的操作（actions）
 */
interface AuthStore {
  // ---- 状态 ----
  isAuth: boolean          // 当前是否处于已认证状态
  privateKey: string | null // 当前持有的私钥内容（PEM 格式字符串）

  // ---- 动作 ----
  setPrivateKey: (key: string) => void  // 设置私钥同时标记已认证，并按配置决定是否缓存
  clearAuth: () => void                 // 清除认证状态与所有相关缓存
  refreshAuthState: () => void          // 异步刷新认证状态（从底层检查）
  getAuthToken: () => Promise<string>   // 获取认证 Token，同时刷新认证状态
}

/**
 * 创建并导出认证 Store Hook
 * 通过 (set, get) 可以访问/修改状态，并调用其他 store 的方法
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // 初始状态：未认证，无私钥
  isAuth: false,
  privateKey: null,

  /**
   * 设置私钥并标记为已认证
   * @param key PEM 格式的私钥字符串
   * 若全局配置中开启了“缓存 PEM”选项，则将其持久化到本地缓存
   */
  setPrivateKey: async (key: string) => {
    // 更新状态
    set({ isAuth: true, privateKey: key })

    // 读取当前站点配置，判断是否需要缓存 PEM
    const { siteContent } = useConfigStore.getState()
    if (siteContent?.isCachePem) {
      await savePemToCache(key) // 保存到缓存
    }
  },

  /**
   * 清除认证
   * 调用底层方法清理所有认证缓存，并将 isAuth 设为 false
   * 注意：此处并未清空 privateKey，可根据需要扩展
   */
  clearAuth: () => {
    clearAllAuthCache()          // 清理所有认证相关的本地缓存
    set({ isAuth: false })      // 更新状态为未认证
  },

  /**
   * 刷新认证状态
   * 异步调用 checkAuth() 获取真实认证情况，并更新 isAuth
   */
  refreshAuthState: async () => {
    set({ isAuth: await checkAuth() })
  },

  /**
   * 获取认证 Token
   * 1. 通过 getToken() 获取当前有效的 Token（可能触发刷新）
   * 2. 获取后主动刷新一次认证状态
   * @returns 有效的认证 Token 字符串
   */
  getAuthToken: async () => {
    const token = await getToken()
    get().refreshAuthState() // 刷新 isAuth 状态，确保与 Token 一致
    return token
  }
}))

// ==================== 应用初始化：恢复可能存在的认证信息 ====================

/**
 * 从本地缓存中恢复 PEM 私钥
 * 如果缓存中存在私钥，则直接写入 Store，避免用户重复输入
 */
getPemFromCache().then((key) => {
  if (key) {
    useAuthStore.setState({ privateKey: key })
  }
})

/**
 * 检查当前认证是否仍然有效
 * 如果有效，将 isAuth 状态置为 true
 */
checkAuth().then((isAuth) => {
  if (isAuth) {
    useAuthStore.setState({ isAuth })
  }
})