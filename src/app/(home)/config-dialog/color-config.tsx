// 标记该组件为客户端组件（用于 Next.js App Router）
'use client'

// 导入 framer-motion 动画库
import { motion } from 'motion/react'
// 导入自定义颜色选择器组件
import { ColorPicker } from '@/components/color-picker'
// 导入 Lucide 图标库中的关闭图标
import { XIcon } from 'lucide-react'
// 导入站点内容类型定义
import type { SiteContent } from '../stores/config-store'
// 导入默认站点内容配置文件（JSON）
import siteContent from '@/config/site-content.json'

// 定义 ColorConfig 组件的 Props 类型
interface ColorConfigProps {
	formData: SiteContent               // 当前表单数据（站点内容）
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>> // 更新表单数据的函数
}

// 从配置文件中获取默认主题颜色作为备用值
const DEFAULT_THEME_COLORS = siteContent.theme

// 定义颜色预设的类型
type ColorPreset = {
	name: string                          // 预设名称
	theme: Partial<SiteContent['theme']>  // 预设的主题颜色（部分字段可选）
	backgroundColors: string[]           // 预设的背景色数组
}

// 定义几套预设配色方案
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

// 颜色配置组件，用于编辑站点的主题色和背景色
export function ColorConfig({ formData, setFormData }: ColorConfigProps) {
	// 从 formData 中解构出 theme，若不存在则使用空对象
	const theme = formData.theme ?? {}

	// 处理单一主题颜色字段的变更
	const handleThemeColorChange = (key: keyof typeof DEFAULT_THEME_COLORS, value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,   // 保留其他主题字段
				[key]: value     // 更新当前字段
			}
		}))
	}

	// 处理品牌主题色的变更（特殊处理，但逻辑与 handleThemeColorChange 相同）
	const handleBrandColorChange = (value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,
				colorBrand: value
			}
		}))
	}

	// 处理背景色数组中某个索引的颜色变更
	const handleColorChange = (index: number, value: string) => {
		const newColors = [...formData.backgroundColors] // 浅拷贝背景色数组
		newColors[index] = value                         // 更新指定位置颜色
		setFormData({ ...formData, backgroundColors: newColors })
	}

	// 生成一个随机十六进制颜色（例如 #A1B2C3）
	const generateRandomColor = () => {
		const randomChannel = () => Math.floor(Math.random() * 256)    // 随机 0-255
		return `#${[randomChannel(), randomChannel(), randomChannel()]
			.map(channel => channel.toString(16).padStart(2, '0'))   // 转为两位十六进制
			.join('')
			.toUpperCase()}`
	}

	// 随机生成整套配色（背景色和品牌色）
	const handleRandomizeColors = () => {
		const count = Math.floor(Math.random() * 5) + 4 // 随机 4~8 个背景色
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

	// 新增一个背景颜色（默认淡黄色）
	const handleAddColor = () => {
		setFormData({
			...formData,
			backgroundColors: [...formData.backgroundColors, '#EDDD62']
		})
	}

	// 删除指定索引的背景颜色（至少保留一个）
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
			backgroundColors: [...preset.backgroundColors], // 深拷贝背景色数组
			theme: {
				...prev.theme,           // 保留原有主题配置
				...preset.theme          // 用预设覆盖部分主题字段
			}
		}))
	}

	// 渲染 UI
	return (
		<div className='space-y-6'>
			{/* 基础颜色配置区域 */}
			<div>
				<label className='mb-2 block text-sm font-medium'>基础颜色</label>
				<div className='grid grid-cols-2 gap-4'>
					{/* 主题色 */}
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

			{/* 背景颜色数组配置区域 */}
			<div>
				<div className='mb-2 flex items-center justify-between gap-3'>
					<label className='block text-sm font-medium'>背景颜色</label>
					<div className='flex gap-2'>
						{/* 随机配色按钮（带微动画） */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleRandomizeColors}
							className='rounded-lg border bg-white/60 px-3 py-1 text-xs whitespace-nowrap'>
							随机配色
						</motion.button>
						{/* 添加颜色按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAddColor}
							className='rounded-lg border bg-white/60 px-3 py-1 text-xs whitespace-nowrap'>
							+ 添加颜色
						</motion.button>
					</div>
				</div>
				{/* 展示当前所有背景颜色，每个颜色块可编辑、删除 */}
				<div className='flex gap-3'>
					{formData.backgroundColors.map((color, index) => (
						<div key={index} className='flex items-center gap-2'>
							<div className='group relative'>
								<ColorPicker value={color} onChange={value => handleColorChange(index, value)} />
								{/* 当颜色数量大于1时，显示删除按钮（默认隐藏，鼠标悬停显示） */}
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

			{/* 预设配色方案列表 */}
			<div className='flex flex-col gap-3'>
				{COLOR_PRESETS.map(preset => (
					<button
						key={preset.name}
						onClick={() => handlePresetChange(preset)}
						className='flex items-center gap-3 rounded-lg border bg-white/60 p-3 transition-colors hover:bg-white/80'>
						{/* 颜色预览块：品牌色 + 背景色序列 */}
						<div className='flex items-center gap-2'>
							<div
								className='h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm'
								style={{ backgroundColor: preset.theme.colorBrand ?? DEFAULT_THEME_COLORS.colorBrand }}
							/>
							{preset.backgroundColors.map((color, index) => (
								<div key={index} className='h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm' style={{ backgroundColor: color }} />
							))}
						</div>
						{/* 预设名称 */}
						<span className='text-sm font-medium whitespace-nowrap'>{preset.name}</span>
					</button>
				))}
			</div>
		</div>
	)
}