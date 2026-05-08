'use client'

// 从配置 store 中导入 SiteContent 类型，用于描述整个站点内容的形状
import type { SiteContent } from '../../stores/config-store'

// 定义 SiteMetaForm 组件所接收的 props 类型
interface SiteMetaFormProps {
  /** 当前的表单数据，其中包含 meta 等字段 */
  formData: SiteContent
  /** 用于更新 formData 的 React 状态更新函数 */
  setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/**
 * 站点元数据编辑表单组件
 * 提供站点标题、用户名和描述信息的编辑功能
 */
export function SiteMetaForm({ formData, setFormData }: SiteMetaFormProps) {
  return (
    <>
      <div className='grid grid-cols-2 gap-2'>
        {/* 站点标题输入区域 */}
        <div>
          <label className='mb-2 block text-sm font-medium'>站点标题</label>
          <input
            type='text'
            // 输入框的值与 formData.meta.title 绑定
            value={formData.meta.title}
            // 当用户输入时，通过展开运算符保留原有数据，只更新 meta.title
            onChange={e => setFormData({ ...formData, meta: { ...formData.meta, title: e.target.value } })}
            className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
          />
        </div>

        {/* 用户名输入区域 */}
        <div>
          <label className='mb-2 block text-sm font-medium'>用户名</label>
          <input
            type='text'
            // 如果 meta.username 为 undefined 或 null，则显示空字符串
            value={formData.meta.username || ''}
            // 更新 meta.username，其他 meta 字段保持不变
            onChange={e => setFormData({ ...formData, meta: { ...formData.meta, username: e.target.value } })}
            className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
          />
        </div>
      </div>

      {/* 站点描述输入区域（多行文本） */}
      <div>
        <label className='mb-2 block text-sm font-medium'>站点描述</label>
        <textarea
          // 文本域的值与 formData.meta.description 绑定
          value={formData.meta.description}
          // 更新 meta.description，其余部分不变
          onChange={e => setFormData({ ...formData, meta: { ...formData.meta, description: e.target.value } })}
          rows={3}
          className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
        />
      </div>
    </>
  )
}
