'use client'

// 引入 React 的状态和引用 Hook
import { useState, useRef } from 'react'
// 引入 sonner 的 toast 通知方法，用于展示提示信息
import { toast } from 'sonner'
// 引入 lucide-react 图标库中的加号图标
import { Plus } from 'lucide-react'
// 引入自定义的通用弹窗组件
import { DialogModal } from '@/components/dialog-modal'

/**
 * 定义图片项的数据类型
 * 可以是网络 URL 或者本地文件对象
 */
export type ImageItem =
  | { type: 'url'; url: string }
  | { type: 'file'; file: File; previewUrl: string; hash?: string }

/**
 * 图片上传弹窗组件的属性接口
 */
interface ImageUploadDialogProps {
  /** 当前已有的图片 URL（例如编辑时回显） */
  currentImage?: string
  /** 关闭弹窗的回调函数 */
  onClose: () => void
  /** 提交图片时触发的回调，传入用户选择的 ImageItem */
  onSubmit: (image: ImageItem) => void
}

/**
 * 图片上传/输入弹窗组件
 * 支持本地文件上传和直接输入图片 URL 两种方式
 */
export default function ImageUploadDialog({
  currentImage,
  onClose,
  onSubmit,
}: ImageUploadDialogProps) {
  // 管理 URL 输入框的内容
  const [urlInput, setUrlInput] = useState(currentImage || '')
  // 管理选中的本地文件及其生成的预览 URL
  const [previewFile, setPreviewFile] = useState<{
    file: File
    previewUrl: string
  } | null>(null)
  // 隐藏的原生文件选择 input 的引用，用于触发文件选择窗口
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理本地文件的选择
   * 校验是否为图片类型，并生成预览地址
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件 MIME 类型是否以 image/ 开头
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 通过文件对象生成一个临时的可预览 URL
    const previewUrl = URL.createObjectURL(file)
    setPreviewFile({ file, previewUrl })
    // 清空 URL 输入，避免与本地文件产生视觉歧义
    setUrlInput('')
  }

  /**
   * 表单提交处理
   * 优先选择本地文件，其次使用输入的 URL
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (previewFile) {
      // 提交本地文件类型的数据
      onSubmit({
        type: 'file',
        file: previewFile.file,
        previewUrl: previewFile.previewUrl,
      })
    } else if (urlInput.trim()) {
      // 提交 URL 类型的数据
      onSubmit({
        type: 'url',
        url: urlInput.trim(),
      })
    } else {
      // 如果用户既没有选择文件也没有输入有效 URL，给出提示
      toast.error('请上传图片或输入 URL')
      return
    }

    // 提交成功后重置内部状态并关闭弹窗
    setPreviewFile(null)
    setUrlInput(currentImage || '')
    onClose()
  }

  /**
   * 弹窗关闭时的处理
   * 释放通过 createObjectURL 创建的临时 URL 资源
   */
  const handleClose = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.previewUrl)
    }
    setPreviewFile(null)
    setUrlInput(currentImage || '')
    onClose()
  }

  return (
    <DialogModal open onClose={handleClose} className="card w-md">
      <h2 className="mb-4 text-xl font-bold">选择图片</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 本地上传区域 */}
        <div>
          <label className="text-secondary mb-2 block text-sm font-medium">
            上传图片
          </label>
          {/* 隐藏的原生文件选择输入框 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* 可点击的上传预览区域，点击后触发隐藏的文件选择框 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200"
          >
            {previewFile ? (
              /* 已选文件的预览图 */
              <img
                src={previewFile.previewUrl}
                alt="preview"
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              /* 未选择文件时的占位提示 */
              <div className="text-center">
                <Plus className="text-secondary mx-auto mb-1 h-8 w-8" />
                <p className="text-secondary text-xs">点击上传图片</p>
              </div>
            )}
          </div>
        </div>

        {/* 分割线 “或” */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="text-secondary rounded-lg bg-white px-4 py-1">
              或
            </span>
          </div>
        </div>

        {/* 图片 URL 输入区域 */}
        <div>
          <label className="text-secondary mb-2 block text-sm font-medium">
            图片 URL
          </label>
          <input
            type="url"
            value={urlInput}
            onChange={e => {
              setUrlInput(e.target.value)
              // 当用户开始输入 URL 时，清除已选择的本地文件及其预览
              if (previewFile) {
                URL.revokeObjectURL(previewFile.previewUrl)
                setPreviewFile(null)
              }
            }}
            placeholder="https://example.com/image.png"
            className="focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none"
          />
        </div>

        {/* 确认与取消按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="brand-btn flex-1 justify-center rounded-lg px-6 py-2.5"
          >
            确认
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </DialogModal>
  )
}
