/**
 * 博客文章列表项的元数据类型
 * 用于展示列表时所需的最小字段集合
 */
export type BlogIndexItem = {
	/** 文章的唯一标识 slug，用于生成文章路径 */
	slug: string
	/** 文章标题 */
	title: string
	/** 文章标签数组 */
	tags: string[]
	/** 发布日期，格式通常为 YYYY-MM-DD */
	date: string
	/** 文章摘要（可选） */
	summary?: string
	/** 封面图片地址（可选） */
	cover?: string
	/** 是否隐藏，为 true 时不在列表中显示（可选） */
	hidden?: boolean
	/** 文章所属分类（可选） */
	category?: string
}

/**
 * 博客配置类型
 * 可以作为某些文章的默认配置，也可以单独用于覆盖默认值
 * 所有字段均为可选，便于灵活组合
 */
export type BlogConfig = {
	/** 博客或文章标题（可选） */
	title?: string
	/** 标签列表（可选） */
	tags?: string[]
	/** 日期字符串（可选） */
	date?: string
	/** 摘要（可选） */
	summary?: string
	/** 封面图 URL（可选） */
	cover?: string
	/** 是否隐藏（可选） */
	hidden?: boolean
	/** 分类（可选） */
	category?: string
}
