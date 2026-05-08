// 声明为客户端组件，仅在浏览器端渲染
'use client'

// 导入动画延迟常量
import { ANIMATION_DELAY } from '@/consts'
// 导入动画库 motion
import { motion } from 'motion/react'
// 导入 classnames 工具函数
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
// 导入自定义 hook，用于获取屏幕尺寸状态
import { useSize } from '@/hooks/use-size'

// 定义组件的 props 接口
interface Props {
  className?: string // 额外的类名
  order: number       // 卡片出现的次序，用于计算延迟
  width: number       // 卡片的宽度
  height?: number     // 可选的高度
  x: number           // 卡片的 left 坐标
  y: number           // 卡片的 top 坐标
  children: React.ReactNode // 子内容
}

// 卡片组件，默认导出
export default function Card({ children, order, width, height, x, y, className }: Props) {
  // 获取屏幕尺寸状态：maxSM 是否小屏，init 是否已经初始化
  const { maxSM, init } = useSize()
  // 控制卡片是否显示的状态
  let [show, setShow] = useState(false)
  // 如果屏幕是小屏且已初始化，则取消了延迟顺序，让所有卡片同时出现（order 置 0）
  if (maxSM && init) order = 0

  useEffect(() => {
    // 已经显示则不再重复设置
    if (show) return
    // 初始位置为 (0,0) 时可能尚未定位，暂不显示
    if (x === 0 && y === 0) return
    // 根据 order 和动画延迟常量设置定时器，延迟后显示卡片
    setTimeout(
      () => {
        setShow(true)
      },
      order * ANIMATION_DELAY * 1000 // 秒转毫秒
    )
  }, [x, y, show])

  // 如果 show 为 true，则渲染带动画的卡片
  if (show)
    return (
      <motion.div
        className={cn('card squircle', className)} // 合并样式类
        // 初始状态：透明、缩小至 0.6 倍、位置与尺寸由 props 传入
        initial={{ opacity: 0, scale: 0.6, left: x, top: y, width, height }}
        // 动画目标状态：完全显示，缩放为1，位置与尺寸不变
        animate={{ opacity: 1, scale: 1, left: x, top: y, width, height }}
        // 鼠标悬停放大至 1.05 倍
        whileHover={{ scale: 1.05 }}
        // 点击时缩小至 0.95 倍
        whileTap={{ scale: 0.95 }}
      >
        {children}
      </motion.div>
    )

  // 不显示时返回 null
  return null
}