// 导入 GitHub API 相关的工具函数
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为无前缀的 Base64、计算文件 SHA-256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入用于准备博客总索引（index.json）的函数
import { prepareBlogsIndex } from '@/lib/blog-index'
// 导入获取认证 token 的方法（自动从全局状态获取）
import { getAuthToken } from '@/lib/auth'
// GitHub 仓库配置常量（OWNER、REPO、BRANCH 等）
import { GITHUB_CONFIG } from '@/consts'
// 图片项类型定义：包括 file 类型（本地图片）和 url 类型（外部链接）
import type { ImageItem } from '../types'
// 获取文件扩展名的工具函数
import { getFileExt } from '@/lib/utils'
// 通知提示库
import { toast } from 'sonner'
// 日期时间格式化函数（用于为没有填写日期的文章生成默认时间）
import { formatDateTimeLocal } from '../stores/write-store'

/**
 * 发布/更新博客文章所需的参数
 */
export type PushBlogParams = {
	form: {
		slug: string        // 文章唯一标识（文件名 slug）
		title: string       // 标题
		md: string          // Markdown 内容，可包含 local-image:id 占位符
		tags: string[]      // 标签
		date?: string       // 自定义日期，未提供时将自动生成
		summary?: string    // 摘要
		hidden?: boolean    // 是否隐藏
		category?: string   // 分类
	}
	cover?: ImageItem | null           // 封面图（本地图片或 URL）
	images?: ImageItem[]               // 正文中引用的本地图片列表
	mode?: 'create' | 'edit'           // 模式：创建新文章或编辑已有文章
	originalSlug?: string | null       // 编辑模式下的原始 slug（不允许修改）
}

/**
 * 将博客文章推送到 GitHub 仓库
 * 包括处理图片上传、创建文章 Markdown 文件、配置文件、更新博客总索引，最终创建 Git 提交并更新分支
 */
export async function pushBlog(params: PushBlogParams): Promise<void> {
	const { form, cover, images, mode = 'create', originalSlug } = params

	// 检查必填字段 slug
	if (!form?.slug) throw new Error('需要 slug')

	// 编辑模式下禁止修改 slug（如果尝试修改则抛出错误）
	if (mode === 'edit' && originalSlug && originalSlug !== form.slug) {
		throw new Error('编辑模式下不支持修改 slug，请保持原 slug 不变')
	}

	// 获取认证 token（自动从全局认证状态获取）
	const token = await getAuthToken()

	// 获取目标分支的最新引用信息（获取分支头部 commit 的 SHA）
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha // 当前分支最新提交，后续新建 commit 将以此为父提交

	// 文章在仓库中的基础路径：public/blogs/{slug}
	const basePath = `public/blogs/${form.slug}`
	// Git 提交信息，根据模式区分新增还是更新
	const commitMessage = mode === 'edit' ? `更新文章: ${form.slug}` : `新增文章: ${form.slug}`

	// 收集所有本地图片（类型为 'file'），包括正文图片和封面图片
	const allLocalImages: Array<{ img: Extract<ImageItem, { type: 'file' }>; id: string }> = []

	// 添加正文中引用的本地图片
	for (const img of images || []) {
		if (img.type === 'file') {
			allLocalImages.push({ img, id: img.id })
		}
	}

	// 如果封面也是本地图片，追加到处理列表
	if (cover?.type === 'file') {
		allLocalImages.push({ img: cover, id: cover.id })
	}

	toast.info('正在准备文件...')

	// 用于避免重复上传相同文件（基于文件哈希值）
	const uploadedHashes = new Set<string>()
	let mdToUpload = form.md            // 最终要上传的 Markdown 内容（占位符会被替换）
	let coverPath: string | undefined   // 最终写入 config.json 的封面路径

	// 用来构建 Git tree 的文件项集合
	const treeItems: TreeItem[] = []

	// 处理所有本地图片的上传和占位符替换
	if (allLocalImages.length > 0) {
		toast.info('正在上传图片...')
		for (const { img, id } of allLocalImages) {
			// 计算或使用已有的图片哈希值，用于唯一命名文件并去重
			const hash = img.hash || (await hashFileSHA256(img.file))
			const ext = getFileExt(img.file.name)
			const filename = `${hash}${ext}`                // 图片文件名：哈希 + 扩展名
			const publicPath = `/blogs/${form.slug}/${filename}` // 图片最终在网站上的访问路径

			// 如果这个哈希值尚未上传，则通过 GitHub API 创建 Git Blob
			if (!uploadedHashes.has(hash)) {
				const path = `${basePath}/${filename}`
				const contentBase64 = await fileToBase64NoPrefix(img.file) // 文件内容转换为 Base64（不带 data URI 前缀）
				// 创建 Git blob 对象，返回包含 sha 的对象
				const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
				treeItems.push({
					path,
					mode: '100644',  // 普通文件模式
					type: 'blob',
					sha: blobData.sha
				})
				uploadedHashes.add(hash) // 标记已上传
			}

			// 将 Markdown 中的占位符 `(local-image:id)` 替换为实际访问路径
			const placeholder = `local-image:${id}`
			mdToUpload = mdToUpload.split(`(${placeholder})`).join(`(${publicPath})`)

			// 如果当前处理的图片恰好是封面图，则记录封面路径
			if (cover?.type === 'file' && cover.id === id) {
				coverPath = publicPath
			}
		}
	}

	// 如果封面是外部 URL，则直接使用该 URL
	if (cover?.type === 'url') {
		coverPath = cover.url
	}

	toast.info('正在创建文件...')

	// 上传 Markdown 文件（index.md）
	const mdBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(mdToUpload), 'base64')
	treeItems.push({
		path: `${basePath}/index.md`,
		mode: '100644',
		type: 'blob',
		sha: mdBlob.sha
	})

	// 处理文章日期：如果表单提供了自定义日期则使用，否则使用当前时间格式化后的字符串
	const dateStr = form.date || formatDateTimeLocal()
	const config = {
		title: form.title,
		tags: form.tags,
		date: dateStr,
		summary: form.summary,
		cover: coverPath,
		hidden: form.hidden,
		category: form.category
	}

	// 上传文章配置文件（config.json）
	const configBlob = await createBlob(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		toBase64Utf8(JSON.stringify(config, null, 2)),
		'base64'
	)
	treeItems.push({
		path: `${basePath}/config.json`,
		mode: '100644',
		type: 'blob',
		sha: configBlob.sha
	})

	// 准备并上传博客总索引文件（public/blogs/index.json）
	// prepareBlogsIndex 会基于现有索引和新文章信息生成更新后的索引内容
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
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	// 使用上面所有要变更的文件项创建一个 Git tree 对象
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 基于新 tree 创建一次提交（commit）
	toast.info('正在创建提交...')
	const commitData = await createCommit(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		commitMessage,
		treeData.sha,
		[latestCommitSha]      // 父提交列表，这里只有一个父提交
	)

	// 更新分支指针，使其指向新创建的提交
	toast.info('正在更新分支...')
	await updateRef(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		`heads/${GITHUB_CONFIG.BRANCH}`,
		commitData.sha
	)

	// 发布成功提示
	toast.success('发布成功！')
}