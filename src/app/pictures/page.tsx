'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import initialList from './list.json'
import { RandomLayout } from './components/random-layout'
import UploadDialog from './components/upload-dialog'
import { pushPictures } from './services/push-pictures'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import type { ImageItem } from '../projects/components/image-upload-dialog'
import { useRouter } from 'next/navigation'

// 图片记录的数据结构，支持单图和多图两种形态
export interface Picture {
  id: string
  uploadedAt: string
  description?: string
  image?: string         // 单张图片的 URL（旧版兼容）
  images?: string[]      // 多图数组（当前主要使用）
}

export default function Page() {
  // ---- 状态与引用 ----
  const [pictures, setPictures] = useState<Picture[]>(initialList as Picture[])
  // 编辑前的原始数据副本，用于取消时恢复
  const [originalPictures, setOriginalPictures] = useState<Picture[]>(initialList as Picture[])
  // 是否处于编辑模式
  const [isEditMode, setIsEditMode] = useState(false)
  // 是否正在保存（用于按钮 loading 态）
  const [isSaving, setIsSaving] = useState(false)
  // 上传对话框显隐
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  // 存储待上传的文件对象，key 格式为 "pictureId::index"
  const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
  // 隐藏的文件上传 input 引用，用于触发密钥文件选择
  const keyInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 全局状态：是否已认证（导入了私钥）以及设置私钥的方法
  const { isAuth, setPrivateKey } = useAuthStore()
  // 站点配置，例如是否隐藏编辑按钮
  const { siteContent } = useConfigStore()
  const hideEditButton = siteContent.hideEditButton ?? false

  // ---- 事件处理 ----

  /**
   * 处理上传提交
   * 将选中的图片生成一条新的 Picture 记录，并保存文件对象到 imageItems 中
   */
  const handleUploadSubmit = ({ images, description }: { images: ImageItem[]; description: string }) => {
    const now = new Date().toISOString()

    // 校验：至少选择一张图片
    if (images.length === 0) {
      toast.error('请至少选择一张图片')
      return
    }

    // 生成唯一 ID
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const desc = description.trim() || undefined

    // 提取图片 URL（文件类型使用临时预览 URL）
    const imageUrls = images.map(imageItem =>
      imageItem.type === 'url' ? imageItem.url : imageItem.previewUrl
    )

    const newPicture: Picture = {
      id,
      uploadedAt: now,
      description: desc,
      images: imageUrls,
    }

    // 将文件类型的 ImageItem 存入 Map，供后续真正上传使用
    const newMap = new Map(imageItems)
    images.forEach((imageItem, index) => {
      if (imageItem.type === 'file') {
        newMap.set(`${id}::${index}`, imageItem)
      }
    })

    setPictures(prev => [...prev, newPicture])
    setImageItems(newMap)
    setIsUploadDialogOpen(false)
  }

  /**
   * 删除单张图片
   * @param pictureId 所属图片组的 ID
   * @param imageIndex 图片在 images 数组中的索引；若为 'single' 则表示删除整个 Picture
   */
  const handleDeleteSingleImage = (pictureId: string, imageIndex: number | 'single') => {
    // 更新 pictures 列表
    setPictures(prev => {
      return prev
        .map(picture => {
          if (picture.id !== pictureId) return picture

          // 删除整个 Picture（单图模式）
          if (imageIndex === 'single') {
            return null
          }

          // 从多图数组中移除指定索引的图片
          if (picture.images && picture.images.length > 0) {
            const newImages = picture.images.filter((_, idx) => idx !== imageIndex)
            // 如果删除后数组为空，删除整条记录
            if (newImages.length === 0) {
              return null
            }
            return {
              ...picture,
              images: newImages,
            }
          }

          return picture
        })
        .filter((p): p is Picture => p !== null)
    })

    // 同步更新 imageItems Map
    setImageItems(prev => {
      const next = new Map(prev)

      if (imageIndex === 'single') {
        // 删除该 Picture 下所有文件项
        for (const key of next.keys()) {
          if (key.startsWith(`${pictureId}::`)) {
            next.delete(key)
          }
        }
      } else {
        // 删除指定索引的文件项
        next.delete(`${pictureId}::${imageIndex}`)

        // 重新索引：删除后，后面的文件项索引需要前移
        const keysToUpdate: Array<{ oldKey: string; newKey: string }> = []
        for (const key of next.keys()) {
          if (key.startsWith(`${pictureId}::`)) {
            const [, indexStr] = key.split('::')
            const oldIndex = Number(indexStr)
            if (!isNaN(oldIndex) && oldIndex > imageIndex) {
              const newIndex = oldIndex - 1
              keysToUpdate.push({
                oldKey: key,
                newKey: `${pictureId}::${newIndex}`,
              })
            }
          }
        }

        // 执行重新索引
        for (const { oldKey, newKey } of keysToUpdate) {
          const value = next.get(oldKey)
          if (value) {
            next.set(newKey, value)
            next.delete(oldKey)
          }
        }
      }
      return next
    })
  }

  /**
   * 删除整组图片
   */
  const handleDeleteGroup = (picture: Picture) => {
    if (!confirm('确定要删除这一组图片吗？')) return

    setPictures(prev => prev.filter(p => p.id !== picture.id))
    setImageItems(prev => {
      const next = new Map(prev)
      for (const key of next.keys()) {
        if (key.startsWith(`${picture.id}::`)) {
          next.delete(key)
        }
      }
      return next
    })
  }

  /**
   * 用户选择私钥文件后的处理：读取内容并设置认证状态，紧接着触发保存
   */
  const handleChoosePrivateKey = async (file: File) => {
    try {
      const text = await file.text()
      setPrivateKey(text)
      await handleSave()
    } catch (error) {
      console.error('Failed to read private key:', error)
      toast.error('读取密钥文件失败')
    }
  }

  /**
   * 保存按钮点击：未认证则弹出文件选择框，已认证则直接保存
   */
  const handleSaveClick = () => {
    if (!isAuth) {
      keyInputRef.current?.click()
    } else {
      handleSave()
    }
  }

  /**
   * 执行保存：调用 pushPictures 将图片数据及文件发送至远端
   */
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await pushPictures({
        pictures,
        imageItems,
      })

      // 保存成功后更新原始副本，清空临时文件映射，退出编辑模式
      setOriginalPictures(pictures)
      setImageItems(new Map())
      setIsEditMode(false)
      toast.success('保存成功！')
    } catch (error: any) {
      console.error('Failed to save:', error)
      toast.error(`保存失败: ${error?.message || '未知错误'}`)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * 取消编辑：恢复原始数据，清空临时文件，退出编辑模式
   */
  const handleCancel = () => {
    setPictures(originalPictures)
    setImageItems(new Map())
    setIsEditMode(false)
  }

  // 根据认证状态动态显示按钮文字
  const buttonText = isAuth ? '保存' : '导入密钥'

  // ---- 快捷键：Ctrl/Cmd + , 进入编辑模式 ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsEditMode(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditMode])

  // ---- 渲染 ----
  return (
    <>
      {/* 隐藏的文件输入，用于导入 .pem 私钥文件 */}
      <input
        ref={keyInputRef}
        type="file"
        accept=".pem"
        className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0]
          if (f) await handleChoosePrivateKey(f)
          // 清空 value，允许重复选择同一个文件
          if (e.currentTarget) e.currentTarget.value = ''
        }}
      />

      {/* 随机布局的图片展示区 */}
      <RandomLayout
        pictures={pictures}
        isEditMode={isEditMode}
        onDeleteSingle={handleDeleteSingleImage}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* 无图片时的空状态提示 */}
      {pictures.length === 0 && (
        <div className="text-secondary flex min-h-screen items-center justify-center text-center text-sm">
          还没有上传图片，点击右上角「编辑」后即可开始上传。
        </div>
      )}

      {/* 右上角操作按钮区域（大屏幕可见，小屏幕隐藏） */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-4 right-6 flex gap-3 max-sm:hidden"
      >
        {isEditMode ? (
          // 编辑模式下的按钮组
          <>
            {/* 跳转图片压缩工具 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/image-toolbox')}
              className="rounded-xl border bg-blue-50 px-4 py-2 text-sm text-blue-700"
            >
              压缩工具
            </motion.button>

            {/* 取消编辑 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-xl border bg-white/60 px-6 py-2 text-sm"
            >
              取消
            </motion.button>

            {/* 打开上传对话框 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUploadDialogOpen(true)}
              className="rounded-xl border bg-white/60 px-6 py-2 text-sm"
            >
              上传
            </motion.button>

            {/* 保存 / 导入密钥 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveClick}
              disabled={isSaving}
              className="brand-btn px-6"
            >
              {isSaving ? '保存中...' : buttonText}
            </motion.button>
          </>
        ) : (
          // 非编辑模式下，若配置未隐藏编辑按钮则显示「编辑」
          !hideEditButton && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditMode(true)}
              className="rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80"
            >
              编辑
            </motion.button>
          )
        )}
      </motion.div>

      {/* 上传对话框（条件渲染） */}
      {isUploadDialogOpen && (
        <UploadDialog
          onClose={() => setIsUploadDialogOpen(false)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  )
}