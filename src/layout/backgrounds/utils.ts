// Simplex noise implementation (small, inline) adapted from Jonas Wagner (public domain)
// https://github.com/jwagner/simplex-noise.js (trimmed for 2D)
// 该实现是一个精简的 2D Simplex 噪声生成器，源自 Jonas Wagner 的公共领域代码。
// 它返回一个噪声函数，可以对任意 (x, y) 坐标生成连续的伪随机值，
// 常用于程序化纹理、地形生成等需要自然随机过渡的场景。

export function makeNoise2D(random = Math.random) {
	// p 是一个 256 字节的排列表，用来将网格顶点映射到伪随机梯度方向。
	// 这里没有使用标准的 0-255 随机排列，而是直接填充随机值，然后通过模 256 索引。
	// 虽然形式上不同，但效果上同样提供了足够的随机性。
	const p = new Uint8Array(256)
	for (let i = 0; i < 256; i++) p[i] = (random() * 256) | 0

	/**
	 * 根据哈希值选择一个二维梯度，并与 (x, y) 计算点积。
	 * hash & 7 将哈希值限定在 0~7，对应 8 个预定义的"单位向量"。
	 * 这 8 个向量可以理解为正方形的 8 个方向：
	 *   (1,2), (1,-2), (-1,2), (-1,-2), (2,1), (2,-1), (-2,1), (-2,-1)
	 * 因为返回的是点积，这些向量的长度并不一致，但经过后面衰减因子和归一化，
	 * 仍能产生视觉上良好的噪声。
	 *
	 * @param hash - 从排列表 p 中获取的随机索引值
	 * @param x    - 相对于该顶点的 x 偏移
	 * @param y    - 相对于该顶点的 y 偏移
	 * @returns 梯度向量与 (x, y) 的点积
	 */
	function grad2(hash: number, x: number, y: number) {
		const h = hash & 7
		// 取低 3 位，得到 0~7 的索引
		const u = h < 4 ? x : y
		// 前 4 种梯度使用 (x, y) 顺序，后 4 种使用 (y, x) 顺序
		const v = h < 4 ? y : x
		// hash & 1 决定 u 的符号，hash & 2 决定 v 的符号（并且 v 的系数是 2）
		return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v)
	}

	// 将坐标从输入空间转换到单纯形空间的歪斜因子。
	// F2 = 0.5*(sqrt(3)-1) ≈ 0.3660254038
	// 在二维中，这个值使得输入的正交网格被"挤压"成正三角形网格，
	// 以便于在单纯形中定位。
	const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)

	// 将单纯形空间坐标变回正交空间的"逆歪斜"因子。
	// G2 = (3 - sqrt(3))/6 ≈ 0.2113248654
	const G2 = (3.0 - Math.sqrt(3.0)) / 6.0

	// 返回实际的噪声函数，它每次调用都会为某个 (xin, yin) 计算噪声值。
	return function noise2D(xin: number, yin: number) {
		let n0 = 0, n1 = 0, n2 = 0  // 三个顶点的贡献值初始化为 0

		// 第一步：歪斜变换，将输入点从正交坐标映射到单纯形空间。
		// 这样可以确定该点位于哪个正三角形（2D 单纯形）的内部。
		const s = (xin + yin) * F2
		const i = Math.floor(xin + s)
		// 歪斜后的整数坐标，对应单纯形网格的"顶点单元"
		const j = Math.floor(yin + s)

		// 第二步：逆歪斜，得到该单元原点在原始空间中的坐标。
		const t = (i + j) * G2
		const X0 = i - t 
		// (i,j) 单元原点转换回原始空间的 X 坐标
		const Y0 = j - t 
		// (i,j) 单元原点转换回原始空间的 Y 坐标

		// 第三步：计算该点相对于单元原点的偏移量 (x0, y0)
		const x0 = xin - X0
		const y0 = yin - Y0

		// 在由两个正三角形组成的菱形中，判断该点属于上方三角形还是下方三角形。
		// 如果 x0 > y0，则位于右下方三角形（对应顶点索引 i1=1, j1=0）；
		// 否则位于左上方三角形（对应顶点索引 i1=0, j1=1）。
		const i1 = x0 > y0 ? 1 : 0
		const j1 = x0 > y0 ? 0 : 1

		// 第四步：计算该点到另外两个顶点的偏移量
		// (x1, y1) 是到第二个顶点的偏移（(i+i1, j+j1) 对应单纯形内的第二个顶点）
		const x1 = x0 - i1 + G2
		const y1 = y0 - j1 + G2
		// (x2, y2) 是到第三个顶点的偏移（(i+1, j+1) 对应单纯形内的第三个顶点）
		const x2 = x0 - 1 + 2 * G2
		const y2 = y0 - 1 + 2 * G2

		// 将网格坐标限制在 0~255 内，以便在排列表 p 中查表。
		// 这里使用 & 255 相当于模 256，因为 p 的大小是 256。
		const ii = i & 255
		const jj = j & 255

		// 第五步：分别计算三个顶点对该点的径向衰减加权后的梯度贡献。
		// 衰减函数 max(0, 0.5 - x^2 - y^2)^4，保证距离顶点越远，贡献下降到 0 越平滑。

		// 顶点 (i,j) 的贡献
		const t0 = 0.5 - x0 * x0 - y0 * y0
		if (t0 >= 0) {
			// 从排列表中取出该顶点的随机哈希值，用于生成梯度
			const gi0 = p[ii + p[jj]]
			const t0_4 = t0 * t0 * t0 * t0 
			// 衰减值的四次方，使贡献光滑衰减
			n0 = t0_4 * grad2(gi0, x0, y0)
			// 衰减因子乘以梯度点积
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

		// 第六步：将三个贡献相加，并乘以一个魔法系数进行归一化。
		// 40 这个数值是将理论上的梯度贡献值映射到大约 [-1, 1] 的范围。
		// 由于 grad2 中的非标准梯度长度，这里用的是经验缩放因子。
		return 40 * (n0 + n1 + n2)
	}
}

/**
 * 返回 [a, b) 区间内的一个随机浮点数。
 * 这是一个简单的辅助函数，常用于在噪声函数的基础上进行范围映射。
 *
 * @param a - 下界（包含）
 * @param b - 上界（不包含）
 * @returns a 到 b 之间的随机数
 */
export function rand(a: number, b: number) {
	return a + Math.random() * (b - a)
}
