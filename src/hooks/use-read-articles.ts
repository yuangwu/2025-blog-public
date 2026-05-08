import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 定义已读文章哈希表类型，键为文章的唯一标识（slug），值为布尔值，表示是否已读
// 使用对象哈希结构，可以实现 O(1) 时间复杂度的快速查找
type ReadArticlesHash = Record<string, boolean>

// 定义文章已读状态 store 的接口，约束 store 对外暴露的数据和方法
interface ReadArticlesStore {
	// 存储所有文章已读状态的哈希表，键为 slug，值为 true 表示已读
	readArticles: ReadArticlesHash
	// 将指定 slug 的文章标记为已读
	markAsRead: (slug: string) => void
	// 判断指定 slug 的文章是否已读，返回布尔值
	isRead: (slug: string) => boolean
	// 清空所有已读记录
	clearAll: () => void
}

// 创建并导出一个名为 useReadArticles 的自定义 hook，它是一个 zustand store
// 泛型参数 <ReadArticlesStore> 指定了 store 的类型
export const useReadArticles = create<ReadArticlesStore>()(
	// 使用 persist 中间件包裹 store 定义，使状态能够持久化保存
	persist(
		// 使用 zustand 的 set 和 get 函数定义 store 的初始状态和操作方法
		(set, get) => ({
			// 初始状态：空对象，表示没有任何文章被标记为已读
			readArticles: {},
			
			// 标记文章为已读的方法
			markAsRead: (slug: string) => {
				// 通过 set 函数更新状态，使用回调形式获取当前最新状态
				set(state => ({
					readArticles: {
						// 展开原有的已读记录，避免直接修改原对象
						...state.readArticles,
						// 将目标 slug 对应的值设为 true，表示已读
						[slug]: true
					}
				}))
			},
			
			// 判断文章是否已读的方法
			isRead: (slug: string) => {
				// get() 获取当前状态，检查对应 slug 的值是否为 true
				// 严格相等判断，确保只有明确设为 true 才返回已读
				return get().readArticles[slug] === true
			},
			
			// 清空所有已读记录的方法
			clearAll: () => {
				// 将整个 readArticles 重置为空对象
				set({ readArticles: {} })
			}
		}),
		// persist 中间件的配置项
		{
			// 指定持久化存储时使用的键名（localStorage 的 key）
			name: 'blog-read-articles'
		}
	)
)
