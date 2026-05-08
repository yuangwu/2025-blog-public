import { useCallback } from 'react' // React 缓存函数引用，避免不必要的重渲染
import { readFileAsText } from '@/lib/file-utils' // 工具函数：读取 File 对象内容为文本
import { toast } from 'sonner' // 轻量通知库，用于显示操作结果提示
import { pushBlog } from '../services/push-blog' // 发布/更新博客的 API 服务
import { deleteBlog } from '../services/delete-blog' // 删除博客的 API 服务
import { useWriteStore } from '../stores/write-store' // 写作编辑器的全局状态管理（Zustand / 类似实现）
import { useAuthStore } from '@/hooks/use-auth' // 认证信息（如私钥、登录状态）的全局 store

/**
 * 博客发布相关逻辑的自定义 Hook
 * - 封装了选择密钥、发布/更新、删除的操作与状态
 * - 返回组件可直接使用的状态和方法
 */
export function usePublish() {
  // 从写作状态中解构所需的字段与方法
  const { loading, setLoading, form, cover, images, mode, originalSlug } = useWriteStore()
  // 从认证状态中解构是否已认证、设置私钥的方法
  const { isAuth, setPrivateKey } = useAuthStore()

  /**
   * 选择私钥文件并保存到全局状态
   * - 常用于为博客签名或认证身份
   * - 使用 useCallback 缓存，依赖 setPrivateKey 稳定不变
   */
  const onChoosePrivateKey = useCallback(
    async (file: File) => {
      const pem = await readFileAsText(file) // 将文件读取为 PEM 格式文本
      setPrivateKey(pem) // 存入全局认证 store
    },
    [setPrivateKey]
  )

  /**
   * 发布或更新博客
   * - 根据 mode（'edit' 或 'create'）调用 pushBlog 服务
   * - 成功后弹出对应提示
   * - 所有依赖项变化时会重新创建该函数
   */
  const onPublish = useCallback(async () => {
    try {
      setLoading(true) // 进入加载态，按钮可显示 loading 状态
      await pushBlog({
        form,          // 博客表单数据（标题、内容、标签等）
        cover,         // 封面文件或已上传的封面信息
        images,        // 正文内插入的图片列表
        mode,          // 'create' | 'edit'
        originalSlug   // 原始 Slug（编辑时用于定位原文章）
      })

      // 根据操作模式显示对应的成功提示
      const successMsg = mode === 'edit' ? '更新成功' : '发布成功'
      toast.success(successMsg)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || '操作失败')
    } finally {
      setLoading(false) // 无论成功或失败，结束加载态
    }
  }, [form, cover, images, mode, originalSlug, setLoading]) // 声明依赖，确保使用最新数据

  /**
   * 删除当前博客
   * - 优先使用 originalSlug（通常是编辑时的原 Slug），否则使用表单中的 slug
   * - 若缺少 slug 则直接提示并中断
   * - 注意：此处成功删除后未显式弹出成功 toast，可能由 deleteBlog 服务内部处理，
   *   或由调用方根据后续路由跳转/列表刷新体现结果，属于设计选择
   */
  const onDelete = useCallback(async () => {
    const targetSlug = originalSlug || form.slug
    if (!targetSlug) {
      toast.error('缺少 slug，无法删除')
      return
    }
    try {
      setLoading(true)
      await deleteBlog(targetSlug) // 调用删除 API，传入目标 Slug
      // 若需明确反馈，可在此处添加 toast.success('删除成功')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || '删除失败')
    } finally {
      setLoading(false)
    }
  }, [form.slug, originalSlug, setLoading]) // 依赖 slug 相关值，确保拿到最新标识

  // 返回组件可消费的接口
  return {
    isAuth,               // 是否已拥有私钥（可用于页面权限判断）
    loading,              // 当前是否正在执行发布/删除等操作
    onChoosePrivateKey,   // 绑定到文件选择器 onChange 的处理函数
    onPublish,            // 绑定到发布/更新按钮
    onDelete              // 绑定到删除按钮
  }
}