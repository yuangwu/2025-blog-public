// 声明该文件为客户端组件（Next.js App Router）
'use client'

import { useMemo, useState } from 'react'
import { SvgComponent, svgItems } from '@/svgs/index'

export default function Page() {
	// 搜索关键词状态
	const [query, setQuery] = useState('')
	// 记录当前复制成功的图标 key，用于展示“Copied”提示
	const [copiedKey, setCopiedKey] = useState<string | null>(null)

	// 预处理 SVG 列表，提取 key、组件以及去掉路径与扩展名后的显示标签
	const items = useMemo(
		() =>
			svgItems.map(({ key, Component }: { key: string; Component: SvgComponent }) => ({
				key,
				Component,
				label: key.replace(/^\.\//, '').replace(/\.svg$/, '')
			})),
		[]
	)

	// 根据搜索关键词过滤后的 SVG 列表
	const filteredItems = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter(i => i.label.toLowerCase().includes(q))
	}, [items, query])

	// 将字符串转换为 PascalCase 格式（用于生成 import 语句的变量名）
	const toPascalCase = (input: string) => {
		return input
			.split(/[^a-zA-Z0-9]+/)   // 按非字母数字字符分割
			.filter(Boolean)          // 去除空字符串
			.map(part => part.charAt(0).toUpperCase() + part.slice(1)) // 首字母大写
			.join('')
	}

	// 点击图标时复制 import 命令到剪贴板
	const handleCopy = async (label: string, key: string) => {
		try {
			const varName = `${toPascalCase(label)}SVG`
			const importCmd = `import ${varName} from '@/svgs/${label}.svg'`
			await navigator.clipboard.writeText(importCmd)
			setCopiedKey(key)
			// 1.5 秒后隐藏“Copied”提示
			window.setTimeout(() => setCopiedKey(null), 1500)
		} catch (_) {
			// 复制失败时静默处理
		}
	}

	return (
		<div className='mx-auto max-w-5xl space-y-4 px-6 py-8'>
			{/* 顶部标题与搜索栏 */}
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

			{/* 图标网格展示区 */}
			<div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'>
				{filteredItems.map(({ key, Component, label }: { key: string; Component: SvgComponent; label: string }) => (
					<button
						key={key}
						onClick={() => handleCopy(label, key)}
						title={'Click to copy import command'}
						type='button'
						className='bg-background group relative flex flex-col items-center rounded-md border p-3 text-left transition-colors hover:bg-slate-800/5'
					>
						{/* SVG 图标预览 */}
						<div className='flex h-12 items-center justify-center'>
							<Component className='h-8 w-8' />
						</div>
						{/* 图标名称 */}
						<div
							title={label}
							className='text-muted-foreground mt-2 w-full overflow-hidden text-center text-xs break-all text-ellipsis whitespace-nowrap'
						>
							{label}
						</div>
						{/* 复制成功提示 */}
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