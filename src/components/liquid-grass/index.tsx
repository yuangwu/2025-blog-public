'use client' // 声明该组件为客户端组件，仅在浏览器端渲染和执行

import { createPortal } from 'react-dom' // 从 react-dom 导入 createPortal，用于将内容渲染到指定 DOM 节点
import { motion } from 'motion/react' // 从 motion 库导入 motion 组件，用于实现动画和拖拽
// 导入三张用于 SVG 滤镜效果的 PNG 图片，它们会被 Next.js 打包处理
import displacement1 from './displacement-1.png'
import displacement2 from './displacement-2.png'
import borderImg from './border.png'
import { useEffect, useRef, useState } from 'react'

// 定义组件的固定宽高
const width = 210
const height = 150

export default function LiquidGrass() {
	// 保存对 body 元素的引用，用于限制拖拽范围。初始值为 null 避免服务端渲染错误
	const bodyRef = useRef(null)
	// 控制组件是否显示，用于延迟入场动画
	const [show, setShow] = useState(false)

	useEffect(() => {
		// 在客户端挂载后，将 bodyRef 设置为真实的 document.body
		bodyRef.current = document.body
		// 延迟 1 秒后显示组件，触发入场动画
		setTimeout(() => {
			setShow(true)
		}, 1000)
	}, [])

	// 如果 show 为 false，不渲染任何内容（同时避免服务端执行后续 JSX）
	if (!show) return null

	// 使用 createPortal 将组件渲染到 body 元素上，避免被父级样式影响
	return createPortal(
		<motion.div
			initial={{ opacity: 0 }} // 初始透明
			animate={{ opacity: 1 }} // 入场后淡入
			drag // 允许拖拽
			dragConstraints={bodyRef} // 限制拖拽范围在 body 区域内
			style={{ width, height }}
			className="fixed top-16 right-1/2 z-90 select-none"
			whileTap={{
				scale: 1.1 // 点击时放大
			}}
		>
			{/* SVG 滤镜定义区域，不直接显示 */}
			<svg colorInterpolationFilters="sRGB" style={{ display: 'none' }}>
				<defs>
					{/* 定义名为 magnifying-glass-filter 的滤镜组合，模拟液体玻璃放大效果 */}
					<filter id="magnifying-glass-filter">
						{/* 加载位移贴图1，用于第一次位移 */}
						<feImage
							href={displacement1.src}
							x="0"
							y="0"
							width={width}
							height={height}
							result="magnifying_displacement_map"
						/>
						{/* 对原始图形施加第一次位移 */}
						<feDisplacementMap
							in="SourceGraphic"
							in2="magnifying_displacement_map"
							scale="24"
							xChannelSelector="R"
							yChannelSelector="G"
							result="magnified_source"
						/>
						{/* 轻微模糊处理 */}
						<feGaussianBlur in="magnified_source" stdDeviation="0" result="blurred_source" />
						{/* 加载位移贴图2，用于第二次更强烈的位移 */}
						<feImage
							href={displacement2.src}
							x="0"
							y="0"
							width={width}
							height={height}
							result="displacement_map"
						/>
						{/* 对模糊后的图像施加第二次位移 */}
						<feDisplacementMap
							in="blurred_source"
							in2="displacement_map"
							scale="80"
							xChannelSelector="R"
							yChannelSelector="G"
							result="displaced"
						/>
						{/* 提高色彩饱和度 */}
						<feColorMatrix
							in="displaced"
							type="saturate"
							result="displaced_saturated"
							values="9"
						/>
						{/* 加载边框图片作为高光层 */}
						<feImage
							href={borderImg.src}
							x="0"
							y="0"
							width={width}
							height={height}
							result="specular_layer"
						/>
						{/* 将高光层限制在饱和图像的形状范围内 */}
						<feComposite
							in="displaced_saturated"
							in2="specular_layer"
							operator="in"
							result="specular_saturated"
						/>
						{/* 降低高光层的透明度 */}
						<feComponentTransfer in="specular_layer" result="specular_faded">
							<feFuncA type="linear" slope="0.5" />
						</feComponentTransfer>
						{/* 将原始饱和图像与高光图像进行混合 */}
						<feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation" />
						{/* 再叠加上半透明的高光层，形成最终效果 */}
						<feBlend in="specular_faded" in2="withSaturation" mode="normal" />
					</filter>
				</defs>
			</svg>

			{/* 应用上述 SVG 滤镜的圆形玻璃容器 */}
			<div
				className="absolute inset-0 rounded-full"
				style={{
					backdropFilter: 'url(#magnifying-glass-filter)', // 使用定义好的滤镜
					boxShadow:
						'rgba(0, 0, 0, 0.05) 0px 4px 9px, rgba(0, 0, 0, 0.05) 0px 2px 24px inset, rgba(255, 255, 255, 0.2) 0px -2px 24px inset'
				}}
			/>
		</motion.div>,
		document.body // 将整个组件挂载到 body 下，此处仅在客户端执行，所以 document 可用
	)
}
