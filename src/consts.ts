// 初始延迟时间（秒），用于页面加载后动画的首次触发等待
export const INIT_DELAY = 0.3

// 动画之间的间隔时间（秒），控制多个元素依次出现的节奏
export const ANIMATION_DELAY = 0.1

// 卡片之间的默认间距（像素），适用于较大屏幕
export const CARD_SPACING = 36

// 卡片之间的小屏间距（像素），适用于移动端或窄屏布局
export const CARD_SPACING_SM = 24

// 博客文章的 slug 加密/标识密钥，优先使用环境变量 BLOG_SLUG_KEY，否则为空字符串
export const BLOG_SLUG_KEY = process.env.BLOG_SLUG_KEY || ''

/**
 * GitHub 仓库配置
 * 用于读取和操作存放博客数据的 GitHub 仓库
 */
export const GITHUB_CONFIG = {
	// 仓库拥有者，从环境变量 NEXT_PUBLIC_GITHUB_OWNER 获取，默认为 'yuangwu'
	OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'yuangwu',
	// 仓库名称，从环境变量 NEXT_PUBLIC_GITHUB_REPO 获取，默认为 'yuangwu-blog'
	REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || 'yuangwu-blog',
	// 分支名称，从环境变量 NEXT_PUBLIC_GITHUB_BRANCH 获取，默认为 'main'
	BRANCH: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
	// GitHub App ID，用于身份验证，从环境变量 NEXT_PUBLIC_GITHUB_APP_ID 获取，默认为 '-'
	APP_ID: process.env.NEXT_PUBLIC_GITHUB_APP_ID || '-',
	// 加密密钥，用于内容加解密，从环境变量 NEXT_PUBLIC_GITHUB_ENCRYPT_KEY 获取，默认为 'wudishiduomejimo'
	ENCRYPT_KEY: process.env.NEXT_PUBLIC_GITHUB_ENCRYPT_KEY || 'wudishiduomejimo',
} as const