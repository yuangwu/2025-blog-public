// 声明该文件仅在客户端执行（Next.js App Router 客户端组件）
'use client'

import { useCallback, useState } from 'react'

// 单条抽卡记录的数据结构
interface CardRecord {
	cardPoolType: string   // 卡池类型（如角色活动、武器活动等）
	resourceId: number     // 资源 ID
	qualityLevel: number   // 品质等级（3/4/5星）
	resourceType: string   // 资源类型（角色/武器）
	name: string           // 物品名称
	count: number          // 数量
	time: string           // 抽取时间
}

// 一个“保底段”的数据结构，用于展示从上次五星到本次五星之间的抽数
type PitySegment = {
	pulls: number          // 本段累计抽数（包含结束的5星那次）
	name: string | null    // 结束该段的5星物品名称（若未出5星则为null）
	time: string | null    // 出5星的时间（同上）
}

/**
 * 将原始 JSON 字符串解析为 CardRecord 数组，
 * 并进行基本的数据校验。
 */
function parseCardRecords(raw: string): CardRecord[] {
	const data = JSON.parse(raw) as unknown
	// 顶层必须是数组
	if (!Array.isArray(data)) {
		throw new Error('根节点必须是数组')
	}
	return data.map((item, i) => {
		// 每项必须是对象
		if (typeof item !== 'object' || item === null) {
			throw new Error(`第 ${i + 1} 项不是对象`)
		}
		const r = item as Record<string, unknown>
		const qualityLevel = Number(r.qualityLevel)
		// qualityLevel 必须为有效数字
		if (!Number.isFinite(qualityLevel)) {
			throw new Error(`第 ${i + 1} 项缺少有效的 qualityLevel`)
		}
		// 转换并返回标准化的记录对象，缺失字段给予默认值
		return {
			cardPoolType: String(r.cardPoolType ?? ''),
			resourceId: Number(r.resourceId ?? 0),
			qualityLevel,
			resourceType: String(r.resourceType ?? ''),
			name: String(r.name ?? ''),
			count: Number(r.count ?? 1),
			time: String(r.time ?? '')
		}
	})
}

/**
 * 根据抽卡记录数组构建保底段列表。
 * 逻辑：从第一条记录开始逐条累加抽数。
 * 每当遇到 qualityLevel === 5 的记录，就将当前累计的抽数、上一个五星的名称和时间包装成一个段存入数组，
 * 然后重置计数器并从本次五星开始重新计数。
 * 遍历结束后，若还有未出五星的剩余抽数，也记录为一段（name 为 null）。
 */
function buildPitySegments(records: CardRecord[]): PitySegment[] {
	const segments: PitySegment[] = []
	let pulls = 0          // 当前段累计抽数
	let name = null        // 上一个5星名称（初始无）
	let time = null        // 上一个5星时间

	for (const rec of records) {
		pulls++
		if (rec.qualityLevel === 5) {
			// 遇到5星，完成本段（抽数包含该5星）
			segments.push({ pulls, name: name, time: time })
			// 重置计数器（本5星已计入本段，下一段从它之后重新计数）
			pulls = 0
			// 更新“上一个5星”信息，供下一段使用
			name = rec.name
			time = rec.time
		}
	}
	// 如果还有未结束的抽数（未出5星），追加一段
	if (pulls > 0) {
		segments.push({ pulls, name: name, time: time })
	}
	return segments
}

// 页面主组件
export default function Page() {
	const [input, setInput] = useState('')                // JSON输入框内容
	const [error, setError] = useState<string | null>(null) // 解析错误信息
	const [segments, setSegments] = useState<PitySegment[]>([]) // 分析后的分段数据

	/**
	 * 点击“分析”按钮的回调，对输入的JSON进行解析和分段
	 */
	const analyze = useCallback(() => {
		setError(null)
		const trimmed = input.trim()
		if (!trimmed) {
			setSegments([])
			return
		}
		try {
			const records = parseCardRecords(trimmed)
			setSegments(buildPitySegments(records))
		} catch (e) {
			setSegments([])
			setError(e instanceof Error ? e.message : '解析失败')
		}
	}, [input])

	return (
		<div className='mx-auto max-w-3xl space-y-4 px-4 py-24'>
			{/* 标题 */}
			<h1 className='text-xl font-semibold tracking-tight'>鸣潮 · 抽卡记录分析</h1>
			<p className='text-sm'>
				<span>使用方法：</span>
			</p>
			{/* 使用步骤说明 */}
			<ul className='text-secondary list-inside list-disc text-sm'>
				<li>
					进入{' '}
					<a href='https://mc.kurogames.com/cloud/#/tools' target='_blank' className='text-brand hover:underline'>
						https://mc.kurogames.com/cloud/#/tools
					</a>
					，登录账号。
				</li>
				<li>
					点击 <span className='text-brand'>F12</span>，点击右侧 <span className='text-brand'>Network</span> 面板。左侧选择<span className='text-brand'>换取记录</span>
					，右侧观察出现最新的 <span className='text-brand'>query</span> 请求。
				</li>
				<li>
					点击 <span className='text-brand'>query</span> 请求，点击 <span className='text-brand'>Preview</span> 面板，右键 <span className='text-brand'>data</span> 值{' '}
					<span className='text-brand'>Copy Value</span>。
				</li>
				<li>最后粘贴到下方输入框 - 分析。</li>
			</ul>

			{/* JSON 输入框 */}
			<textarea
				value={input}
				onChange={e => setInput(e.target.value)}
				rows={5}
				spellCheck={false}
				className='bg-card text-foreground focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none'
				style={{ maxHeight: '7.5rem' }}
				placeholder='[{"cardPoolType":"…","qualityLevel":4,"name":"…",...}, ...]'
			/>

			{/* 分析按钮 */}
			<button type='button' onClick={analyze} className='bg-brand rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90'>
				分析
			</button>

			{/* 错误信息提示 */}
			{error ? (
				<p className='text-destructive text-sm' role='alert'>
					{error}
				</p>
			) : null}

			{/* 分析结果展示：每个保底段显示为一个条形图 + 文字 */}
			{segments.length > 0 ? (
				<ul className='space-y-2'>
					{segments.map((seg, i) => (
						<li key={i} className='group flex items-center gap-3'>
							{/* 条形图，宽度与抽数成正比，显示抽数 */}
							<div
								className='bg-brand-secondary flex h-7 shrink-0 items-center overflow-hidden rounded-sm pl-2 text-xs leading-none font-bold text-white tabular-nums'
								style={{ width: seg.pulls * 4 + 16 }}
								title={`${seg.pulls} 抽`}>
								{seg.pulls}
							</div>
							{/* 物品名称与时间（hover 时显示日期） */}
							<span className='text-foreground min-w-0 flex-1 truncate text-sm'>
								{seg.name ? (
									<span>
										{seg.name} <span className='text-secondary hidden text-xs group-hover:inline'>({seg.time?.slice(0, 10)})</span>
									</span>
								) : (
									<span className='text-secondary'>（未到 5 星）</span>
								)}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}