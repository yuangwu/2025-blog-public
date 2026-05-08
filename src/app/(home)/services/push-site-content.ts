// 从 GitHub 客户端工具库导入与 Git 操作相关的函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 获取 GitHub 认证 token 的工具函数
import { getAuthToken } from '@/lib/auth'
// GitHub 仓库、分支等配置常量
import { GITHUB_CONFIG } from '@/consts'
// 用于显示操作提示的轻量级 toast 库
import { toast } from 'sonner'
// 将文件对象转换为不含 "data:..." 前缀的 Base64 字符串
import { fileToBase64NoPrefix } from '@/lib/file-utils'
// 引入站点内容和卡片样式的类型定义
import type { SiteContent, CardStyles } from '../stores/config-store'
// 引入文件上传项及各类图片上传状态的类型
import type { FileItem, ArtImageUploads, SocialButtonImageUploads, BackgroundImageUploads } from '../config-dialog/site-settings'

// 从 SiteContent 类型中提取单个 Art 图片配置的类型
type ArtImageConfig = SiteContent['artImages'][number]
// 从 SiteContent 类型中提取单个背景图片配置的类型
type BackgroundImageConfig = SiteContent['backgroundImages'][number]

/**
 * 将站点配置与多媒体文件推送到 GitHub 仓库
 * @param siteContent - 当前站点内容配置（包含文本、链接、图片等信息）
 * @param cardStyles - 卡片展示样式配置
 * @param faviconItem - 可能包含新 favicon 文件的 FileItem
 * @param avatarItem - 可能包含新头像文件的 FileItem
 * @param artImageUploads - 待上传的艺术图片（键为图片 ID）
 * @param removedArtImages - 需要删除的艺术图片配置
 * @param backgroundImageUploads - 待上传的背景图片
 * @param removedBackgroundImages - 需要删除的背景图片配置
 * @param socialButtonImageUploads - 待上传的社交按钮图片
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
	// 获取当前用户的 GitHub 访问令牌
	const token = await getAuthToken()

	// 提示：获取最新的分支引用
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha // 最新提交的 SHA，作为新提交的父节点

	const commitMessage = `更新站点配置` // 本次提交的信息

	// 提示：准备要提交的文件列表
	toast.info('正在准备文件...')

	// 用于构建新 tree 的文件项数组
	const treeItems: TreeItem[] = []

	// 处理 Favicon 上传
	if (faviconItem?.type === 'file') {
		toast.info('正在上传 Favicon...')
		// 将文件转换为纯净的 Base64 字符串
		const contentBase64 = await fileToBase64NoPrefix(faviconItem.file)
		// 创建 Git Blob 对象
		const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
		// 添加到 tree 列表，路径为 public/favicon.png
		treeItems.push({
			path: 'public/favicon.png',
			mode: '100644',   // 普通文件
			type: 'blob',
			sha: blobData.sha
		})
	}

	// 处理头像上传
	if (avatarItem?.type === 'file') {
		toast.info('正在上传 Avatar...')
		const contentBase64 = await fileToBase64NoPrefix(avatarItem.file)
		const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
		// 头像统一存储在 public/images/avatar.png
		treeItems.push({
			path: 'public/images/avatar.png',
			mode: '100644',
			type: 'blob',
			sha: blobData.sha
		})
	}

	// 处理艺术图片上传
	if (artImageUploads) {
		for (const [id, item] of Object.entries(artImageUploads)) {
			if (item.type !== 'file') continue // 跳过非文件项

			// 查找对应的 Art 图片配置
			const artConfig = siteContent.artImages?.find(art => art.id === id)
			if (!artConfig) continue

			// 构造本地文件路径：将 /images/... 映射到 public/images/...
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

	// 处理艺术图片删除（将文件的 sha 设为 null，GitHub 会将其从仓库中移除）
	if (removedArtImages && removedArtImages.length > 0) {
		for (const art of removedArtImages) {
			const normalizedUrlPath = art.url.startsWith('/') ? art.url : `/${art.url}`
			const path = `public${normalizedUrlPath}`
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null // 标记为删除
			})
		}
	}

	// 处理背景图片上传（仅上传 URL 以 /images/background/ 开头的本地文件）
	if (backgroundImageUploads) {
		for (const [id, item] of Object.entries(backgroundImageUploads)) {
			if (item.type !== 'file') continue

			const bgConfig = siteContent.backgroundImages?.find(bg => bg.id === id)
			if (!bgConfig) continue

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

	// 处理背景图片删除
	if (removedBackgroundImages && removedBackgroundImages.length > 0) {
		for (const bg of removedBackgroundImages) {
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

	// 处理社交按钮图片上传（仅处理 URL 以 /images/social-buttons/ 开头的本地文件）
	if (socialButtonImageUploads) {
		for (const [buttonId, item] of Object.entries(socialButtonImageUploads)) {
			if (item.type !== 'file') continue

			const button = siteContent.socialButtons?.find(btn => btn.id === buttonId)
			if (!button) continue

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

	// 将站点内容对象序列化为 JSON，并以 UTF-8 编码转为 Base64 上传
	const siteContentJson = JSON.stringify(siteContent, null, '\t')
	const siteContentBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(siteContentJson), 'base64')
	treeItems.push({
		path: 'src/config/site-content.json',  // 站点内容配置文件路径
		mode: '100644',
		type: 'blob',
		sha: siteContentBlob.sha
	})

	// 同样将卡片样式 JSON 上传到仓库
	const cardStylesJson = JSON.stringify(cardStyles, null, '\t')
	const cardStylesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(cardStylesJson), 'base64')
	treeItems.push({
		path: 'src/config/card-styles.json',
		mode: '100644',
		type: 'blob',
		sha: cardStylesBlob.sha
	})

	// 基于收集到的 tree 项创建 Git Tree 对象
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 创建一个新的提交，父提交为之前获取到的分支最新提交
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 将分支引用更新到新创建的提交
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 所有操作成功完成，显示成功提示
	toast.success('保存成功！')
}
