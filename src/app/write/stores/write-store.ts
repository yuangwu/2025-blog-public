// 导入 Zustand 状态管理库
import { create } from 'zustand'
// 导入 Sonner 提示组件（需确保已安装 sonner 并在组件树中配置 Toaster）
import { toast } from 'sonner'
// 导入计算文件 SHA256 哈希的工具函数（需确保 @/lib/file-utils 存在并正确导出该函数）
import { hashFileSHA256 } from '@/lib/file-utils'
// 导入加载博客内容的函数（需确保 @/lib/load-blog 存在并正确导出 loadBlog）
import { loadBlog } from '@/lib/load-blog'
// 导入发布表单和图片项的类型定义（需确保 ../types 中存在 PublishForm 和 ImageItem）
import type { PublishForm, ImageItem } from '../types'

/**
 * 将 Date 对象格式化为 input[type="datetime-local"] 接受的本地日期时间字符串
 * @param date - 日期对象，默认为当前时间
 * @returns 格式如 "2025-01-15T14:30" 的字符串
 */
export const formatDateTimeLocal = (date: Date = new Date()): string => {
	const pad = (n: number) => String(n).padStart(2, '0')
	const year = date.getFullYear()
	const month = pad(date.getMonth() + 1)
	const day = pad(date.getDate())
	const hours = pad(date.getHours())
	const minutes = pad(date.getMinutes())
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

// 定义 WriteStore 的状态和方法类型
type WriteStore = {
	// 模式状态：创建或编辑
	mode: 'create' | 'edit'
	originalSlug: string | null // 编辑时保存原始 slug，便于判断是否重命名
	setMode: (mode: 'create' | 'edit', originalSlug?: string) => void

	// 表单数据状态
	form: PublishForm
	updateForm: (updates: Partial<PublishForm>) => void
	setForm: (form: PublishForm) => void

	// 图片列表状态（文章正文中使用的图片）
	images: ImageItem[]
	addUrlImage: (url: string) => void                     // 通过 URL 添加网络图片
	addFiles: (files: FileList | File[]) => Promise<ImageItem[]> // 通过文件选择添加本地图片（自动去重）
	deleteImage: (id: string) => void                      // 删除图片并释放预览 URL

	// 封面图片状态
	cover: ImageItem | null
	setCover: (cover: ImageItem | null) => void

	// 发布/加载状态
	loading: boolean
	setLoading: (loading: boolean) => void

	// 加载已有博客进入编辑模式
	loadBlogForEdit: (slug: string) => Promise<void>

	// 重置为创建模式（清空所有状态并释放预览资源）
	reset: () => void
}

// 初始表单数据
const initialForm: PublishForm = {
	slug: '',
	title: '',
	md: '',
	tags: [],
	date: formatDateTimeLocal(),
	summary: '',
	hidden: false,
	category: ''
}

// 创建并导出 store
// 注意：本 store 使用了浏览器专有 API（URL.createObjectURL / revokeObjectURL），
//       必须在客户端环境（如 React 组件、事件处理、useEffect 等）中使用。
//       若在 Vercel 部署的 Next.js 服务端组件中直接调用本 store 的方法，可能导致错误。
//       请确保调用该 store 的代码仅在客户端执行（如 "use client" 指令）。
export const useWriteStore = create<WriteStore>((set, get) => ({
	// ====== 模式状态 ======
	mode: 'create',
	originalSlug: null,
	setMode: (mode, originalSlug) => set({ mode, originalSlug: originalSlug || null }),

	// ====== 表单状态 ======
	form: { ...initialForm },
	updateForm: updates => set(state => ({ form: { ...state.form, ...updates } })),
	setForm: form => set({ form }),

	// ====== 图片列表状态 ======
	images: [],

	/**
	 * 通过 URL 添加网络图片
	 * @param url 图片地址
	 */
	addUrlImage: url => {
		const { images } = get()
		// 去重：检查是否已存在相同 URL
		const exists = images.some(it => it.type === 'url' && it.url === url)
		if (exists) {
			toast.info('该图片已在列表中')
			return
		}
		// 生成临时唯一 ID
		const id = Math.random().toString(36).slice(2, 10)
		set(state => ({ images: [{ id, type: 'url', url }, ...state.images] }))
	},

	/**
	 * 添加本地图片文件（支持拖拽或文件选择）
	 * @param files FileList 或 File 数组
	 * @returns 成功新增的 ImageItem 数组
	 */
	addFiles: async (files: FileList | File[]) => {
		const { images } = get()
		// 仅保留图片类型文件
		const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
		if (arr.length === 0) return []

		// 构建已存在图片的哈希映射（仅针对已完成 SHA256 计算的文件图片）
		const existingHashes = new Map<string, ImageItem>(
			images
				.filter((it): it is Extract<ImageItem, { type: 'file'; hash?: string }> => it.type === 'file' && (it as any).hash)
				.map(it => [(it as any).hash as string, it])
		)

		// 并行计算每个文件的 SHA256 哈希
		const computed = await Promise.all(
			arr.map(async file => {
				const hash = await hashFileSHA256(file)
				return { file, hash }
			})
		)

		// 去重：同一批次内相同哈希只保留一个，且不与已有哈希重复
		const seen = new Set<string>()
		const unique = computed.filter(({ hash }) => {
			if (existingHashes.has(hash)) return false
			if (seen.has(hash)) return false
			seen.add(hash)
			return true
		})

		const resultImages: ImageItem[] = []

		// 收集已存在的图片（用于返回值，告知调用方哪些图片已存在）
		for (const { hash } of computed) {
			if (existingHashes.has(hash)) {
				resultImages.push(existingHashes.get(hash)!)
			}
		}

		// 处理真正新增的图片
		if (unique.length > 0) {
			const newItems: ImageItem[] = unique.map(({ file, hash }) => {
				const id = Math.random().toString(36).slice(2, 10)
				const previewUrl = URL.createObjectURL(file)   // 创建本地预览链接
				const filename = file.name
				return { id, type: 'file', file, previewUrl, filename, hash }
			})
			// 新图片插入到列表头部
			set(state => ({ images: [...newItems, ...state.images] }))
			resultImages.push(...newItems)
		} else if (resultImages.length === 0) {
			toast.info('图片已存在，不重复添加')
		}

		return resultImages
	},

	/**
	 * 删除图片，并释放其预览 URL（若为文件图片）
	 * @param id 图片唯一 ID
	 */
	deleteImage: id =>
		set(state => {
			// 遍历查找并释放 URL 资源
			for (const it of state.images) {
				if (it.type === 'file' && it.id === id) {
					URL.revokeObjectURL(it.previewUrl)
					// 如果删除的图片恰好是当前封面，则同时清空封面
					if (it.id === state.cover?.id) {
						// 注意：在 set 回调内部再次调用 set 是允许的，会触发额外更新，
						// 但不会产生错误。如需优化可合并到返回的对象中。
						set({ cover: null })
					}
				}
			}
			// 过滤掉被删除的图片
			return { images: state.images.filter(it => it.id !== id) }
		}),

	// ====== 封面状态 ======
	cover: null,
	setCover: cover => set({ cover }),

	// ====== 发布/加载状态 ======
	loading: false,
	setLoading: loading => set({ loading }),

	// ====== 加载博客并进入编辑模式 ======
	/**
	 * 根据 slug 加载已有博客内容，并转换为编辑状态
	 * @param slug 博客唯一标识
	 */
	loadBlogForEdit: async (slug: string) => {
		try {
			set({ loading: true })
			const blog = await loadBlog(slug) // 假设 loadBlog 返回包含 markdown 和 config 等内容的对象

			// 从 Markdown 正文中解析出图片 URL（排除封面图片及 local-image: 开头的占位符）
			const images: ImageItem[] = []
			const imageRegex = /!\[.*?\]\((.*?)\)/g
			let match
			while ((match = imageRegex.exec(blog.markdown)) !== null) {
				const url = match[1]
				if (url && url !== blog.cover && !url.startsWith('local-image:')) {
					// 去重后添加到图片列表
					if (!images.some(img => img.type === 'url' && img.url === url)) {
						const id = Math.random().toString(36).slice(2, 10)
						images.push({ id, type: 'url', url })
					}
				}
			}

			// 设置封面图片（若存在）
			let cover: ImageItem | null = null
			if (blog.cover) {
				const coverId = Math.random().toString(36).slice(2, 10)
				cover = { id: coverId, type: 'url', url: blog.cover }
			}

			// 更新 store 状态为编辑模式，并填充表单数据
			set({
				mode: 'edit',
				originalSlug: slug,
				form: {
					slug,
					title: blog.config.title || '',
					md: blog.markdown,
					tags: blog.config.tags || [],
					date: blog.config.date ? formatDateTimeLocal(new Date(blog.config.date)) : formatDateTimeLocal(),
					summary: blog.config.summary || '',
					hidden: blog.config.hidden || false,
					category: blog.config.category || ''
				},
				images,
				cover,
				loading: false
			})

			toast.success('博客加载成功')
		} catch (err: any) {
			console.error('Failed to load blog:', err)
			toast.error(err?.message || '加载博客失败')
			set({ loading: false })
			throw err
		}
	},

	// ====== 重置为创建模式 ======
	/**
	 * 清空所有编辑/创建状态，并释放所有本地文件预览 URL
	 */
	reset: () => {
		const { images, cover } = get()
		// 释放所有文件图片的预览 URL，防止内存泄漏
		for (const img of images) {
			if (img.type === 'file') {
				URL.revokeObjectURL(img.previewUrl)
			}
		}
		if (cover?.type === 'file') {
			URL.revokeObjectURL(cover.previewUrl)
		}
		// 重置所有状态
		set({
			mode: 'create',
			originalSlug: null,
			form: { ...initialForm, date: formatDateTimeLocal() },
			images: [],
			cover: null
		})
	}
}))
