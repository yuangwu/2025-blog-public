// 标记为 Next.js 客户端组件（仅在浏览器端渲染）
'use client'

// 导入 React 核心 hooks
import { useState, useRef } from 'react'
// 导入 Sonner 消息提示库
import { toast } from 'sonner'
// 导入 Lucide 图标库的 Plus 图标
import { Plus } from 'lucide-react'
// 导入自定义的对话框模态框组件
import { DialogModal } from '@/components/dialog-modal'

// 定义头像数据类型：支持 URL 或本地文件两种模式
export type AvatarItem = 
  | { type: 'url'; url: string }                // URL 模式
  | { type: 'file'; file: File; previewUrl: string; hash?: string } // 文件模式

// 定义组件 Props 接口
interface AvatarUploadDialogProps {
  currentAvatar?: string                          // 当前头像 URL（可选）
  onClose: () => void                             // 关闭对话框回调
  onSubmit: (avatar: AvatarItem) => void         // 提交头像回调
}

// 导出默认组件
export default function AvatarUploadDialog({ 
  currentAvatar, 
  onClose, 
  onSubmit 
}: AvatarUploadDialogProps) {
  // 状态管理：URL 输入框内容
  const [urlInput, setUrlInput] = useState(currentAvatar || '')
  // 状态管理：本地文件预览数据
  const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null)
  // Ref：隐藏的文件输入框 DOM 引用
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择事件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型必须是图片
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 创建本地预览 URL 并更新状态
    const previewUrl = URL.createObjectURL(file)
    setPreviewFile({ file, previewUrl })
    setUrlInput('') // 清空 URL 输入框
  }

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (previewFile) {
      // 提交本地文件模式
      onSubmit({
        type: 'file',
        file: previewFile.file,
        previewUrl: previewFile.previewUrl
      })
    } else if (urlInput.trim()) {
      // 提交 URL 模式
      onSubmit({
        type: 'url',
        url: urlInput.trim()
      })
    } else {
      // 未输入任何内容时的错误提示
      toast.error('请上传图片或输入 URL')
      return
    }

    // 提交后重置状态并关闭
    setPreviewFile(null)
    setUrlInput(currentAvatar || '')
    onClose()
  }

  // 处理关闭对话框
  const handleClose = () => {
    // 释放本地预览 URL 资源（防止内存泄漏）
    if (previewFile) {
      URL.revokeObjectURL(previewFile.previewUrl)
    }
    // 重置状态并关闭
    setPreviewFile(null)
    setUrlInput(currentAvatar || '')
    onClose()
  }

  // 渲染组件 UI
  return (
    <DialogModal open onClose={handleClose} className='card w-md'>
      <h2 className='mb-4 text-xl font-bold'>选择头像</h2>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* 本地上传区域 */}
        <div>
          <label className='text-secondary mb-2 block text-sm font-medium'>上传图片</label>
          {/* 隐藏的原生文件输入框 */}
          <input 
            ref={fileInputRef} 
            type='file' 
            accept='image/*' 
            className='hidden' 
            onChange={handleFileSelect} 
          />
          {/* 自定义上传按钮区域 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className='mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200'
          >
            {/* 显示预览图或上传提示 */}
            {previewFile ? (
              <img src={previewFile.previewUrl} alt='preview' className='h-full w-full rounded-lg object-cover' />
            ) : (
              <div className='text-center'>
                <Plus className='text-secondary mx-auto mb-1 h-8 w-8' />
                <p className='text-secondary text-xs'>点击上传图片</p>
              </div>
            )}
          </div>
        </div>

        {/* "或" 分隔线 */}
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-300'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='text-secondary rounded-lg bg-white px-4 py-1'>或</span>
          </div>
        </div>

        {/* URL 输入区域 */}
        <div>
          <label className='text-secondary mb-2 block text-sm font-medium'>图片 URL</label>
          <input
            type='url'
            value={urlInput}
            onChange={e => {
              setUrlInput(e.target.value)
              // 输入 URL 时清空本地预览
              if (previewFile) {
                URL.revokeObjectURL(previewFile.previewUrl)
                setPreviewFile(null)
              }
            }}
            placeholder='https://example.com/avatar.png'
            className='focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none'
          />
        </div>

        {/* 按钮组 */}
        <div className='flex gap-3 pt-2'>
          <button type='submit' className='brand-btn flex-1 justify-center rounded-lg px-6 py-2.5'>
            确认
          </button>
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50'
          >
            取消
          </button>
        </div>
      </form>
    </DialogModal>
  )
}