// 导入 GitHub API 客户端方法：将文本转为 Base64、获取分支引用、创建树、创建提交、更新引用、创建 Blob，以及树项类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为无前缀 Base64、计算文件的 SHA-256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入获取认证令牌的方法
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 仓库相关配置常量（所有者、仓库名、分支等）
import { GITHUB_CONFIG } from '@/consts'
// 导入项目数据类型
import type { Project } from '../components/project-card'
// 导入图片上传对话框中的图片项类型
import type { ImageItem } from '../components/image-upload-dialog'
// 导入获取文件扩展名的工具函数
import { getFileExt } from '@/lib/utils'
// 导入 Sonner 轻量级消息提示库
import { toast } from 'sonner'

// 定义 pushProjects 函数的参数类型
export type PushProjectsParams = {
	projects: Project[]                      // 需要推送的项目列表
	imageItems?: Map<string, ImageItem>      // 可选的图片项 Map，键为原始图片 URL
}

/**
 * 将项目数据及关联的图片推送到 GitHub 仓库
 * 流程：获取当前分支最新提交 -> 处理图片（去重、上传为新 Blob）-> 生成树项 ->
 *       更新项目 JSON 文件 -> 创建新树 -> 创建提交 -> 更新分支引用
 * @param params - 包含项目列表和可选图片项的参数对象
 */
export async function pushProjects(params: PushProjectsParams): Promise<void> {
	// 解构获取项目数组和图片 Map
	const { projects, imageItems } = params

	// 获取 GitHub 个人访问令牌（用于 API 鉴权）
	const token = await getAuthToken()

	// 提示用户正在获取分支信息
	toast.info('正在获取分支信息...')
	// 获取目标分支（如 main）的最新引用，返回的对象包含 sha
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	// 提取最新提交的 SHA，后续创建树和提交需要基于此
	const latestCommitSha = refData.sha

	// 本次提交的信息
	const commitMessage = `更新项目列表`

	toast.info('正在准备文件...')

	// 准备要包含在新树中的文件项列表
	const treeItems: TreeItem[] = []
	// 用于记录已上传图片的哈希值，避免重复上传相同内容的图片
	const uploadedHashes = new Set<string>()
	// 浅拷贝项目列表，后续可能修改其中的 image 字段来指向新上传的图片路径
	let updatedProjects = [...projects]

	// 如果有需要上传的图片
	if (imageItems && imageItems.size > 0) {
		toast.info('正在上传图片...')
		// 遍历所有图片项
		for (const [url, imageItem] of imageItems.entries()) {
			// 仅处理用户选择上传的文件类型图片
			if (imageItem.type === 'file') {
				// 获取或计算文件的哈希（用于去重和生成唯一文件名）
				const hash = imageItem.hash || (await hashFileSHA256(imageItem.file))
				// 获取文件扩展名（含点，如 .png）
				const ext = getFileExt(imageItem.file.name)
				// 生成基于哈希的文件名，保证内容相同则文件名一致
				const filename = `${hash}${ext}`
				// 项目数据中最终引用的公共图片路径
				const publicPath = `/images/project/${filename}`

				// 如果该哈希的图片尚未上传
				if (!uploadedHashes.has(hash)) {
					// 在仓库中的完整路径（public 目录下）
					const path = `public/images/project/${filename}`
					// 将图片文件转换为不含 data:xxx;base64, 前缀的 Base64 字符串
					const contentBase64 = await fileToBase64NoPrefix(imageItem.file)
					// 调用 GitHub API 创建 Blob 对象，返回对象包含该 Blob 的 sha
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将图片文件添加到树项列表
					treeItems.push({
						path,
						mode: '100644',   // 普通文件模式
						type: 'blob',
						sha: blobData.sha
					})
					// 记录已上传的哈希，防止重复上传
					uploadedHashes.add(hash)
				}

				// 更新项目列表：将对应 url 的项目的 image 字段改为新上传的图片路径
				updatedProjects = updatedProjects.map(p => (p.url === url ? { ...p, image: publicPath } : p))
			}
		}
	}

	// 将更新后的项目列表序列化为带缩进的 JSON 字符串
	const projectsJson = JSON.stringify(updatedProjects, null, '\t')
	// 将 JSON 字符串转为 Base64（UTF-8 编码）并创建 Blob
	const projectsBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(projectsJson), 'base64')
	// 将项目列表 JSON 文件添加到树项
	treeItems.push({
		path: 'src/app/projects/list.json',  // 仓库中存放项目数据的位置
		mode: '100644',
		type: 'blob',
		sha: projectsBlob.sha
	})

	toast.info('正在创建文件树...')
	// 基于当前最新提交的树，以及本次要修改/新增的文件项，创建新的 Git 树对象
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	toast.info('正在创建提交...')
	// 创建新提交，父提交为之前获取的最新提交
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	// 强制将目标分支的引用更新到新创建的提交
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 提示用户操作成功
	toast.success('发布成功！')
}