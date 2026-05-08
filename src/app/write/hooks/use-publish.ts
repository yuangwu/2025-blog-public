import { useCallback } from 'react'
// 文件读取工具：将 File 对象读取为文本
import { readFileAsText } from '@/lib/file-utils'
// 轻量 toast 通知库
import { toast } from 'sonner'
// 发布/更新博客的接口服务
import { pushBlog } from '../services/push-blog'
// 删除博客的接口服务
import { deleteBlog } from '../services/delete-blog'
// 写文章页面的全局状态管理（Zustand store）
import { useWriteStore } from '../stores/write-store'
// 身份认证 hook，管理私钥和认证状态
import { useAuthStore } from '@/hooks/use-auth'

/**
 * 发布/更新/删除博客的相关逻辑 hook
 * 统一管理发布、选择私钥、删除的操作与状态
 */
export function usePublish() {
	// 从写文章 store 中取出需要的数据和方法
	const { loading, setLoading, form, cover, images, mode, originalSlug } = useWriteStore()
	// 从认证 store 中取出认证状态和设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()

	/**
	 * 选择私钥文件并读取成文本保存到 store
	 * 使用 useCallback 避免不必要的重新创建
	 */
	const onChoosePrivateKey = useCallback(
		async (file: File) => {
			// 将用户选择的文件读取为 PEM 格式文本
			const pem = await readFileAsText(file)
			// 存入全局 auth store 中
			setPrivateKey(pem)
		},
		[setPrivateKey]
	)

	/**
	 * 发布/更新博客
	 * 根据 mode 判断是新建还是编辑，成功后弹出对应提示
	 */
	const onPublish = useCallback(async () => {
		try {
			// 开始加载状态，可用于按钮 loading 等 UI 控制
			setLoading(true)
			// 调用接口发布博客，传入表单、封面、图片列表、模式与原始 slug
			await pushBlog({
				form,
				cover,
				images,
				mode,
				originalSlug,
			})

			// 根据模式显示不同的成功提示
			const successMsg = mode === 'edit' ? '更新成功' : '发布成功'
			toast.success(successMsg)
		} catch (err: any) {
			console.error(err)
			// 发生错误时弹出错误消息，优先使用接口返回的消息
			toast.error(err?.message || '操作失败')
		} finally {
			// 无论成功或失败，都要关闭加载状态
			setLoading(false)
		}
	}, [form, cover, images, mode, originalSlug, setLoading])

	/**
	 * 删除当前博客
	 * 优先使用 originalSlug（编辑时），否则使用表单中的 slug
	 * 没有 slug 时直接提示错误并终止
	 */
	const onDelete = useCallback(async () => {
		// 需要删除的目标标识，编辑模式下用原始 slug，新建模式下用当前表单的 slug
		const targetSlug = originalSlug || form.slug
		if (!targetSlug) {
			toast.error('缺少 slug，无法删除')
			return
		}
		try {
			setLoading(true)
			// 调用删除接口
			await deleteBlog(targetSlug)
		} catch (err: any) {
			console.error(err)
			toast.error(err?.message || '删除失败')
		} finally {
			setLoading(false)
		}
	}, [form.slug, originalSlug, setLoading])

	// 对外暴露状态和方法
	return {
		isAuth,            // 当前是否已认证（已提供私钥）
		loading,           // 当前是否有操作正在进行
		onChoosePrivateKey,// 选择私钥文件的回调
		onPublish,         // 发布/更新的回调
		onDelete,          // 删除的回调
	}
}
