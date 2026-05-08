'use client' // 声明该组件为客户端组件，可使用浏览器 API 和交互逻辑

import { motion } from 'motion/react' // 引入 motion 动画组件
import { INIT_DELAY } from '@/consts' // 从常量文件中导入预设的初始动画延迟时间

export default function WIP() {
  return (
    // 最外层容器：垂直弹性布局，内容水平垂直居中，并设置内边距
    <div className='flex flex-col items-center justify-center px-6 pt-32 pb-12'>
      {/* 限制内容最大宽度为 600px，保证在大屏上阅读舒适 */}
      <div className='w-full max-w-[600px]'>
        {/* 使用 motion.div 为整个卡片添加入场动画 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} // 初始状态：透明并稍微缩小
          animate={{ opacity: 1, scale: 1 }} // 动画结束：完全不透明、原始大小
          transition={{ delay: INIT_DELAY }} // 过渡动画带预设延迟，让出现更自然
          className='card relative flex flex-col items-center gap-6 p-12 text-center'
        >
          {/* 施工标志 emoji */}
          <div className='text-6xl'>🚧</div>

          {/* 主标题 */}
          <h1 className='text-3xl font-bold'>开发中</h1>

          {/* 辅助说明文字，使用次要文本色 */}
          <p className='text-secondary text-lg leading-relaxed'>
            这个功能正在努力开发中，敬请期待！
          </p>

          {/* 三个依次跳动的小圆点，表示加载或等待状态 */}
          <div className='mt-4 flex gap-2'>
            {/* 第一个圆点：无延迟跳动 */}
            <div
              className='h-2 w-2 animate-bounce rounded-full bg-black/20'
              style={{ animationDelay: '0ms' }}
            ></div>
            {/* 第二个圆点：150ms 延迟 */}
            <div
              className='h-2 w-2 animate-bounce rounded-full bg-black/20'
              style={{ animationDelay: '150ms' }}
            ></div>
            {/* 第三个圆点：300ms 延迟 */}
            <div
              className='h-2 w-2 animate-bounce rounded-full bg-black/20'
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}