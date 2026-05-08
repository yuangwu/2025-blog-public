'use client'

// 从配置 store 中导入 SiteContent 类型，用于表示网站的全部配置数据
import type { SiteContent } from '../../stores/config-store'
// 导入各图片上传模块和文件项的类型定义
import type { ArtImageUploads, BackgroundImageUploads, FileItem, SocialButtonImageUploads } from './types'
// 导入各个子设置组件
import { FaviconAvatarUpload } from './favicon-avatar-upload'
import { SiteMetaForm } from './site-meta-form'
import { ArtImagesSection } from './art-images-section'
import { BackgroundImagesSection } from './background-images-section'
import { SocialButtonsSection } from './social-buttons-section'
import { HatSection } from './hat-section'
import { BeianForm } from './beian-form'

// 重新导出类型，方便外部使用
export type { FileItem, ArtImageUploads, BackgroundImageUploads, SocialButtonImageUploads } from './types'

// SiteSettings 组件的 Props 类型定义，包含所有需要传递的状态和更新函数
interface SiteSettingsProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	faviconItem: FileItem | null
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	avatarItem: FileItem | null
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	artImageUploads: ArtImageUploads
	setArtImageUploads: React.Dispatch<React.SetStateAction<ArtImageUploads>>
	backgroundImageUploads: BackgroundImageUploads
	setBackgroundImageUploads: React.Dispatch<React.SetStateAction<BackgroundImageUploads>>
	socialButtonImageUploads: SocialButtonImageUploads
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>>
}

// 网站设置主组件，负责组合各个子设置区域
export function SiteSettings({
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
		<div className='space-y-6'>
			{/* 网站图标和头像上传 */}
			<FaviconAvatarUpload faviconItem={faviconItem} setFaviconItem={setFaviconItem} avatarItem={avatarItem} setAvatarItem={setAvatarItem} />

			{/* 网站元信息表单（标题、描述等） */}
			<SiteMetaForm formData={formData} setFormData={setFormData} />

			{/* 备案号设置表单 */}
			<BeianForm formData={formData} setFormData={setFormData} />

			{/* 社交按钮设置区域，包含图片上传功能 */}
			<SocialButtonsSection
				formData={formData}
				setFormData={setFormData}
				socialButtonImageUploads={socialButtonImageUploads}
				setSocialButtonImageUploads={setSocialButtonImageUploads}
			/>

			{/* 艺术作品图片管理 */}
			<ArtImagesSection formData={formData} setFormData={setFormData} artImageUploads={artImageUploads} setArtImageUploads={setArtImageUploads} />

			{/* 背景图片管理 */}
			<BackgroundImagesSection
				formData={formData}
				setFormData={setFormData}
				backgroundImageUploads={backgroundImageUploads}
				setBackgroundImageUploads={setBackgroundImageUploads}
			/>

			{/* 其他开关选项：时钟秒数、摘要放入内容、隐藏编辑按钮 */}
			<div className='flex gap-3'>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.clockShowSeconds ?? false}
						onChange={e => setFormData({ ...formData, clockShowSeconds: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>时钟显示秒数</span>
				</label>

				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.summaryInContent ?? false}
						onChange={e => setFormData({ ...formData, summaryInContent: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>摘要放入内容</span>
				</label>

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

			{/* 高级开关选项：缓存 PEM、启用分类、开启圣诞节效果 */}
			<div className='flex gap-3'>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.isCachePem ?? false}
						onChange={e => setFormData({ ...formData, isCachePem: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>缓存PEM(已加密，但存在风险)</span>
				</label>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.enableCategories ?? false}
						onChange={e => setFormData({ ...formData, enableCategories: e.target.checked })}
						className='accent-brand h-4 w-4 rounded'
					/>
					<span className='text-sm font-medium'>启用文章分类</span>
				</label>
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

			{/* 顶帽（Hat）效果设置 */}
			<HatSection formData={formData} setFormData={setFormData} />
		</div>
	)
}
