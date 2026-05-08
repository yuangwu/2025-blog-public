/**
 * 博客索引项类型
 * 用于描述博客列表中单个文章的核心元数据
 */
export type BlogIndexItem = {
	slug: string;
	// 文章唯一标识符（URL 友好，通常用于生成文章链接，如 "hello-world"）
	title: string;
	// 文章标题
	tags: string[];
	// 文章标签数组（如 ["技术", "前端", "TypeScript"]）
	date: string;
	// 发布日期（推荐格式：YYYY-MM-DD 或 ISO 8601 标准日期字符串）
	summary?: string;
	// 可选：文章摘要/简介
	cover?: string;
	// 可选：封面图片 URL
	hidden?: boolean;
	// 可选：是否隐藏文章（true 时不在列表中展示）
	category?: string;
	// 可选：文章分类
};

/**
 * 博客配置类型
 * 用于定义博客的全局或局部配置（所有属性均为可选）
 * 通常用于覆盖默认配置、或为特定场景（如专题页）设置自定义属性
 */
export type BlogConfig = {
	title?: string;
	// 可选：配置标题（如网站标题、专题页标题）
	tags?: string[];
	// 可选：配置关联的标签
	date?: string;
	// 可选：配置关联的日期
	summary?: string;
	// 可选：配置的描述/摘要
	cover?: string;
	// 可选：配置的封面图 URL
	hidden?: boolean;
	// 可选：是否隐藏该配置对应的内容
	category?: string;
	// 可选：配置关联的分类
};
