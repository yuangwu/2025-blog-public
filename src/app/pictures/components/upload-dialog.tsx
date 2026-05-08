'use client' // Next.js 13+ 客户端组件声明，使组件拥有交互能力（状态、事件等）

import { useState, useRef } from 'react'
import { toast } from 'sonner' // 轻量级 toast 通知库
import { Plus } from 'lucide-react' // 图标库，使用加号图标
import { DialogModal } from '@/components/dialog-modal' // 自定义模态对话框组件
import type { ImageItem } from '../../projects/components/image-upload-dialog' // 图片数据类型

// 组件 Props 类型定义
interface UploadDialogProps {
  onClose: () => void // 关闭对话框的回调（无参数）
  onSubmit: (payload: { images: ImageItem[]; description: string }) => void // 提交回调，传入图片数组和描述
}

/**
 * 图片上传对话框组件
 * 功能：支持多选图片、显示堆叠预览效果、填写统一描述，
 *       提交时将图片列表和描述传给父组件，并在关闭时释放临时 URL
 */
export default function UploadDialog({ onClose, onSubmit }: UploadDialogProps) {
  // 描述文本状态
  const [description, setDescription] = useState('')
  // 已选图片列表状态
  const [images, setImages] = useState<ImageItem[]>([])
  // 隐藏文件输入框的引用，用于通过按钮触发文件选择
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件选择事件
   * 注意：当前实现会【替换】原有图片列表，而不是追加（“继续添加”按钮行为与此一致）
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 将 FileList 转为普通数组
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const nextImages: ImageItem[] = []

    for (const file of files) {
      // 校验是否为图片类型
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件')
        return // 中断本次全部处理
      }

      // 生成本地预览 blob URL
      const previewUrl = URL.createObjectURL(file)
      nextImages.push({
        type: 'file', // 标识为本地文件
        file,
        previewUrl,
      })
    }

    // 更新图片列表（直接替换，而非追加）
    setImages(nextImages)
  }

  /**
   * 提交表单
   * 校验至少有一张图片，然后调用父组件的 onSubmit 回调
   */
  const handleSubmit = () => {
    if (images.length === 0) {
      toast.error('请至少选择一张图片')
      return
    }

    // 将 img 数据和描述回传给父组件
    onSubmit({
      images,
      description,
    })

    // 清空本地状态并关闭对话框
    setImages([])
    setDescription('')
    onClose()
  }

  /**
   * 关闭对话框（取消 / 点击遮罩层）
   * 必须释放通过 createObjectURL 创建的预览 URL，避免内存泄漏
   */
  const handleClose = () => {
    images.forEach((image) => {
      if (image.type === 'file') {
        URL.revokeObjectURL(image.previewUrl)
      }
    })
    // 清空状态
    setImages([])
    setDescription('')
    // 通知父组件关闭
    onClose()
  }

  return (
    <DialogModal open onClose={handleClose} className="card w-md max-sm:w-full">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">上传图片</h2>

        {/* 图片选择区域 */}
        <div>
          <label className="text-secondary mb-2 block text-sm font-medium">
            选择图片（可多选）
          </label>
          {/* 隐藏的原生文件输入框，通过 ref 和 button 触发 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* 未选择图片时显示上传占位区域 */}
          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-secondary/10"
            >
              <div className="text-center">
                <Plus className="mx-auto mb-1 h-8 w-8 text-gray-500" />
                <p className="text-secondary text-xs">点击选择图片</p>
              </div>
            </div>
          ) : (
            // 已选择图片：预览堆叠效果
            <>
              <div className="relative flex h-40 items-center justify-center overflow-visible rounded-xl bg-linear-to-br from-gray-50 to-gray-100">
                {/* 最多展示前三张，通过绝对定位和旋转制造堆叠视觉效果 */}
                {images.slice(0, 3).map((image, index) =>
                  image.type === 'file' ? (
                    <div
                      key={index}
                      className={`absolute h-32 w-44 overflow-hidden rounded-xl border-4 border-white bg-white shadow-xl transition-transform ${
                        index === 0
                          ? '-left-4 -translate-y-2 -rotate-6'
                          : index === 1
                          ? 'z-20 rotate-1'
                          : 'right-0 translate-y-2 rotate-6'
                      }`}
                    >
                      <img
                        src={image.previewUrl}
                        alt={`preview-${index}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null
                )}

                {/* 如果图片数量超过 3 张，显示总数量徽标 */}
                {images.length > 3 && (
                  <div className="absolute right-4 -bottom-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow-lg">
                    共 {images.length} 张
                  </div>
                )}
              </div>

              {/* 已选数量 + 继续添加按钮 */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-secondary text-xs">
                  已选择 {images.length} 张图片
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                >
                  继续添加
                </button>
              </div>
            </>
          )}
        </div>

        {/* 描述输入区域（可选，统一应用于本次所有图片） */}
        <div>
          <label className="text-secondary mb-2 block text-sm font-medium">
            描述（可选，应用于本次所有图片）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="这组图片的说明..."
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
            rows={3}
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="brand-btn flex-1 justify-center px-4"
          >
            确认上传
          </button>
        </div>
      </div>
    </DialogModal>
  )
}