import { useMemo } from 'react'
import dayjs from 'dayjs'
import { useWriteStore } from '../stores/write-store'

export function useWriteData() {
	const { form, images } = useWriteStore()

	// 将本地图片占位符替换为预览URL
	const processedMarkdown = useMemo(() => {
		let mdForPreview = form.md
		for (const img of images) {
			if (img.type === 'file') {
				const placeholder = `local-image:${img.id}`
				// 使用 split + join 安全替换所有出现的占位符（避免正则特殊字符问题）
				mdForPreview = mdForPreview.split(`(${placeholder})`).join(`(${img.previewUrl})`)
			}
		}
		return mdForPreview
	}, [form.md, images])

	const title = form.title || 'Untitled'
	const date = dayjs(form.date).format('YYYY年 M月 D日')

	return {
		markdown: processedMarkdown,
		title,
		date
	}
}
