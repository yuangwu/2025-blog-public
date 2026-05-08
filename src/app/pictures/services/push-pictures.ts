// 从自定义的 GitHub 客户端库导入操作 Git 对象所需的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, readTextFileFromRepo, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为不带前缀的 Base64、计算文件的 SHA-256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入获取认证 token 的函数
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置常量（如仓库所有者、仓库名、分支名）
import { GITHUB_CONFIG } from '@/consts'
// 导入图片上传对话框中使用的图片项类型定义
import type { ImageItem } from '../../projects/components/image-upload-dialog'
// 导入获取文件扩展名的工具函数
import { getFileExt } from '@/lib/utils'
// 导入 toast 通知库（用于界面提示）
import { toast } from 'sonner'
// 导入 Picture 类型（定义在某个 page 文件中）
import { Picture } from '../page'

// 定义 pushPictures 函数的参数类型
export type PushPicturesParams = {
	pictures: Picture[]                     // 当前要发布的图片列表数据
	imageItems?: Map<string, ImageItem>    // 可选，需要上传的新图片文件映射，键为 "groupId::index" 格式
}

/**
 * 将图片列表数据及新增图片文件推送到 GitHub 仓库的指定分支
 * 流程：获取分支最新 commit → 上传新图片文件 blob → 构建树对象 → 创建 commit → 更新分支引用
 * 同时会基于上一次的 list.json 数据，删除不再被引用的图片文件
 * @param params 包含 pictures 数组和可选的 imageItems 映射
 */
export async function pushPictures(params: PushPicturesParams): Promise<void> {
	const { pictures, imageItems } = params

	// 1. 获取认证令牌
	const token = await getAuthToken()

	// 2. 获取目标分支的最新引用信息（得到最新 commit 的 SHA）
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 提交信息
	const commitMessage = `更新图床列表`

	toast.info('正在准备文件...')

	// 用于构建新 tree 的条目列表
	const treeItems: TreeItem[] = []

	// 记录本次已经上传过的文件哈希，避免重复上传相同文件
	const uploadedHashes = new Set<string>()

	// 深拷贝 pictures 数组，后续会修改其中的图片路径为新上传的公共路径
	let updatedPictures = [...pictures]

	// 3. 处理需要上传的新图片文件
	if (imageItems && imageItems.size > 0) {
		toast.info('正在上传图片...')
		for (const [key, imageItem] of imageItems.entries()) {
			// 只处理文件类型（排除 URL 类型）
			if (imageItem.type === 'file') {
				// 计算或获取文件内容的哈希值（用于去重和文件名）
				const hash = imageItem.hash || (await hashFileSHA256(imageItem.file))
				// 获取文件扩展名
				const ext = getFileExt(imageItem.file.name)
				// 组合成唯一文件名
				const filename = `${hash}${ext}`
				// 生成图片在站点中的公开访问路径
				const publicPath = `/images/pictures/${filename}`

				// 如果该哈希文件尚未在本次上传中处理过，则执行上传
				if (!uploadedHashes.has(hash)) {
					// 图片在仓库中的实际存储路径
					const path = `public/images/pictures/${filename}`
					// 将文件内容转为 Base64（去除了 data URI 前缀）
					const contentBase64 = await fileToBase64NoPrefix(imageItem.file)
					// 创建 Git blob 对象并获取其 SHA
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将该 blob 添加为 tree 的一个条目
					treeItems.push({
						path,
						mode: '100644',  // 普通文件模式
						type: 'blob',
						sha: blobData.sha
					})
					// 标记该哈希已上传，避免重复
					uploadedHashes.add(hash)
				}

				// 从 key 中解析出 groupId 和索引，key 格式为 "groupId::index"
				const [groupId, indexStr] = key.split('::')
				const imageIndex = Number(indexStr) || 0

				// 更新对应 Picture 中的图片路径为新上传的 publicPath
				updatedPictures = updatedPictures.map(p => {
					if (p.id !== groupId) return p

					// 统一处理单图和多图字段：优先使用 images 数组
					const currentImages = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : []

					// 替换指定索引处的图片路径
					const nextImages = currentImages.map((img, idx) => (idx === imageIndex ? publicPath : img))

					return {
						...p,
						image: undefined,     // 弃用单图字段，统一使用 images
						images: nextImages
					}
				})
			}
		}
	}

	// 4. 收集更新后所有引用的图片 URL（用于后续检测需要删除的废弃图片）
	const currentImageUrls = new Set<string>()
	for (const picture of updatedPictures) {
		if (picture.image) {
			currentImageUrls.add(picture.image)
		}
		if (picture.images && picture.images.length > 0) {
			picture.images.forEach(url => currentImageUrls.add(url))
		}
	}

	// 5. 读取仓库中当前的 list.json 内容，找出不再被引用的旧图片文件并标记为删除
	toast.info('正在检查需要删除的文件...')
	const previousListJson = await readTextFileFromRepo(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		'src/app/pictures/list.json',
		GITHUB_CONFIG.BRANCH
	)

	if (previousListJson) {
		try {
			const previousPictures: Picture[] = JSON.parse(previousListJson)
			const previousImageUrls = new Set<string>()
			
			// 收集旧数据中的所有图片 URL
			for (const picture of previousPictures) {
				if (picture.image) {
					previousImageUrls.add(picture.image)
				}
				if (picture.images && picture.images.length > 0) {
					picture.images.forEach(url => previousImageUrls.add(url))
				}
			}

			// 找出旧引用中、当前不再使用并且位于本地图片目录下的文件
			for (const url of previousImageUrls) {
				if (!currentImageUrls.has(url) && url.startsWith('/images/pictures/')) {
					// 这是一个需要删除的本地图片文件
					const filename = url.replace('/images/pictures/', '')
					const path = `public/images/pictures/${filename}`
					// 在 tree 中添加一个 sha 为 null 的条目表示删除该文件
					treeItems.push({
						path,
						mode: '100644',
						type: 'blob',
						sha: null
					})
				}
			}
		} catch (error) {
			console.error('Failed to parse previous list.json:', error)
		}
	}

	// 6. 序列化更新后的 pictures 数据并创建对应的 blob
	const picturesJson = JSON.stringify(updatedPictures, null, '\t')
	const picturesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(picturesJson), 'base64')
	// 将 list.json 的更新加入 tree 条目
	treeItems.push({
		path: 'src/app/pictures/list.json',
		mode: '100644',
		type: 'blob',
		sha: picturesBlob.sha
	})

	// 7. 基于已有树条目和基础 commit 创建新的 tree 对象
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 8. 创建 commit，父 commit 为之前的最新 commit
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 9. 更新分支引用，使其指向新 commit
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 10. 发布成功提示
	toast.success('发布成功！')
}