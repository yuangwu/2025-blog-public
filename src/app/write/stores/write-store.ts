// 引入 zustand 状态管理库
import { create } from 'zustand'
// 引入 sonner 用于 toast 提示
import { toast } from 'sonner'
// 引入 SHA-256 哈希计算工具函数
import { hashFileSHA256 } from '@/lib/file-utils'
// 引入加载博客文章函数
import { loadBlog } from '@/lib/load-blog'
// 引入类型定义
import type { PublishForm, ImageItem } from '../types'

// 格式化日期时间为本地字符串，用于 input[type="datetime-local"]
export const formatDateTimeLocal = (date: Date = new Date()): string => {
	const pad = (n: number) => String(n).padStart(2, '0')
	const year = date.getFullYear()
	const month = pad(date.getMonth() + 1)
	const day = pad(date.getDate())
	const hours = pad(date.getHours())
	const minutes = pad(date.getMinutes())
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

// 定义 WriteStore 类型，描述仓库的状态和操作
type WriteStore = {
	// 模式相关
	mode: 'create' | 'edit'
	originalSlug: string | null
	setMode: (mode: 'create' | 'edit', originalSlug?: string) => void

	// 表单状态
	form: PublishForm
	updateForm: (updates: Partial<PublishForm>) => void
	setForm: (form: PublishForm) => void

	// 图片列表状态
	images: ImageItem[]
	addUrlImage: (url: string) => void
	addFiles: (files: FileList | File[]) => Promise<ImageItem[]>
	deleteImage: (id: string) => void

	// 封面状态
	cover: ImageItem | null
	setCover: (cover: ImageItem | null) => void

	// 发布加载状态
	loading: boolean
	setLoading: (loading: boolean) => void

	// 加载博客以编辑
	loadBlogForEdit: (slug: string) => Promise<void>

	// 重置为创建模式
	reset: () => void
}

// 默认的初始表单数据
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

// 创建 useWriteStore hook，管理写作页面的所有状态
export const useWriteStore = create<WriteStore>((set, get) => ({
	// 模式状态
	mode: 'create',
	originalSlug: null,
	setMode: (mode, originalSlug) => set({ mode, originalSlug: originalSlug || null }),

	// 表单状态
	form: { ...initialForm },
	// 更新部分表单字段
	updateForm: updates => set(state => ({ form: { ...state.form, ...updates } })),
	// 整体替换表单
	setForm: form => set({ form }),

	// 图片状态
	images: [],
	// 添加图片链接
	addUrlImage: url => {
		const { images } = get()
		const exists = images.some(it => it.type === 'url' && it.url === url)
		if (exists) {
			toast.info('该图片已在列表中')
			return
		}
		const id = Math.random().toString(36).slice(2, 10)
		set(state => ({ images: [{ id, type: 'url', url }, ...state.images] }))
	},
	// 添加多个文件（支持拖拽或选择），返回实际新增的 ImageItem 数组
	addFiles: async (files: FileList | File[]) => {
		const { images } = get()
		// 过滤非图片文件
		const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
		if (arr.length === 0) return []

		// 收集已有文件图片的哈希，用于去重
		const existingHashes = new Map<string, ImageItem>(
			images
				.filter((it): it is Extract<ImageItem, { type: 'file'; hash?: string }> => it.type === 'file' && (it as any).hash)
				.map(it => [(it as any).hash as string, it])
		)

		// 计算所有图片文件的 SHA-256 哈希
		const computed = await Promise.all(
			arr.map(async file => {
				const hash = await hashFileSHA256(file)
				return { file, hash }
			})
		)

		// 根据哈希去重，只保留首次出现的新图片
		const seen = new Set<string>()
		const unique = computed.filter(({ hash }) => {
			if (existingHashes.has(hash)) return false
			if (seen.has(hash)) return false
			seen.add(hash)
			return true
		})

		const resultImages: ImageItem[] = []

		// 处理已存在的图片，直接加入返回结果
		for (const { hash } of computed) {
			if (existingHashes.has(hash)) {
				resultImages.push(existingHashes.get(hash)!)
			}
		}

		// 处理新图片
		if (unique.length > 0) {
			const newItems: ImageItem[] = unique.map(({ file, hash }) => {
				const id = Math.random().toString(36).slice(2, 10)
				const previewUrl = URL.createObjectURL(file) // 本地预览链接
				const filename = file.name
				return { id, type: 'file', file, previewUrl, filename, hash }
			})

			set(state => ({ images: [...newItems, ...state.images] }))
			resultImages.push(...newItems)
		} else if (resultImages.length === 0) {
			// 全部重复且没有新图片，提示用户
			toast.info('图片已存在，不重复添加')
		}

		return resultImages
	},
	// 删除图片，如果是文件类型还需要释放对象 URL，并清除对应的封面
	deleteImage: id =>
		set(state => {
			for (const it of state.images) {
				if (it.type === 'file' && it.id === id) {
					URL.revokeObjectURL(it.previewUrl)
					// 如果删除的图片正好是封面，则清空封面
					if (it.id === state.cover?.id) {
						set({ cover: null }) // 注意这里 set 嵌套并不好，但实际会触发再次设定
					}
				}
			}
			return { images: state.images.filter(it => it.id !== id) }
		}),

	// 封面状态
	cover: null,
	setCover: cover => set({ cover }),

	// 发布加载状态
	loading: false,
	setLoading: loading => set({ loading }),

	// 加载博客以供编辑
	loadBlogForEdit: async (slug: string) => {
		try {
			set({ loading: true }) // 开始加载
			const blog = await loadBlog(slug)

			// 从 Markdown 内容中解析图片链接（非封面）
			const images: ImageItem[] = []
			const imageRegex = /!\[.*?\]\((.*?)\)/g
			let match
			while ((match = imageRegex.exec(blog.markdown)) !== null) {
				const url = match[1]
				// 跳过封面图片和本地图片引用
				if (url && url !== blog.cover && !url.startsWith('local-image:')) {
					// 去重
					if (!images.some(img => img.type === 'url' && img.url === url)) {
						const id = Math.random().toString(36).slice(2, 10)
						images.push({ id, type: 'url', url })
					}
				}
			}

			// 设置封面
			let cover: ImageItem | null = null
			if (blog.cover) {
				const coverId = Math.random().toString(36).slice(2, 10)
				cover = { id: coverId, type: 'url', url: blog.cover }
			}

			// 同步表单、图片、封面等状态
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

	// 重置所有状态至创建模式，并清理文件预览占用的内存
	reset: () => {
		const { images, cover } = get()
		for (const img of images) {
			if (img.type === 'file') {
				URL.revokeObjectURL(img.previewUrl)
			}
		}
		if (cover?.type === 'file') {
			URL.revokeObjectURL(cover.previewUrl)
		}

		set({
			mode: 'create',
			originalSlug: null,
			form: { ...initialForm, date: formatDateTimeLocal() },
			images: [],
			cover: null
		})
	}
}))