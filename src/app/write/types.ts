/**
 * 发布表单的数据结构
 * 用于收集和提交文章发布所需的信息
 */
export type PublishForm = {
	/** 文章的唯一标识符（通常用于路由） */
	slug: string
	/** 文章标题 */
	title: string
	/** 文章的 Markdown 格式正文内容 */
	md: string
	/** 文章标签列表 */
	tags: string[]
	/** 发布日期（建议使用 ISO 格式的日期字符串） */
	date: string
	/** 文章摘要或简述 */
	summary: string
	/** 是否为隐藏文章（不显示在列表中），默认为 false */
	hidden?: boolean
	/** 文章所属分类 */
	category?: string
}

/**
 * 图片项的数据结构
 * 可以是外部 URL 图片，也可以是本地文件图片
 */
export type ImageItem =
	| {
			/** 图片唯一标识 */
			id: string
			/** 图片类型：来自 URL */
			type: 'url'
			/** 图片的远程 URL 地址 */
			url: string
	  }
	| {
			/** 图片唯一标识 */
			id: string
			/** 图片类型：来自本地文件 */
			type: 'file'
			/** 原始文件对象 */
			file: File
			/** 预览用的临时 URL */
			previewUrl: string
			/** 文件名（包含扩展名） */
			filename: string
			/** 可选的哈希值，用于校验文件完整性 */
			hash?: string
	  }
