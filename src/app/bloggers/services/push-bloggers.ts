// 导入 GitHub API 相关工具方法与类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件工具：转 Base64、计算文件 SHA256
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入认证工具：获取 GitHub 访问令牌
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 配置：仓库所有者、仓库名、分支名
import { GITHUB_CONFIG } from '@/consts'
// 导入业务类型
import type { Blogger } from '../grid-view'
import type { AvatarItem } from '../components/avatar-upload-dialog'
// 导入通用工具：获取文件后缀名
import { getFileExt } from '@/lib/utils'
// 导入消息提示组件
import { toast } from 'sonner'

/**
 * 推送博主数据到 GitHub 的参数类型
 * @param bloggers 博主列表数据
 * @param avatarItems 待上传的头像文件映射（可选）
 */
export type PushBloggersParams = {
  bloggers: Blogger[]
  avatarItems?: Map<string, AvatarItem>
}

/**
 * 【核心方法】将博主列表 + 头像文件推送到 GitHub 仓库
 * 流程：获取认证 → 获取最新提交 → 上传头像 → 生成博主 JSON → 创建树 → 创建提交 → 更新分支
 * @param params 推送参数
 */
export async function pushBloggers(params: PushBloggersParams): Promise<void> {
  // 解构参数
  const { bloggers, avatarItems } = params

  // 1. 获取 GitHub 认证令牌
  const token = await getAuthToken()

  // 2. 获取目标分支的最新引用信息（拿到最新提交 SHA）
  toast.info('正在获取分支信息...')
  const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
  const latestCommitSha = refData.sha

  // 提交说明信息
  const commitMessage = `更新博主列表`

  toast.info('正在准备文件...')

  // 用于存放所有要提交到 GitHub 的文件节点（头像 + list.json）
  const treeItems: TreeItem[] = []
  // 记录已上传的头像哈希，避免重复上传
  const uploadedHashes = new Set<string>()
  // 拷贝一份博主列表，用于更新头像路径
  let updatedBloggers = [...bloggers]

  // ==============================================
  // 3. 处理头像上传逻辑
  // ==============================================
  if (avatarItems && avatarItems.size > 0) {
    toast.info('正在上传头像...')

    // 遍历所有待上传的头像
    for (const [url, avatarItem] of avatarItems.entries()) {
      // 只处理本地文件类型的头像
      if (avatarItem.type === 'file') {
        // 计算文件唯一哈希（已计算则直接使用）
        const hash = avatarItem.hash || (await hashFileSHA256(avatarItem.file))
        // 获取文件后缀
        const ext = getFileExt(avatarItem.file.name)
        // 生成头像文件名：哈希值 + 后缀
        const filename = `${hash}${ext}`
        // 前端可访问的公共路径
        const publicPath = `/images/blogger/${filename}`

        // 未上传过的头像才执行上传
        if (!uploadedHashes.has(hash)) {
          // GitHub 仓库内的完整路径
          const path = `public/images/blogger/${filename}`
          // 将文件转为无前缀 Base64
          const contentBase64 = await fileToBase64NoPrefix(avatarItem.file)
          // 在 GitHub 创建 Blob（文件二进制对象）
          const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')

          // 将该文件加入提交树
          treeItems.push({
            path,
            mode: '100644', // 文件权限（普通文件）
            type: 'blob',   // 类型为文件
            sha: blobData.sha
          })

          // 标记为已上传
          uploadedHashes.add(hash)
        }

        // 更新对应博主的头像路径为线上地址
        updatedBloggers = updatedBloggers.map(b =>
          b.url === url ? { ...b, avatar: publicPath } : b
        )
      }
    }
  }

  // ==============================================
  // 4. 生成并上传博主列表 JSON 文件
  // ==============================================
  const bloggersJson = JSON.stringify(updatedBloggers, null, '\t')
  // 创建 JSON 文件的 Blob
  const bloggersBlob = await createBlob(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    toBase64Utf8(bloggersJson),
    'base64'
  )

  // 将 JSON 文件加入提交树
  treeItems.push({
    path: 'src/app/bloggers/list.json',
    mode: '100644',
    type: 'blob',
    sha: bloggersBlob.sha
  })

  // ==============================================
  // 5. 创建 GitHub 树（所有待提交文件的集合）
  // ==============================================
  toast.info('正在创建文件树...')
  const treeData = await createTree(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    treeItems,
    latestCommitSha
  )

  // ==============================================
  // 6. 创建提交（Commit）
  // ==============================================
  toast.info('正在创建提交...')
  const commitData = await createCommit(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    commitMessage,
    treeData.sha,
    [latestCommitSha]
  )

  // ==============================================
  // 7. 更新分支引用，完成推送
  // ==============================================
  toast.info('正在更新分支...')
  await updateRef(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    `heads/${GITHUB_CONFIG.BRANCH}`,
    commitData.sha
  )

  // 推送成功提示
  toast.success('发布成功！')
}