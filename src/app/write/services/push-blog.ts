// 导入 GitHub API 操作相关工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为 Base64（无前缀）和计算 SHA256 哈希值
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入准备博客索引 JSON 的函数
import { prepareBlogsIndex } from '@/lib/blog-index'
// 导入获取认证 token 的函数（从全局状态获取）
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 仓库配置常量（仓库所有者、仓库名、分支等）
import { GITHUB_CONFIG } from '@/consts'
// 导入图片项的类型定义
import type { ImageItem } from '../types'
// 导入获取文件扩展名的工具函数
import { getFileExt } from '@/lib/utils'
// 导入 Sonner 消息提示库（用于显示通知）
import { toast } from 'sonner'
// 导入日期时间格式化函数（用于生成默认日期字符串）
import { formatDateTimeLocal } from '../stores/write-store'

// 定义 pushBlog 函数的参数类型
export type PushBlogParams = {
	form: {
		slug: string          // 文章唯一标识（通常用于 URL）
		title: string         // 文章标题
		md: string            // Markdown 内容
		tags: string[]        // 标签列表
		date?: string         // 发布日期（可选，不提供则使用当前时间）
		summary?: string      // 文章摘要（可选）
		hidden?: boolean      // 是否隐藏（可选）
		category?: string     // 分类（可选）
	}
	cover?: ImageItem | null   // 封面图片（本地文件或 URL）
	images?: ImageItem[]       // 文章内容中的图片列表（本地文件）
	mode?: 'create' | 'edit'   // 操作模式：新建或编辑
	originalSlug?: string | null // 编辑模式下原来的 slug，用于校验
}

/**
 * 将博客文章推送到 GitHub 仓库（通过 Git 树、提交、分支引用更新）
 * 该函数依赖浏览器环境（File API、toast 通知），仅应在客户端调用。
 * 所有依赖的模块（@/lib/*、@/consts 等）在项目中必须存在且正确导出。
 * 
 * @param params - 推送参数（文章信息、封面、图片、操作模式等）
 * @throws 当 slug 缺失或编辑模式下修改 slug 时抛出错误
 */
export async function pushBlog(params: PushBlogParams): Promise<void> {
	const { form, cover, images, mode = 'create', originalSlug } = params

	// 校验 slug 是否存在
	if (!form?.slug) throw new Error('需要 slug')

	// 编辑模式下禁止修改 slug（因为 slug 是文章的唯一标识路径，修改会导致原文件无法覆盖）
	if (mode === 'edit' && originalSlug && originalSlug !== form.slug) {
		throw new Error('编辑模式下不支持修改 slug，请保持原 slug 不变')
	}

	// 从全局认证状态获取 GitHub 访问令牌
	const token = await getAuthToken()

	// 显示提示：正在获取分支信息（最新 commit SHA）
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha  // 当前分支最新提交的 SHA

	// 博客文件在仓库中的存储基路径：public/blogs/{slug}/
	const basePath = `public/blogs/${form.slug}`
	// 根据模式生成提交消息
	const commitMessage = mode === 'edit' ? `更新文章: ${form.slug}` : `新增文章: ${form.slug}`

	// 收集所有需要上传的本地图片（内容图片 + 封面图片）
	const allLocalImages: Array<{ img: Extract<ImageItem, { type: 'file' }>; id: string }> = []

	// 添加文章内容中的图片（仅限 type === 'file' 的本地文件）
	for (const img of images || []) {
		if (img.type === 'file') {
			allLocalImages.push({ img, id: img.id })
		}
	}

	// 如果封面是本地文件，也加入待上传列表
	if (cover?.type === 'file') {
		allLocalImages.push({ img: cover, id: cover.id })
	}

	toast.info('正在准备文件...')

	const uploadedHashes = new Set<string>()   // 记录已上传图片的哈希值，避免重复上传相同内容
	let mdToUpload = form.md                   // 待上传的 Markdown 内容（会替换图片占位符）
	let coverPath: string | undefined          // 封面最终路径（本地文件上传后的 URL 或外部 URL）

	// 构建 Git 树中的所有条目（blob 对象）
	const treeItems: TreeItem[] = []

	// 处理所有本地图片：上传 blob 并替换 Markdown 中的占位符
	if (allLocalImages.length > 0) {
		toast.info('正在上传图片...')
		for (const { img, id } of allLocalImages) {
			// 计算图片内容的哈希值（若未提供则实时计算），作为文件名确保唯一性
			const hash = img.hash || (await hashFileSHA256(img.file))
			const ext = getFileExt(img.file.name)   // 获取原文件扩展名（如 .png）
			const filename = `${hash}${ext}`        // 最终存储在仓库中的文件名
			const publicPath = `/blogs/${form.slug}/${filename}`  // 图片在博客中的公开访问路径

			// 如果该哈希值对应的图片尚未上传，则创建 blob 并添加到树条目
			if (!uploadedHashes.has(hash)) {
				const path = `${basePath}/${filename}`  // 仓库内的完整路径
				const contentBase64 = await fileToBase64NoPrefix(img.file)  // 将文件转为 Base64（无 data: 前缀）
				// 调用 GitHub API 创建 blob 对象，返回包含 SHA 的数据
				const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
				treeItems.push({
					path,
					mode: '100644',   // 普通文件模式
					type: 'blob',
					sha: blobData.sha // blob 的 SHA 标识
				})
				uploadedHashes.add(hash)  // 标记该哈希已上传
			}

			// 在 Markdown 内容中将占位符 `local-image:{id}` 替换为实际的公开访问路径
			const placeholder = `local-image:${id}`
			mdToUpload = mdToUpload.split(`(${placeholder})`).join(`(${publicPath})`)

			// 如果当前图片是封面（匹配 id），则记录封面路径
			if (cover?.type === 'file' && cover.id === id) {
				coverPath = publicPath
			}
		}
	}

	// 处理外部 URL 封面（直接保存 URL 地址）
	if (cover?.type === 'url') {
		coverPath = cover.url
	}

	toast.info('正在创建文件...')

	// 创建 index.md 的 blob（Markdown 内容已替换图片占位符）
	const mdBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(mdToUpload), 'base64')
	treeItems.push({
		path: `${basePath}/index.md`,
		mode: '100644',
		type: 'blob',
		sha: mdBlob.sha
	})

	// 准备 config.json 的内容（文章元数据）
	const dateStr = form.date || formatDateTimeLocal()  // 若无指定日期则使用当前本地时间
	const config = {
		title: form.title,
		tags: form.tags,
		date: dateStr,
		summary: form.summary,
		cover: coverPath,
		hidden: form.hidden,
		category: form.category
	}

	// 创建 config.json 的 blob（格式化为易读的 JSON）
	const configBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(JSON.stringify(config, null, 2)), 'base64')
	treeItems.push({
		path: `${basePath}/config.json`,
		mode: '100644',
		type: 'blob',
		sha: configBlob.sha
	})

	// 准备全局博客索引文件 public/blogs/index.json
	// 该函数会拉取现有索引，合并当前文章信息后返回新的 JSON 字符串
	const indexJson = await prepareBlogsIndex(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		{
			slug: form.slug,
			title: form.title,
			tags: form.tags,
			date: dateStr,
			summary: form.summary,
			cover: coverPath,
			hidden: form.hidden,
			category: form.category
		},
		GITHUB_CONFIG.BRANCH
	)
	// 创建索引文件的 blob
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	// 创建 Git 树（tree），基于最新的 commit 作为父树
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 创建提交（commit），关联刚创建的树和父提交
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 更新分支引用（将分支指向新提交）
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 所有操作成功完成，通知用户
	toast.success('发布成功！')
}
