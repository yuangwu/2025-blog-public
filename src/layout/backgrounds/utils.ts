// 简化版 2D Simplex 噪声实现，改编自 Jonas Wagner 的公共领域代码
// 原始仓库：https://github.com/jwagner/simplex-noise.js （仅保留 2D 部分）
export function makeNoise2D(random = Math.random) {
	// 创建一个长度为 256 的排列表 p，用于哈希查找
	const p = new Uint8Array(256)
	// 用 0~255 的随机整数填充排列表
	for (let i = 0; i < 256; i++) p[i] = (random() * 256) | 0

	// 梯度计算函数，根据哈希值选择梯度向量并与 (x,y) 做点积
	function grad2(hash: number, x: number, y: number) {
		// 取哈希的低 3 位决定使用哪个梯度
		const h = hash & 7
		// 根据 h 选择 x 或 y 作为 u，另一个作为 v
		const u = h < 4 ? x : y
		const v = h < 4 ? y : x
		// 根据 h 的位标志决定正负号并求和，等价于点积
		return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v)
	}

	// 用于将六边形/三角形网格拉伸为正方形网格的常数
	const G2 = (3.0 - Math.sqrt(3.0)) / 6.0
	const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)

	// 返回一个接收 (xin, yin) 的 2D 噪声函数
	return function noise2D(xin: number, yin: number) {
		let n0 = 0,
			n1 = 0,
			n2 = 0 // 三角形的三个顶点的贡献值

		// 通过 F2 将输入坐标斜向拉伸，便于确定其在 simplex 网格中的位置
		const s = (xin + yin) * F2
		const i = Math.floor(xin + s) // 网格单元整数坐标 i
		const j = Math.floor(yin + s) // 网格单元整数坐标 j

		const t = (i + j) * G2 // 反向计算，求出该网格单元左下角在原坐标系的偏移
		const X0 = i - t // 单元左下角的 x 坐标
		const Y0 = j - t // 单元左下角的 y 坐标
		const x0 = xin - X0 // 相对于左下角的 x 偏移
		const y0 = yin - Y0 // 相对于左下角的 y 偏移

		// 确定点落在了哪个三角形内（x0 > y0 则落在下半三角形，否则上半三角形）
		const i1 = x0 > y0 ? 1 : 0
		const j1 = x0 > y0 ? 0 : 1

		// 计算另外两个顶点相对于输入点的偏移量
		const x1 = x0 - i1 + G2
		const y1 = y0 - j1 + G2
		const x2 = x0 - 1 + 2 * G2
		const y2 = y0 - 1 + 2 * G2

		// 将 i, j 映射到 0-255 范围，用于排列表查表
		const ii = i & 255
		const jj = j & 255

		// 第一个顶点的贡献
		const t0 = 0.5 - x0 * x0 - y0 * y0
		if (t0 >= 0) {
			// 通过排列表获取该顶点的梯度哈希
			const gi0 = p[ii + p[jj]]
			const t0_4 = t0 * t0 * t0 * t0 // t^4 衰减
			n0 = t0_4 * grad2(gi0, x0, y0)
		}

		// 第二个顶点的贡献
		const t1 = 0.5 - x1 * x1 - y1 * y1
		if (t1 >= 0) {
			const gi1 = p[ii + i1 + p[jj + j1]]
			const t1_4 = t1 * t1 * t1 * t1
			n1 = t1_4 * grad2(gi1, x1, y1)
		}

		// 第三个顶点的贡献
		const t2 = 0.5 - x2 * x2 - y2 * y2
		if (t2 >= 0) {
			const gi2 = p[ii + 1 + p[jj + 1]]
			const t2_4 = t2 * t2 * t2 * t2
			n2 = t2_4 * grad2(gi2, x2, y2)
		}

		// 将三顶点贡献相加并缩放，结果范围大约在 [-1, 1]
		return 40 * (n0 + n1 + n2)
	}
}

// 生成区间 [a, b] 内的随机数
export function rand(a: number, b: number) {
	return a + Math.random() * (b - a)
}
