// 🔧 Next.js 13+ App Router 指令：标记此组件为【客户端组件】
// 意味着该组件可使用 useState、useEffect 等 React 客户端特性
'use client'

// 📦 类型导入（仅用于类型检查，不影响编译后体积）
// 从全局配置 store 导入网站内容类型定义
import type { SiteContent } from '../../stores/config-store'
// 从本地 types 文件导入各种文件上传相关的类型定义
import type { ArtImageUploads, BackgroundImageUploads, FileItem, SocialButtonImageUploads } from './types'

// 🧩 组件导入：引入所有子功能模块组件
import { FaviconAvatarUpload } from './favicon-avatar-upload' // 网站图标/头像上传模块
import { SiteMetaForm } from './site-meta-form'                 // 网站元信息（标题/描述等）表单
import { ArtImagesSection } from './art-images-section'          // 艺术图片配置区
import { BackgroundImagesSection } from './background-images-section' // 背景图片配置区
import { SocialButtonsSection } from './social-buttons-section'  // 社交按钮配置区
import { HatSection } from './hat-section'                       // （推测是）顶部装饰/标题区配置
import { BeianForm } from './beian-form'                         // 备案信息表单（中文网站特有）

// 🔄 类型再导出：方便外部直接从当前文件引用这些类型
export type { FileItem, ArtImageUploads, BackgroundImageUploads, SocialButtonImageUploads } from './types'

// 📝 定义组件 Props 的 TypeScript 接口
interface SiteSettingsProps {
	// 核心表单数据（整个网站的配置状态）
	formData: SiteContent
	// 更新 formData 的 React state setter 函数
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	
	// 网站图标（Favicon）相关状态
	faviconItem: FileItem | null
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	
	// 网站头像相关状态
	avatarItem: FileItem | null
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	
	// 艺术图片上传区相关状态
	artImageUploads: ArtImageUploads
	setArtImageUploads: React.Dispatch<React.SetStateAction<ArtImageUploads>>
	
	// 背景图片上传区相关状态
	backgroundImageUploads: BackgroundImageUploads
	setBackgroundImageUploads: React.Dispatch<React.SetStateAction<BackgroundImageUploads>>
	
	// 社交按钮图片上传区相关状态
	socialButtonImageUploads: SocialButtonImageUploads
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>>
}

// 🚀 主组件：SiteSettings（网站设置面板的容器组件）
export function SiteSettings({
	// 解构 Props，取出所有需要的状态和 setter
	formData,
	setFormData,
	faviconItem,
	setFaviconItem,
	avatarItem,
	setAvatarItem,
	artImageUploads,
	setArtImageUploads,
	backgroundImageUploads,
	setBackgroundImageUploads,
	socialButtonImageUploads,
	setSocialButtonImageUploads
}: SiteSettingsProps) {
	return (
		// 主容器：使用 Tailwind CSS 设置垂直间距（space-y-6）
		<div className='space-y-6'>
			{/* 1. 图标与头像上传模块 */}
			<FaviconAvatarUpload 
				faviconItem={faviconItem} 
				setFaviconItem={setFaviconItem} 
				avatarItem={avatarItem} 
				setAvatarItem={setAvatarItem} 
			/>

			{/* 2. 网站元信息（SEO/标题等）表单 */}
			<SiteMetaForm formData={formData} setFormData={setFormData} />

			{/* 3. ICP 备案信息表单（中国特色功能） */}
			<BeianForm formData={formData} setFormData={setFormData} />

			{/* 4. 社交按钮（GitHub/Twitter 等）配置区 */}
			<SocialButtonsSection
				formData={formData}
				setFormData={setFormData}
				socialButtonImageUploads={socialButtonImageUploads}
				setSocialButtonImageUploads={setSocialButtonImageUploads}
			/>

			{/* 5. 艺术图片（可能是作品展示区）配置 */}
			<ArtImagesSection 
				formData={formData} 
				setFormData={setFormData} 
				artImageUploads={artImageUploads} 
				setArtImageUploads={setArtImageUploads} 
			/>

			{/* 6. 网站背景图片配置 */}
			<BackgroundImagesSection
				formData={formData}
				setFormData={setFormData}
				backgroundImageUploads={backgroundImageUploads}
				setBackgroundImageUploads={setBackgroundImageUploads}
			/>

			{/* 🔘 第一组：功能开关复选框 */}
			<div className='flex gap-3'>
				{/* 开关：时钟是否显示秒数 */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						// 读取状态：若未定义则默认为 false
						checked={formData.clockShowSeconds ?? false}
						// 更新状态：使用展开运算符保持其他数据不变
						onChange={e => setFormData({ ...formData, clockShowSeconds: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>时钟显示秒数</span>
				</label>

				{/* 开关：文章摘要是否放入正文内容 */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.summaryInContent ?? false}
						onChange={e => setFormData({ ...formData, summaryInContent: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>摘要放入内容</span>
				</label>

				{/* 开关：是否隐藏编辑按钮（并提示快捷键） */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.hideEditButton ?? false}
						onChange={e => setFormData({ ...formData, hideEditButton: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>隐藏编辑按钮（编辑快捷键 ctrl/cmd + ,）</span>
				</label>
			</div>

			{/* 🔘 第二组：更多功能开关 */}
			<div className='flex gap-3'>
				{/* 开关：是否缓存 SSL 证书（PEM格式），并提示风险 */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.isCachePem ?? false}
						onChange={e => setFormData({ ...formData, isCachePem: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>缓存PEM(已加密，但存在风险)</span>
				</label>
				
				{/* 开关：是否启用文章分类功能 */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.enableCategories ?? false}
						onChange={e => setFormData({ ...formData, enableCategories: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>启用文章分类</span>
				</label>
				
				{/* 开关：是否开启圣诞节主题特效 */}
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.enableChristmas ?? false}
						onChange={e => setFormData({ ...formData, enableChristmas: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>开启圣诞节</span>
				</label>
			</div>

			{/* 🎩 最后：“帽子”区域（推测是页面顶部装饰/标题栏配置） */}
			<HatSection formData={formData} setFormData={setFormData} />
		</div>
	)
}