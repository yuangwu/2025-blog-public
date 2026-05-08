'use client' // 表示该组件为客户端组件，仅在浏览器端渲染

import { motion } from 'motion/react' // 引入动画库 motion
// 引入自定义颜色选择器组件，需要确保 @/components/color-picker 文件存在
import { ColorPicker } from '@/components/color-picker'
import { XIcon } from 'lucide-react' // 引入关闭图标
// 引入站点内容的类型定义，来自 zustand 等状态管理，确保 ../stores/config-store 文件存在并导出 SiteContent 类型
import type { SiteContent } from '../stores/config-store'
// 引入站点默认配置文件，确保 @/config/site-content.json 存在，且包含 theme 对象
import siteContent from '@/config/site-content.json'

interface ColorConfigProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

// 从配置文件中提取默认主题颜色，注意确保 site-content.json 中有 theme 字段
const DEFAULT_THEME_COLORS = siteContent.theme

// 预设方案类型，包含名字、部分主题配置以及背景色数组
type ColorPreset = {
	name: string
	theme: Partial<SiteContent['theme']>
	backgroundColors: string[]
}

// 预定义的几套配色方案
const COLOR_PRESETS: ColorPreset[] = [
	{
		name: '春暖',
		theme: {
			colorBrand: '#35bfab',
			colorBrandSecondary: '#1fc9e7',
			colorPrimary: '#334f52',
			colorSecondary: '#7b888e',
			colorBg: '#eeeeee',
			colorBorder: '#ffffff',
			colorCard: '#ffffff66',
			colorArticle: '#ffffffcc'
		},
		backgroundColors: ['#EDDD62', '#9EE7D1', '#84D68A', '#EDDD62', '#88E6E5', '#a7f3d0']
	},
	{
		name: '秋实',
		theme: {
			colorPrimary: '#4E3F42',
			colorBrand: '#de4331',
			colorBrandSecondary: '#FCC841'
		},
		backgroundColors: ['#FCC841', '#DFEFFC', '#DEDE92', '#DE4331', '#FE9750', '#FCC841']
	},
	{
		name: '晴空',
		theme: {
			colorBrand: '#2fcbe7',
			colorPrimary: '#5B423F',
			colorSecondary: '#8b7667',
			colorBrandSecondary: '#eec25e',
			colorBg: '#d4e8f3',
			colorCard: '#ffffff99',
		},
		backgroundColors: ['#f7da3987', '#8fdbe9', '#fffef8']
	},
	{
		name: '深夜',
		theme: {
			colorBrand: '#2a48f3',
			colorPrimary: '#e6e8e8',
			colorSecondary: '#acadae',
			colorBrandSecondary: '#51d0b9',
			colorBg: '#0a051f',
			colorBorder: '#8a8a8a5e',
			colorCard: '#ffffff0e',
			colorArticle: '#6f6f6f33'
		},
		backgroundColors: ['#16007b']
	}
]

// 颜色配置组件，用于编辑网站主题色和背景色
export function ColorConfig({ formData, setFormData }: ColorConfigProps) {
	// 如果 formData.theme 为 undefined，使用空对象避免后续属性访问报错
	const theme = formData.theme ?? {}

	// 处理主题中某一项颜色的变化（排除品牌色，品牌色单独处理）
	const handleThemeColorChange = (key: keyof typeof DEFAULT_THEME_COLORS, value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,
				[key]: value
			}
		}))
	}

	// 单独处理品牌色变化
	const handleBrandColorChange = (value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,
				colorBrand: value
			}
		}))
	}

	// 修改背景色数组中指定索引的颜色
	const handleColorChange = (index: number, value: string) => {
		const newColors = [...formData.backgroundColors]
		newColors[index] = value
		setFormData({ ...formData, backgroundColors: newColors })
	}

	// 生成一个随机十六进制颜色值，例如 #A1B2C3
	const generateRandomColor = () => {
		const randomChannel = () => Math.floor(Math.random() * 256)
		return `#${[randomChannel(), randomChannel(), randomChannel()]
			.map(channel => channel.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()}`
	}

	// 随机生成背景色数组和品牌色
	const handleRandomizeColors = () => {
		const count = Math.floor(Math.random() * 5) + 4 // 背景色数量 4 ~ 8 个
		const backgroundColors = Array.from({ length: count }, () => generateRandomColor())
		const colorBrand = generateRandomColor()

		setFormData(prev => ({
			...prev,
			backgroundColors,
			theme: {
				...prev.theme,
				colorBrand
			}
		}))
	}

	// 添加一个新的背景颜色项
	const handleAddColor = () => {
		setFormData({
			...formData,
			backgroundColors: [...formData.backgroundColors, '#EDDD62']
		})
	}

	// 删除指定索引的背景颜色项，前提是至少保留一个颜色
	const handleRemoveColor = (index: number) => {
		if (formData.backgroundColors.length > 1) {
			const newColors = formData.backgroundColors.filter((_, i) => i !== index)
			setFormData({ ...formData, backgroundColors: newColors })
		}
	}

	// 应用预设配色方案
	const handlePresetChange = (preset: ColorPreset) => {
		setFormData(prev => ({
			...prev,
			backgroundColors: [...preset.backgroundColors],
			theme: {
				...prev.theme,
				...preset.theme
			}
		}))
	}

	return (
		<div className='space-y-6'>
			{/* 基础颜色编辑区 */}
			<div>
				<label className='mb-2 block text-sm font-medium'>基础颜色</label>
				<div className='grid grid-cols-2 gap-4'>
					{/* 品牌色（主题色） */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={formData.theme?.colorBrand ?? '#35bfab'} onChange={handleBrandColorChange} />
						<span className='text-xs'>主题色</span>
					</div>
					{/* 次级主题色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker
							value={theme.colorBrandSecondary ?? DEFAULT_THEME_COLORS.colorBrandSecondary}
							onChange={value => handleThemeColorChange('colorBrandSecondary', value)}
						/>
						<span className='text-xs'>次级主题色</span>
					</div>
					{/* 主色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={theme.colorPrimary ?? DEFAULT_THEME_COLORS.colorPrimary} onChange={value => handleThemeColorChange('colorPrimary', value)} />
						<span className='text-xs'>主色</span>
					</div>
					{/* 次色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker
							value={theme.colorSecondary ?? DEFAULT_THEME_COLORS.colorSecondary}
							onChange={value => handleThemeColorChange('colorSecondary', value)}
						/>
						<span className='text-xs'>次色</span>
					</div>
					{/* 背景色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={theme.colorBg ?? DEFAULT_THEME_COLORS.colorBg} onChange={value => handleThemeColorChange('colorBg', value)} />
						<span className='text-xs'>背景色</span>
					</div>
					{/* 边框色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={theme.colorBorder ?? DEFAULT_THEME_COLORS.colorBorder} onChange={value => handleThemeColorChange('colorBorder', value)} />
						<span className='text-xs'>边框色</span>
					</div>
					{/* 卡片色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={theme.colorCard ?? DEFAULT_THEME_COLORS.colorCard} onChange={value => handleThemeColorChange('colorCard', value)} />
						<span className='text-xs'>卡片色</span>
					</div>
					{/* 文章背景色 */}
					<div className='flex items-center gap-3'>
						<ColorPicker value={theme.colorArticle ?? DEFAULT_THEME_COLORS.colorArticle} onChange={value => handleThemeColorChange('colorArticle', value)} />
						<span className='text-xs'>文章背景</span>
					</div>
				</div>
			</div>

			{/* 背景颜色列表编辑区 */}
			<div>
				<div className='mb-2 flex items-center justify-between gap-3'>
					<label className='block text-sm font-medium'>背景颜色</label>
					<div className='flex gap-2'>
						{/* 随机配色按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleRandomizeColors}
							className='rounded-lg border bg-white/60 px-3 py-1 text-xs whitespace-nowrap'>
							随机配色
						</motion.button>
						{/* 添加新颜色按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAddColor}
							className='rounded-lg border bg-white/60 px-3 py-1 text-xs whitespace-nowrap'>
							+ 添加颜色
						</motion.button>
					</div>
				</div>
				{/* 显示当前所有背景颜色，每个颜色旁有删除按钮（当数量大于1时显示） */}
				<div className='flex gap-3'>
					{formData.backgroundColors.map((color, index) => (
						<div key={index} className='flex items-center gap-2'>
							<div className='group relative'>
								<ColorPicker value={color} onChange={value => handleColorChange(index, value)} />
								{formData.backgroundColors.length > 1 && (
									<button
										onClick={() => handleRemoveColor(index)}
										className='text-secondary absolute -top-1 -right-2 rounded-lg border bg-white/60 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100'>
										<XIcon className='size-3' />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* 预设配色方案选择区 */}
			<div className='flex flex-col gap-3'>
				{COLOR_PRESETS.map(preset => (
					<button
						key={preset.name}
						onClick={() => handlePresetChange(preset)}
						className='flex items-center gap-3 rounded-lg border bg-white/60 p-3 transition-colors hover:bg-white/80'>
						{/* 预设主题色块预览 */}
						<div className='flex items-center gap-2'>
							<div
								className='h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm'
								style={{ backgroundColor: preset.theme.colorBrand ?? DEFAULT_THEME_COLORS.colorBrand }}
							/>
							{preset.backgroundColors.map((color, index) => (
								<div key={index} className='h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm' style={{ backgroundColor: color }} />
							))}
						</div>

						<span className='text-sm font-medium whitespace-nowrap'>{preset.name}</span>
					</button>
				))}
			</div>
		</div>
	)
}
