import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, readTextFileFromRepo, type TreeItem } from '@/lib/github-client'
// 导入 GitHub 操作相关函数和类型：用于 Base64 编码、获取引用、创建树、提交、更新引用、创建 blob，以及从仓库读取文件
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入文件处理工具：将文件转为不含前缀的 base64，计算文件的 SHA-256 哈希
import { getAuthToken } from '@/lib/auth'
// 导入获取身份验证令牌的函数
import { GITHUB_CONFIG } from '@/consts'
// 导入 GitHub 相关常量配置（拥有者、仓库名、分支等）
import type { ImageItem } from '../../projects/components/image-upload-dialog'
// 仅导入类型：图片上传对话框中的图片项结构，避免运行时依赖
import { getFileExt } from '@/lib/utils'
// 导入工具函数：获取文件扩展名
import { toast } from 'sonner'
// 导入 toast 通知库
import { Picture } from '../page'
// 导入 Picture 类型定义，来自当前页面的模块

/** 推送到 GitHub 的参数类型 */
export type PushPicturesParams = {
	/** 图片数据列表 */
	pictures: Picture[]
	/** 可选的图片项映射表，key 为 "groupId::index"，value 为图片项数据 */
	imageItems?: Map<string, ImageItem>
}

/**
 * 将图片数据推送到 GitHub 仓库
 * 步骤：
 * 1. 获取分支最新引用
 * 2. 如果有新图片文件，上传至 public/images/pictures/ 并更新数据中的路径
 * 3. 读取旧的 list.json，找出不再使用的图片，标记为删除（sha 设为 null）
 * 4. 将更新后的 pictures 数组写入新的 list.json
 * 5. 创建 Git 树、提交并更新分支引用
 *
 * @param params - 包含 pictures 和可选的 imageItems 的参数对象
 */
export async function pushPictures(params: PushPicturesParams): Promise<void> {
	const { pictures, imageItems } = params

	// 获取 GitHub 访问令牌
	const token = await getAuthToken()

	// 提示：正在获取分支信息
	toast.info('正在获取分支信息...')
	// 获取指定分支的最新引用
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha // 最新提交的 SHA

	// 提交信息
	const commitMessage = `更新图床列表`

	toast.info('正在准备文件...')

	// 用于构建 Git 树的条目数组
	const treeItems: TreeItem[] = []
	// 记录已经上传过的图片哈希，避免重复上传同一个文件
	const uploadedHashes = new Set<string>()
	// 复制一份 pictures 用于更新
	let updatedPictures = [...pictures]

	// 如果有需要新上传的图片文件
	if (imageItems && imageItems.size > 0) {
		toast.info('正在上传图片...')
		// 遍历所有待处理的图片项
		for (const [key, imageItem] of imageItems.entries()) {
			// 只处理文件类型的图片项
			if (imageItem.type === 'file') {
				// 获取文件的哈希值，如果已有则直接用，否则计算
				const hash = imageItem.hash || (await hashFileSHA256(imageItem.file))
				// 获取文件扩展名
				const ext = getFileExt(imageItem.file.name)
				// 生成最终文件名：哈希值 + 扩展名
				const filename = `${hash}${ext}`
				// 对应网站上的公开访问路径
				const publicPath = `/images/pictures/${filename}`

				// 如果这个哈希还没有被上传过
				if (!uploadedHashes.has(hash)) {
					// 仓库中的实际路径
					const path = `public/images/pictures/${filename}`
					// 将文件转为 base64（不含协议前缀）
					const contentBase64 = await fileToBase64NoPrefix(imageItem.file)
					// 创建 Git blob 对象
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 添加树条目
					treeItems.push({
						path,
						mode: '100644', // 普通文件
						type: 'blob',
						sha: blobData.sha
					})
					// 标记该哈希已上传
					uploadedHashes.add(hash)
				}

				// 解析 key，格式为 "groupId::index"，获取分组 id 和图片索引
				const [groupId, indexStr] = key.split('::')
				const imageIndex = Number(indexStr) || 0

				// 更新对应 picture 中的图片路径
				updatedPictures = updatedPictures.map(p => {
					// 只处理匹配的分组
					if (p.id !== groupId) return p

					// 统一 images 字段，兼容旧的 image 单一字段
					const currentImages = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : []

					// 替换指定索引处的图片为新的 publicPath
					const nextImages = currentImages.map((img, idx) => (idx === imageIndex ? publicPath : img))

					return {
						...p,
						image: undefined, // 清除旧的单图字段
						images: nextImages // 使用更新后的 images 数组
					}
				})
			}
		}
	}

	// 收集更新后所有正在使用的图片 URL
	const currentImageUrls = new Set<string>()
	for (const picture of updatedPictures) {
		if (picture.image) {
			currentImageUrls.add(picture.image)
		}
		if (picture.images && picture.images.length > 0) {
			picture.images.forEach(url => currentImageUrls.add(url))
		}
	}

	// 读取仓库中现有的 list.json 文件内容
	toast.info('正在检查需要删除的文件...')
	const previousListJson = await readTextFileFromRepo(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		'src/app/pictures/list.json',
		GITHUB_CONFIG.BRANCH
	)

	// 如果成功读取到旧文件
	if (previousListJson) {
		try {
			// 解析旧的图片列表
			const previousPictures: Picture[] = JSON.parse(previousListJson)
			const previousImageUrls = new Set<string>()
			
			// 收集旧列表中所有图片 URL
			for (const picture of previousPictures) {
				if (picture.image) {
					previousImageUrls.add(picture.image)
				}
				if (picture.images && picture.images.length > 0) {
					picture.images.forEach(url => previousImageUrls.add(url))
				}
			}

			// 找出不再使用的本地图片，标记为删除
			for (const url of previousImageUrls) {
				// 如果旧 URL 不在新列表中，且是本地图片路径
				if (!currentImageUrls.has(url) && url.startsWith('/images/pictures/')) {
					// 提取文件名
					const filename = url.replace('/images/pictures/', '')
					const path = `public/images/pictures/${filename}`
					// 添加一个 sha 为 null 的条目，表示删除该文件
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

	// 将更新后的图片列表序列化为 JSON 字符串（带缩进）
	const picturesJson = JSON.stringify(updatedPictures, null, '\t')
	// 创建 list.json 对应的 Git blob
	const picturesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(picturesJson), 'base64')
	// 将 list.json 的树条目加入树中
	treeItems.push({
		path: 'src/app/pictures/list.json',
		mode: '100644',
		type: 'blob',
		sha: picturesBlob.sha
	})

	// 创建 Git 树对象
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 创建提交对象
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 将分支引用更新到新提交
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 操作完成，提示成功
	toast.success('发布成功！')
}
