'use client' // Next.js 客户端组件声明，因为使用了浏览器 API（如 window）和 React 状态/动画

import { useEffect, useState } from 'react'
import { motion } from 'motion/react' // 从 motion 库引入动画组件

// 定义雪花对象的类型
interface Snowflake {
  id: number
  type: 'dot' | 'image'            // 雪花类型：圆点或图片
  imageIndex?: number              // 当类型为图片时，使用的图片索引
  size: number                     // 雪花尺寸（宽高一致）
  duration: number                 // 一次完整下落动画的持续时间（秒）
  delay: number                    // 动画开始前的延迟时间（秒）
  left: number                     // 水平起始位置（百分比，相对于视口宽度）
  rotate: number                   // 图片雪花的旋转角度（圆点不旋转）
}

// 可选雪花图片路径数组
const SNOWFLAKE_IMAGES = [
  '/images/christmas/snowflake/1.webp',
  '/images/christmas/snowflake/2.webp',
  '/images/christmas/snowflake/3.webp'
]
// 圆点雪花的生成概率（80% 为圆点，20% 为图片）
const DOT_RATIO = 0.8

// 组件 Props 类型：zIndex 控制层级，count 控制雪花数量（默认125）
export default function SnowfallBackground({
  zIndex,
  count = 125
}: {
  zIndex: number
  count?: number
}) {
  // 存储所有雪花的参数
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    // 生成雪花数据
    const generateSnowflakes = () => {
      const newSnowflakes: Snowflake[] = []
      for (let i = 0; i < count; i++) {
        // 80% 概率生成为圆点，20% 为图片
        const isDot = Math.random() < DOT_RATIO
        // 圆点尺寸 5~15px，图片尺寸 20~60px
        const size = isDot ? Math.random() * 10 + 5 : Math.random() * 40 + 20
        // 下落动画时长 20~40 秒
        const duration = Math.random() * 20 + 20
        // 动画延迟 0~40 秒（错开起始时间）
        const delay = Math.random() * 40
        // 水平位置 0% ~ 120%（部分从视口外开始，更自然）
        const left = Math.random() * 120
        // 图片雪花随机索引
        const imageIndex = isDot ? undefined : Math.floor(Math.random() * SNOWFLAKE_IMAGES.length)
        // 图片雪花旋转角度 180~540 度（正负旋转混合，避免单调）
        const rotate = Math.random() * 360 + 180

        newSnowflakes.push({
          id: i,
          type: isDot ? 'dot' : 'image',
          imageIndex,
          size,
          duration,
          delay,
          left,
          rotate
        })
      }
      setSnowflakes(newSnowflakes)
    }

    generateSnowflakes()
  }, [count]) // 当 count 变化时重新生成雪花

  return (
    <motion.div
      // 整体容器淡入效果
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 1 }}
      // 固定定位，覆盖整个屏幕，禁止鼠标事件，隐藏溢出内容
      className='pointer-events-none fixed inset-0 z-0 overflow-hidden'
      style={{ zIndex }} // 通过 props 控制层级
    >
      {/* 遍历渲染所有雪花 */}
      {snowflakes.map(snowflake => (
        <motion.div
          key={snowflake.id}
          className='absolute'
          style={{
            top: -200, // 初始位置在屏幕上方200px，确保从不可见区域开始
            left: `${snowflake.left}%`, // 水平位置
            width: `${snowflake.size}px`,
            height: `${snowflake.size}px`
          }}
          // 动画起始状态
          initial={{ y: 0, x: 0 }}
          animate={{
            // 垂直方向：从 -200px 落到视口高度 + 200px（超出底部消失）
            y: window.innerHeight + 200,
            // 水平方向：随机向左漂移一段距离（最大为视口宽度的1/5）
            x: `-${(Math.random() * window.innerWidth) / 5}px`,
            // 图片雪花旋转，圆点不旋转
            rotate: snowflake.type === 'image' ? snowflake.rotate : 0
          }}
          transition={{
            duration: snowflake.duration,
            delay: snowflake.delay,
            repeat: Infinity,    // 无限循环
            ease: 'linear'       // 匀速下落，模拟真实飘落感
          }}
        >
          {/* 根据类型渲染圆点或图片 */}
          {snowflake.type === 'dot' ? (
            // 纯白圆点
            <div className='h-full w-full rounded-full bg-white' />
          ) : (
            // 雪花图片，禁止拖拽
            <img
              src={SNOWFLAKE_IMAGES[snowflake.imageIndex!]}
              alt=''
              className='h-full w-full object-contain'
              draggable={false}
            />
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}