'use client'

import { useMemo, useState } from 'react'
// 注意：请确保 @/svgs/index 文件存在并正确导出了以下内容：
//   - SvgComponent 类型（React 组件类型，接收 className 等 props）
//   - svgItems 数组，元素为 { key: string, Component: SvgComponent }
// 如果缺少该文件或导出不正确，会导致构建失败。
import { SvgComponent, svgItems } from '@/svgs/index'

export default function Page() {
	// 搜索框输入的筛选关键词
	const [query, setQuery] = useState('')
	// 记录最近被点击复制的图标 key，用于显示“Copied”提示
	const [copiedKey, setCopiedKey] = useState<string | null>(null)

	// 将原始 svgItems 转换为方便渲染的数据结构
	// 提取 label（文件名去掉 .svg 后缀和开头的 './' 等）
	const items = useMemo(
		() =>
			svgItems.map(({ key, Component }: { key: string; Component: SvgComponent }) => ({
				key,
				Component,
				label: key.replace(/^\.\//, '').replace(/\.svg$/, '')
			})),
		[] // 依赖为空，因为 svgItems 在模块顶层是静态的
	)

	// 根据 query 筛选图标
	const filteredItems = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter(i => i.label.toLowerCase().includes(q))
	}, [items, query])

	// 将文件名（如 'arrow-left'）转换为 PascalCase（如 'ArrowLeft'）
	// 用于生成符合 JavaScript 变量名的导入名称
	const toPascalCase = (input: string) => {
		return input
			.split(/[^a-zA-Z0-9]+/) // 按非字母数字分割
			.filter(Boolean)        // 移除空字符串
			.map(part => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	}

	// 复制 SVGR 导入语句到剪贴板
	// 假设项目已配置支持 .svg 文件作为 React 组件（例如使用 @svgr/webpack 或 Next.js 的 SVGR 插件）
	// 若未配置，此导入语句在实际使用时可能报错，但复制操作本身不会引发构建失败。
	const handleCopy = async (label: string, key: string) => {
		try {
			// 生成变量名，例如 'ArrowLeftSVG'
			const varName = `${toPascalCase(label)}SVG`
			// 构造导入语句，假设所有 SVG 文件位于 @/svgs/ 目录下，且以 .svg 结尾
			const importCmd = `import ${varName} from '@/svgs/${label}.svg'`
			await navigator.clipboard.writeText(importCmd)
			setCopiedKey(key)
			// 1.5 秒后自动清除复制成功提示
			window.setTimeout(() => setCopiedKey(null), 1500)
		} catch (_) {
			// 静默处理失败（例如用户拒绝剪贴板权限）
		}
	}

	return (
		<div className='mx-auto max-w-5xl space-y-4 px-6 py-8'>
			<div className='flex items-center justify-between gap-3'>
				<h1 className='text-xl font-medium'>SVG Gallery</h1>
				<input
					type='text'
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder='Filter icons...'
					className='bg-background h-9 w-56 rounded-md border px-3 text-sm outline-none'
				/>
			</div>
			<div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'>
				{filteredItems.map(({ key, Component, label }: { key: string; Component: SvgComponent; label: string }) => (
					<button
						key={key}
						onClick={() => handleCopy(label, key)}
						title='Click to copy import command'
						type='button'
						className='bg-background group relative flex flex-col items-center rounded-md border p-3 text-left transition-colors hover:bg-slate-800/5'>
						<div className='flex h-12 items-center justify-center'>
							<Component className='h-8 w-8' />
						</div>
						<div title={label} className='text-muted-foreground mt-2 w-full overflow-hidden text-center text-xs break-all text-ellipsis whitespace-nowrap'>
							{label}
						</div>
						{copiedKey === key && (
							<span className='bg-foreground/90 text-background pointer-events-none absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium'>
								Copied
							</span>
						)}
					</button>
				))}
			</div>
		</div>
	)
}
