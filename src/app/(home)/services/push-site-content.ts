// 从 GitHub 客户端工具库导入必要的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入获取用户认证 Token 的函数
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置（如仓库所有者、仓库名、分支名等）
import { GITHUB_CONFIG } from '@/consts'
// 导入 Sonner 库用于显示提示消息（Toast）
import { toast } from 'sonner'
// 导入文件处理工具函数（将文件转换为无前缀的 Base64 字符串）
import { fileToBase64NoPrefix } from '@/lib/file-utils'
// 导入站点内容和卡片样式的类型定义
import type { SiteContent, CardStyles } from '../stores/config-store'
// 导入文件项、各类图片上传的类型定义
import type { FileItem, ArtImageUploads, SocialButtonImageUploads, BackgroundImageUploads } from '../config-dialog/site-settings'

// 定义类型别名：艺术图片配置项（取自 SiteContent 中的 artImages 数组元素）
type ArtImageConfig = SiteContent['artImages'][number]
// 定义类型别名：背景图片配置项（取自 SiteContent 中的 backgroundImages 数组元素）
type BackgroundImageConfig = SiteContent['backgroundImages'][number]

/**
 * 将站点内容推送到 GitHub 仓库的主函数
 * @param siteContent - 站点的核心内容配置（如文本、图片链接等）
 * @param cardStyles - 卡片的样式配置
 * @param faviconItem - 可选：网站图标文件项
 * @param avatarItem - 可选：头像文件项
 * @param artImageUploads - 可选：需要上传的艺术图片集合
 * @param removedArtImages - 可选：需要删除的艺术图片配置数组
 * @param backgroundImageUploads - 可选：需要上传的背景图片集合
 * @param removedBackgroundImages - 可选：需要删除的背景图片配置数组
 * @param socialButtonImageUploads - 可选：需要上传的社交按钮图片集合
 * @returns Promise<void>
 */
export async function pushSiteContent(
	siteContent: SiteContent,
	cardStyles: CardStyles,
	faviconItem?: FileItem | null,
	avatarItem?: FileItem | null,
	artImageUploads?: ArtImageUploads,
	removedArtImages?: ArtImageConfig[],
	backgroundImageUploads?: BackgroundImageUploads,
	removedBackgroundImages?: BackgroundImageConfig[],
	socialButtonImageUploads?: SocialButtonImageUploads
): Promise<void> {
	// 1. 获取用户的 GitHub 认证 Token
	const token = await getAuthToken()

	// 2. 获取目标分支的最新引用信息（包含最新的 Commit SHA）
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 定义本次提交的信息
	const commitMessage = `更新站点配置`

	toast.info('正在准备文件...')

	// 初始化 Git Tree 项数组，用于存放所有要变更的文件（增删改）
	const treeItems: TreeItem[] = []

	// --- 3. 处理 Favicon 上传 ---
	if (faviconItem?.type === 'file') {
		toast.info('正在上传 Favicon...')
		// 将文件转换为 Base64 格式
		const contentBase64 = await fileToBase64NoPrefix(faviconItem.file)
		// 在 GitHub 上创建一个 Blob（二进制文件对象）
		const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
		// 将该 Blob 加入到 Tree 项中，指定路径为 public/favicon.png
		treeItems.push({
			path: 'public/favicon.png',
			mode: '100644', // 文件模式：普通文件
			type: 'blob',
			sha: blobData.sha
		})
	}

	// --- 4. 处理 Avatar 上传 ---
	if (avatarItem?.type === 'file') {
		toast.info('正在上传 Avatar...')
		const contentBase64 = await fileToBase64NoPrefix(avatarItem.file)
		const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
		treeItems.push({
			path: 'public/images/avatar.png',
			mode: '100644',
			type: 'blob',
			sha: blobData.sha
		})
	}

	// --- 5. 处理艺术图片上传 ---
	if (artImageUploads) {
		// 遍历所有待上传的艺术图片
		for (const [id, item] of Object.entries(artImageUploads)) {
			if (item.type !== 'file') continue

			// 在 siteContent 中找到对应的图片配置
			const artConfig = siteContent.artImages?.find(art => art.id === id)
			if (!artConfig) continue

			// 确保文件保存在 public 目录下，但 URL 保持为 /images/... 格式
			const normalizedUrlPath = artConfig.url.startsWith('/') ? artConfig.url : `/${artConfig.url}`
			const path = `public${normalizedUrlPath}`
			if (!path) continue

			toast.info(`正在上传 Art 图片 ${id}...`)
			const contentBase64 = await fileToBase64NoPrefix(item.file)
			const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: blobData.sha
			})
		}
	}

	// --- 6. 处理艺术图片删除 ---
	if (removedArtImages && removedArtImages.length > 0) {
		for (const art of removedArtImages) {
			const normalizedUrlPath = art.url.startsWith('/') ? art.url : `/${art.url}`
			const path = `public${normalizedUrlPath}`
			// 在 Git Tree 中，将 sha 设为 null 即表示删除该文件
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null
			})
		}
	}

	// --- 7. 处理背景图片上传 (逻辑同艺术图片) ---
	if (backgroundImageUploads) {
		for (const [id, item] of Object.entries(backgroundImageUploads)) {
			if (item.type !== 'file') continue

			const bgConfig = siteContent.backgroundImages?.find(bg => bg.id === id)
			if (!bgConfig) continue

			// 仅当 URL 以 /images/background/ 开头时才上传（本地文件）
			if (!bgConfig.url.startsWith('/images/background/')) continue

			const normalizedUrlPath = bgConfig.url.startsWith('/') ? bgConfig.url : `/${bgConfig.url}`
			const path = `public${normalizedUrlPath}`
			if (!path) continue

			toast.info(`正在上传背景图片 ${id}...`)
			const contentBase64 = await fileToBase64NoPrefix(item.file)
			const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: blobData.sha
			})
		}
	}

	// --- 8. 处理背景图片删除 ---
	if (removedBackgroundImages && removedBackgroundImages.length > 0) {
		for (const bg of removedBackgroundImages) {
			// 仅删除本地文件路径的背景图
			if (!bg.url.startsWith('/images/background/')) continue

			const normalizedUrlPath = bg.url.startsWith('/') ? bg.url : `/${bg.url}`
			const path = `public${normalizedUrlPath}`
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null
			})
		}
	}

	// --- 9. 处理社交按钮图片上传 ---
	if (socialButtonImageUploads) {
		for (const [buttonId, item] of Object.entries(socialButtonImageUploads)) {
			if (item.type !== 'file') continue

			const button = siteContent.socialButtons?.find(btn => btn.id === buttonId)
			if (!button) continue

			// 仅上传本地社交按钮图片
			if (!button.value.startsWith('/images/social-buttons/')) continue

			const normalizedUrlPath = button.value.startsWith('/') ? button.value : `/${button.value}`
			const path = `public${normalizedUrlPath}`
			if (!path) continue

			toast.info(`正在上传社交按钮图片 ${buttonId}...`)
			const contentBase64 = await fileToBase64NoPrefix(item.file)
			const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: blobData.sha
			})
		}
	}

	// --- 10. 处理站点内容 JSON 配置文件 ---
	const siteContentJson = JSON.stringify(siteContent, null, '\t') // 转换为格式化的 JSON 字符串
	const siteContentBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(siteContentJson), 'base64')
	treeItems.push({
		path: 'src/config/site-content.json',
		mode: '100644',
		type: 'blob',
		sha: siteContentBlob.sha
	})

	// --- 11. 处理卡片样式 JSON 配置文件 ---
	const cardStylesJson = JSON.stringify(cardStyles, null, '\t')
	const cardStylesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(cardStylesJson), 'base64')
	treeItems.push({
		path: 'src/config/card-styles.json',
		mode: '100644',
		type: 'blob',
		sha: cardStylesBlob.sha
	})

	// --- 12. 创建 Git Tree (文件树结构) ---
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// --- 13. 创建 Git Commit (提交) ---
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// --- 14. 更新分支引用 (将分支指向新的 Commit) ---
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 15. 完成提示
	toast.success('保存成功！')
}