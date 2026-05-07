'use client' // 声明该组件仅在客户端运行，因为用到了浏览器 API（如 document、Portal、SVG 滤镜等）

import { createPortal } from 'react-dom' // 用于将组件渲染到指定的 DOM 节点（此处为 document.body）
import { motion } from 'motion/react' // 引入 motion 组件，提供动画和拖拽等功能
import displacement1 from './displacement-1.png' // 第一张位移贴图，用于放大镜效果的初步变形
import displacement2 from './displacement-2.png' // 第二张位移贴图，用于产生液体波动般的扭曲
import borderImg from './border.png' // 边框/高光贴图，用来模拟玻璃边缘的高光和形状
import { useEffect, useRef, useState } from 'react'

const width = 210 // 组件的宽度
const height = 150 // 组件的高度

export default function LiquidGrass() {
	const bodyRef = useRef(document.body) // 引用 document.body，作为拖拽约束的边界
	const [show, setShow] = useState(false) // 控制组件是否显示

	useEffect(() => {
		setTimeout(() => {
			setShow(true) // 延迟 1 秒后显示，可以避免初始化时的一些视觉冲突
		}, 1000)
	}, [])

	if (!show) return null // 未到显示时间时，不渲染任何内容

	return createPortal( // 将组件挂载到 document.body，脱离当前父组件的 DOM 层级，避免被父级样式裁剪
		<motion.div
			initial={{ opacity: 0 }} // 初始状态：完全透明
			animate={{ opacity: 1 }} // 进入后渐显
			drag // 允许用户拖拽
			dragConstraints={bodyRef} // 拖拽范围限制在整个 body 内
			style={{ width, height }} // 设置固定宽高
			className='fixed top-16 right-1/2 z-90 select-none' // 固定定位，垂直距离顶部 4rem，水平向右偏移 50%（即右边缘在屏幕中间），不可选中文字
			whileTap={{
				scale: 1.1 // 点击/按住时放大到 1.1 倍，提供交互反馈
			}}>
			{/* 隐藏的 SVG，仅用于定义滤镜，不直接显示 */}
			<svg colorInterpolationFilters='sRGB' style={{ display: 'none' }}>
				<defs>
					<filter id='magnifying-glass-filter'>
						{/* 第一步：加载第一张位移贴图，为后续的 feDisplacementMap 做准备 */}
						<feImage href={displacement1.src} x='0' y='0' width={width} height={height} result='magnifying_displacement_map' />

						{/* 第二步：基于第一张贴图对原始图形进行位移，产生类似放大镜的扭曲效果 */}
						<feDisplacementMap
							in='SourceGraphic' // 输入为当前背景图形（即应用滤镜的元素）
							in2='magnifying_displacement_map' // 位移参考贴图
							scale='24' // 位移强度
							xChannelSelector='R' // 用贴图的红色通道控制 X 方向位移
							yChannelSelector='G' // 用绿色通道控制 Y 方向位移
							result='magnified_source'
						/>

						{/* 第三步：对位移后的结果做高斯模糊，此处标准差为 0，即不模糊，但为后续步骤保留占位 */}
						<feGaussianBlur in='magnified_source' stdDeviation='0' result='blurred_source' />

						{/* 第四步：加载第二张位移贴图，准备进行更强的液体波动扭曲 */}
						<feImage href={displacement2.src} x='0' y='0' width={width} height={height} result='displacement_map' />

						{/* 第五步：使用第二张贴图对模糊后的结果再次位移，产生液体晃动的流动感 */}
						<feDisplacementMap
							in='blurred_source'
							in2='displacement_map'
							scale='80' // 更大的位移强度，制造剧烈扭曲
							xChannelSelector='R'
							yChannelSelector='G'
							result='displaced'
						/>

						{/* 第六步：增强饱和度，值为 9 表示饱和度提升至原来的 9 倍，使颜色更加鲜艳 */}
						<feColorMatrix in='displaced' type='saturate' result='displaced_saturated' values='9'></feColorMatrix>

						{/* 第七步：加载边框/高光贴图，用于模拟玻璃边缘的反光 */}
						<feImage href={borderImg.src} x='0' y='0' width={width} height={height} result='specular_layer'></feImage>

						{/* 第八步：将高饱和度的扭曲结果与边框贴图进行 "in" 合成，即用边框贴图的 alpha 通道裁剪扭曲内容 */}
						<feComposite in='displaced_saturated' in2='specular_layer' operator='in' result='specular_saturated'></feComposite>

						{/* 第九步：单独处理边框贴图的透明度，将其 alpha 值乘以 0.5，减弱高光强度 */}
						<feComponentTransfer in='specular_layer' result='specular_faded'>
							<feFuncA type='linear' slope='0.5'></feFuncA>
						</feComponentTransfer>

						{/* 第十步：将裁剪后的高饱和度内容与原始扭曲结果混合，恢复部分原有细节 */}
						<feBlend in='specular_saturated' in2='displaced' mode='normal' result='withSaturation'></feBlend>

						{/* 第十一步：将减弱后的高光层叠加到上一步混合结果上，形成最终的玻璃液体效果 */}
						<feBlend in='specular_faded' in2='withSaturation' mode='normal'></feBlend>
					</filter>
				</defs>
			</svg>

			{/* 实际显示的元素，应用了上面定义的滤镜 */}
			<div
				className='absolute inset-0 rounded-full' // 绝对定位撑满父容器，圆角形成圆形或胶囊形
				style={{
					backdropFilter: 'url(#magnifying-glass-filter)', // 使用 CSS backdrop-filter 应用 SVG 滤镜，作用于元素背后的内容
					boxShadow:
						'rgba(0, 0, 0, 0.05) 0px 4px 9px, rgba(0, 0, 0, 0.05) 0px 2px 24px inset, rgba(255, 255, 255, 0.2) 0px -2px 24px inset' // 多层阴影：外阴影增强玻璃质感，内阴影模拟暗部和顶部高光
				}}></div>
		</motion.div>,
		document.body // 挂载目标
	)
}