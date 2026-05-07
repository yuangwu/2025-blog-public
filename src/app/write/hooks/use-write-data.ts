// 从 React 中导入 useMemo Hook，用于缓存计算结果
import { useMemo } from 'react'
// 导入 dayjs 日期库，用于格式化日期
import dayjs from 'dayjs'
// 导入写文章相关的状态管理 store
import { useWriteStore } from '../stores/write-store'

/**
 * 自定义 Hook：处理写文章页面的展示用数据
 * 包括处理预览用的 Markdown（替换本地图片占位符为预览链接）、
 * 生成标题和格式化日期
 */
export function useWriteData() {
	// 从全局 store 中获取表单数据和图片列表
	const { form, images } = useWriteStore()

	// 使用 useMemo 缓存处理后的 Markdown 字符串
	// 仅在 form.md 或 images 变化时重新计算
	const processedMarkdown = useMemo(() => {
		// 获取原始 Markdown 文本
		let mdForPreview = form.md
		// 遍历所有图片
		for (const img of images) {
			// 只处理本地文件类型的图片（尚未上传的图片）
			if (img.type === 'file') {
				// 构造图片占位符，格式如 local-image:123
				const placeholder = `local-image:${img.id}`
				// 将 Markdown 中的占位符替换为图片预览 URL
				// 使用 split + join 组合实现全局替换，模拟 replaceAll
				mdForPreview = mdForPreview.split(`(${placeholder})`).join(`(${img.previewUrl})`)
			}
		}
		return mdForPreview
	}, [form.md, images])

	// 文章标题，默认为 'Untitled'
	const title = form.title || 'Untitled'
	// 使用 dayjs 格式化日期，展示为 “2026年5月7日” 之类的格式
	const date = dayjs(form.date).format('YYYY年 M月 D日')

	// 返回给组件使用的数据对象
	return {
		markdown: processedMarkdown,
		title,
		date
	}
}