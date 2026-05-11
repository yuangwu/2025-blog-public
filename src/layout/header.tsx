'use client' // 声明为客户端组件，因为使用了状态管理和浏览器事件

import Link from 'next/link'
// 从 lucide-react 图标库导入图标组件，部署前请确保已安装：npm install lucide-react
import { Settings, PencilLine } from 'lucide-react'
// 导入全局状态管理 store，路径必须真实存在，否则构建会失败
import { useConfigStore } from '@/app/(home)/stores/config-store'

/**
 * Header 组件
 * 固定在页面顶部的导航栏，包含“写文章”和“设置”按钮
 * 使用 pointer-events-none 让背景可穿透，交互元素单独开启 pointer-events-auto
 */
export default function Header() {
  // 从 store 中获取打开设置弹窗的方法
  const setConfigDialogOpen = useConfigStore(state => state.setConfigDialogOpen)

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-6 py-4 pointer-events-none">
      {/* 占位 div，保持 flex 布局左右对齐，左侧留空 */}
      <div className="pointer-events-auto" />
      
      {/* 右侧按钮区域 */}
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* 跳转到写文章页面的链接按钮 */}
        <Link
          href="/write"
          className="bg-card flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition-colors"
        >
          <PencilLine size={18} />
          {/* 在小屏幕上隐藏文字，仅显示图标 */}
          <span className="hidden sm:inline">写文章</span>
        </Link>

        {/* 打开全局设置弹窗的按钮 */}
        <button
          onClick={() => setConfigDialogOpen(true)}
          className="bg-card flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition-colors"
          title="网站设置"
        >
          <Settings size={18} />
          {/* 在小屏幕上隐藏文字，仅显示图标 */}
          <span className="hidden sm:inline">设置</span>
        </button>
      </div>
    </header>
  )
}
