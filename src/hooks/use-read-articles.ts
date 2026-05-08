import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 使用对象哈希表存储已读文章，通过 slug 快速查询
 * 时间复杂度 O(1)
 */
type ReadArticlesHash = Record<string, boolean>

/**
 * 已读文章 Store 的状态与方法接口
 */
interface ReadArticlesStore {
	/** 以 slug 为键的已读状态哈希表 */
	readArticles: ReadArticlesHash
	/** 将指定 slug 标记为已读 */
	markAsRead: (slug: string) => void
	/** 检查指定 slug 是否已读 */
	isRead: (slug: string) => boolean
	/** 清除所有已读记录 */
	clearAll: () => void
}

/**
 * 创建一个持久化的已读文章 Store
 * 数据将保存在 localStorage 中（key 为 'blog-read-articles'）
 */
export const useReadArticles = create<ReadArticlesStore>()(
	persist(
		(set, get) => ({
			// 初始状态为空对象，表示没有已读文章
			readArticles: {},

			// 将 slug 对应的文章标记为已读（设为 true）
			markAsRead: (slug: string) => {
				set(state => ({
					readArticles: {
						...state.readArticles,
						[slug]: true
					}
				}))
			},

			// 判断 slug 是否已读，严格检查是否为 true
			isRead: (slug: string) => {
				return get().readArticles[slug] === true
			},

			// 重置所有已读记录为空对象
			clearAll: () => {
				set({ readArticles: {} })
			}
		}),
		{
			// localStorage 中存储的键名
			name: 'blog-read-articles'
		}
	)
)
