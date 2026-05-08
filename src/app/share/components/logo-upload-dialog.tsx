'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'

/**
 * Logo 项的类型定义
 * 可以是 URL 字符串方式，也可以是本地上传的 File 对象 + 预览地址 + 可选哈希
 */
export type LogoItem =
  | { type: 'url'; url: string }
  | { type: 'file'; file: File; previewUrl: string; hash?: string }

/** LogoUploadDialog 组件的 props 类型 */
interface LogoUploadDialogProps {
  /** 当前已有的 logo URL（用于编辑时回显） */
  currentLogo?: string
  /** 关闭对话框的回调 */
  onClose: () => void
  /** 提交新 logo 的回调，会传入 LogoItem 对象 */
  onSubmit: (logo: LogoItem) => void
}

/**
 * LogoUploadDialog 组件
 * 提供两种设置 logo 的方式：本地上传图片 或 输入图片 URL
 */
export default function LogoUploadDialog({
  currentLogo,
  onClose,
  onSubmit,
}: LogoUploadDialogProps) {
  // 图片 URL 输入框的状态，如果有 currentLogo 则回填
  const [urlInput, setUrlInput] = useState(currentLogo || '')
  // 本地上传文件及其预览地址的状态
  const [previewFile, setPreviewFile] = useState<{
    file: File
    previewUrl: string
  } | null>(null)
  // 隐藏的文件输入框引用，用于点击自定义区域时触发选择文件
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件选择事件
   * 验证是否为图片文件，生成预览地址并更新状态
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 仅允许图片文件
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 创建本地预览 URL
    const previewUrl = URL.createObjectURL(file)
    setPreviewFile({ file, previewUrl })
    // 选择了文件后清空 URL 输入框的内容，保持两种方式互斥
    setUrlInput('')
  }

  /**
   * 表单提交处理
   * 根据当前状态优先提交本地上传的文件，其次提交 URL
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (previewFile) {
      // 已选择本地文件，提交 file 类型
      onSubmit({
        type: 'file',
        file: previewFile.file,
        previewUrl: previewFile.previewUrl,
      })
    } else if (urlInput.trim()) {
      // 未选择文件但填写了 URL，提交 url 类型
      onSubmit({
        type: 'url',
        url: urlInput.trim(),
      })
    } else {
      // 两者都没有时给出提示
      toast.error('请上传图片或输入 URL')
      return
    }

    // 提交后重置内部状态并关闭对话框
    setPreviewFile(null)
    setUrlInput(currentLogo || '')
    onClose()
  }

  /**
   * 关闭对话框的处理
   * 清理预览 URL 占用的内存，并重置状态
   */
  const handleClose = () => {
    // 如果存在预览文件 URL，及时释放浏览器内存
    if (previewFile) {
      URL.revokeObjectURL(previewFile.previewUrl)
    }
    setPreviewFile(null)
    setUrlInput(currentLogo || '')
    onClose()
  }

  return (
    // DialogModal 为一个通用的弹窗组件，通过 open 控制显示，onClose 处理关闭
    <DialogModal open onClose={handleClose} className="card w-md">
      <h2 className="mb-4 text-xl font-bold">选择图标</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 本地上传区域 */}
        <div>
          <label className="text-secondary mb-2 block text-sm font-medium">
            上传图片
          </label>
          {/* 隐藏的实际文件输入，便于样式定制 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* 自定义点击区域触发文件选择 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200"
          >
            {previewFile ? (
              // 显示已选文件的预览图
              <img
                src={previewFile.previewUrl}
                alt="preview"
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              // 提示上传的占位内容
              <div className="text-center">
                <Plus className="text-secondary mx-auto mb-1 h-8 w-8" />
                <p className="text-secondary text-xs">点击上传图片</p>
              </div>
            )}
          </div>
        </div>

        {/* “或”分隔线 */}
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
            onChange={(e) => {
              setUrlInput(e.target.value)
              // 如果用户开始输入 URL，清空已选的文件预览并释放内存
              if (previewFile) {
                URL.revokeObjectURL(previewFile.previewUrl)
                setPreviewFile(null)
              }
            }}
            placeholder="https://example.com/logo.png"
            className="focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none"
          />
        </div>

        {/* 操作按钮 */}
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
