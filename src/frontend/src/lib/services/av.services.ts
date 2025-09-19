import type { IcToken } from '$icp/types/ic-token';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getTokenBalance } from '$lib/api/icp-swap-pool.api';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import type { ICPSwapQuoteParams } from '$lib/types/api';
import type { Identity } from '@dfinity/agent';

export const checkBalances = async ({
	identity,
	sourceToken,
	destinationToken,
	fee = ICP_SWAP_POOL_FEE // The only supported pool fee on ICPSwap at the moment (0.3%)
}: ICPSwapQuoteParams): Promise<{
	token0: bigint;
	token1: bigint;
}> => {
	const pool = await getPoolCanister({
		identity,
		token0: { address: sourceToken.ledgerCanisterId, standard: sourceToken.standard },
		token1: { address: destinationToken.ledgerCanisterId, standard: destinationToken.standard },
		fee
	});

	return await getTokenBalance({
		identity,
		canisterId: pool.canisterId.toString()
	});
};

export interface DirectedEdge {
	from: string; // token symbol
	to: string; // token symbol
	poolId: string;
	num: bigint; // rate = num/den  (B per A, fee-adjusted, small-trade)
	den: bigint;
}

export interface PoolState {
	id: string;
	token0Sym: string;
	token1Sym: string;
	dec0: number;
	dec1: number;
	feeBps: bigint;
	reserve0: bigint; // raw units from getTokenBalance().token0
	reserve1: bigint; // raw units from getTokenBalance().token1
}

const BPS_DEN = 10_000n;

// 10^n as bigint
const pow10 = (n: number): bigint => {
	let r = 1n;
	for (let i = 0; i < n; i++) {
		r *= 10n;
	}
	return r;
};

// fee-on-input, x*y=k, bigint-safe (flooring)
export const outGivenInXYKBig = (
	reserveIn: bigint,
	reserveOut: bigint,
	dx: bigint,
	feeBps: bigint
): { dy: bigint; newIn: bigint; newOut: bigint } => {
	if (dx <= 0n) {
		return { dy: 0n, newIn: reserveIn, newOut: reserveOut };
	}
	const fNum = BPS_DEN - BigInt(feeBps);
	const dxEff = (dx * fNum) / BPS_DEN;
	const numerator = dxEff * reserveOut;
	const denominator = reserveIn + dxEff;
	const dy = numerator / denominator; // floor
	return { dy, newIn: reserveIn + dxEff, newOut: reserveOut - dy };
};

// Nice decimal formatting from raw units
export const fmtAmount = (units: bigint, decimals: number, maxDp = 6): string => {
	const neg = units < 0n ? '-' : '';
	const x = units < 0n ? -units : units;
	const scale = pow10(decimals);
	const int = (x / scale).toString();
	let frac = (x % scale).toString().padStart(decimals, '0');
	if (decimals > 0) {
		// trim to maxDp
		if (frac.length > maxDp) {
			frac = frac.slice(0, maxDp);
		}
		frac = frac.replace(/0+$/, '');
	}
	return frac.length ? `${neg}${int}.${frac}` : `${neg}${int}`;
};

// Build fee-adjusted small-trade rate A->B using integer maths:
// rate = (reserveB * 10^decA * (BPS_DEN - feeBps)) / (reserveA * 10^decB * BPS_DEN)
export const buildRateAB = (
	reserveA: bigint,
	reserveB: bigint,
	decA: number,
	decB: number,
	feeBps: bigint
): { num: bigint; den: bigint } => {
	const fNum = BPS_DEN - BigInt(feeBps);
	const scaleNum = pow10(decA);
	const scaleDen = pow10(decB);
	const num = reserveB * scaleNum * fNum; // B * 10^decA * (1-fee)
	const den = reserveA * scaleDen * BPS_DEN; // A * 10^decB * 1
	return { num, den };
};

export const edgesForPair = async ({
	identity,
	tokenA,
	tokenB,
	fee
}: {
	identity: Identity;
	tokenA: IcToken;
	tokenB: IcToken;
	fee: bigint;
}): Promise<{ edges: DirectedEdge[]; state: PoolState } | null> => {
	try {
		const pool = await getPoolCanister({
			identity,
			token0: { address: tokenA.ledgerCanisterId, standard: tokenA.standard },
			token1: { address: tokenB.ledgerCanisterId, standard: tokenB.standard },
			fee
		});

		const { token0, token1 } = await getTokenBalance({
			identity,
			canisterId: pool.canisterId.toString()
		});

		// Filter illiquid/zero pools
		if (token0 <= 0n || token1 <= 0n) {
			return null;
		}

		// — inside edgesForPair, after getTokenBalance —
		const MIN_RAW = 1n; // no zero balances
		if (token0 <= MIN_RAW || token1 <= MIN_RAW) {
			return null;
		}

		// Optional: enforce a min notional on both sides using decimals (e.g. ≥ 1e-6 of each token)
		const minUnits = 1n; // tune if you have token-specific thresholds
		if (token0 < minUnits || token1 < minUnits) {
			return null;
		}

		// Pool balances are aligned with token0/token1 in the call above.
		// Create both directions with proper decimal scaling and fee.
		const ab = buildRateAB(token0, token1, tokenA.decimals, tokenB.decimals, fee);
		const ba = buildRateAB(token1, token0, tokenB.decimals, tokenA.decimals, fee);

		const edges: DirectedEdge[] = [
			{
				from: tokenA.symbol,
				to: tokenB.symbol,
				poolId: pool.canisterId.toString(),
				num: ab.num,
				den: ab.den
			},
			{
				from: tokenB.symbol,
				to: tokenA.symbol,
				poolId: pool.canisterId.toString(),
				num: ba.num,
				den: ba.den
			}
		];

		const state: PoolState = {
			id: pool.canisterId.toString(),
			token0Sym: tokenA.symbol,
			token1Sym: tokenB.symbol,
			dec0: tokenA.decimals,
			dec1: tokenB.decimals,
			feeBps: fee,
			reserve0: token0,
			reserve1: token1
		};

		return { edges, state };
	} catch {
		// No pool for this pair or fetch failed → skip
		return null;
	}
};

interface TriArb {
	cycle: [string, string, string, string]; // e.g. ['ckUSDC','ckBTC','ckETH','ckUSDC']
	pools: [string, string, string]; // pool IDs used in order
	productNum: bigint; // numerator of rate product
	productDen: bigint; // denominator of rate product
}

// — add near helpers —
const gcd = (a: bigint, b: bigint): bigint => {
	while (b !== 0n) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a < 0n ? -a : a;
};

const mulFrac = (n1: bigint, d1: bigint, n2: bigint, d2: bigint): { n: bigint; d: bigint } => {
	// cross-cancel to keep numbers small
	const g1 = gcd(n1, d2);
	n1 /= g1;
	d2 /= g1;
	const g2 = gcd(n2, d1);
	n2 /= g2;
	d1 /= g2;
	return { n: n1 * n2, d: d1 * d2 };
};

export const findTriangularArbs = (edges: DirectedEdge[], epsilonPpm = 1000): TriArb[] => {
	// index edges by from->to
	const key = (a: string, b: string) => `${a}→${b}`;
	const map = new Map<string, DirectedEdge>();
	for (const e of edges) {
		map.set(key(e.from, e.to), e);
	}

	const tokens = Array.from(new Set(edges.flatMap((e) => [e.from, e.to])));

	const EPS_NUM = BigInt(1_000_000 + epsilonPpm); // 1 + epsilon in ppm
	const EPS_DEN = 1_000_000n;

	const results: TriArb[] = [];
	for (let i = 0; i < tokens.length; i++) {
		for (let j = 0; j < tokens.length; j++) {
			if (j === i) {
				continue;
			}
			for (let k = 0; k < tokens.length; k++) {
				if (k === i || k === j) {
					continue;
				}
				const a = tokens[i],
					b = tokens[j],
					c = tokens[k];
				const e1 = map.get(key(a, b));
				const e2 = map.get(key(b, c));
				const e3 = map.get(key(c, a));
				if (!e1 || !e2 || !e3) {
					continue;
				}

				// product = (e1.num/e1.den) * (e2.num/e2.den) * (e3.num/e3.den)
				const p12 = mulFrac(e1.num, e1.den, e2.num, e2.den);
				const p123 = mulFrac(p12.n, p12.d, e3.num, e3.den);
				const num = p123.n;
				const den = p123.d;

				// require product > 1 + epsilon
				if (num * EPS_DEN > den * EPS_NUM) {
					results.push({
						cycle: [a, b, c, a],
						pools: [e1.poolId, e2.poolId, e3.poolId],
						productNum: num,
						productDen: den
					});
				}
			}
		}
	}
	// (optional) deduplicate by cycle signature (start at lexicographically smallest)
	const seen = new Set<string>();
	return results.filter((arb) => {
		const sig = arb.cycle.join('>');
		if (seen.has(sig)) {
			return false;
		}
		seen.add(sig);
		return true;
	});
};

// — add helper —
// Render a BigInt ratio (num/den) in scientific notation with s significant digits, avoiding Number overflow.
export const formatRationalSig = (num: bigint, den: bigint, s: number): string => {
	if (den === 0n) {
		return '∞';
	}
	if (num === 0n) {
		return '0';
	}

	// Normalise by removing common factors of 10 to keep strings short
	const trimZeros = (x: bigint): [bigint, number] => {
		let t = 0;
		while (x % 10n === 0n) {
			x /= 10n;
			t++;
		}
		return [x, t];
	};
	const [n, tn] = trimZeros(num);
	const [d, td] = trimZeros(den);
	const exp10 = tn - td;

	// Take first s digits of n and d to approximate mantissa using integer division
	const nd = n.toString().length;
	const dd = d.toString().length;
	const takeN = BigInt(Math.max(0, s - (nd > s ? 0 : nd)));
	const takeD = BigInt(Math.max(0, s - (dd > s ? 0 : dd)));

	// Scale to equalise and extract a mantissa as integer
	const pow10 = (k: bigint): bigint => {
		let r = 1n;
		for (let i = 0n; i < k; i++) {
			r *= 10n;
		}
		return r;
	};

	const scaleN = nd > s ? 0n : takeN;
	const scaleD = dd > s ? 0n : takeD;

	const nAdj = nd > s ? n / pow10(BigInt(nd - s)) : n * pow10(scaleN);
	const dAdj = dd > s ? d / pow10(BigInt(dd - s)) : d * pow10(scaleD);

	const mantInt = (nAdj * 1_000_000n) / dAdj; // 6 fixed decimals in mantissa
	const mantStr = (Number(mantInt) / 1e6).toFixed(6);

	// Overall decimal exponent ≈ (nd - dd) + exp10 + (scale corrections)
	const exp =
		nd -
		dd +
		exp10 +
		Number(scaleN) -
		Number(scaleD) +
		((nd > s ? -(nd - s) : Number(scaleN)) - (dd > s ? -(dd - s) : Number(scaleD)));

	return `${mantStr}e${exp >= 0 ? '+' : ''}${exp}`;
};

// —[ADD near helpers]—
export const simulateCycleVerbose = (
	cycle: [string, string, string, string],
	pools: [string, string, string],
	startUnits: bigint, // input amount in raw units of cycle[0]
	poolById: Map<string, PoolState>
): {
	ok: boolean;
	logs: string[];
	finalUnits: bigint;
} => {
	let curSym = cycle[0];
	let amount = startUnits;
	const logs: string[] = [];

	for (let leg = 0; leg < 3; leg++) {
		const nextSym = cycle[leg + 1];
		const poolId = pools[leg];
		const state = poolById.get(poolId);
		if (!state) {
			return { ok: false, logs: [`Missing pool state ${poolId}`], finalUnits: 0n };
		}

		// Determine direction and reserves/decimals
		let reserveIn: bigint, reserveOut: bigint, decIn: number, decOut: number;
		if (curSym === state.token0Sym && nextSym === state.token1Sym) {
			reserveIn = state.reserve0;
			reserveOut = state.reserve1;
			decIn = state.dec0;
			decOut = state.dec1;
		} else if (curSym === state.token1Sym && nextSym === state.token0Sym) {
			reserveIn = state.reserve1;
			reserveOut = state.reserve0;
			decIn = state.dec1;
			decOut = state.dec0;
		} else {
			return {
				ok: false,
				logs: [`Pool ${poolId} does not connect ${curSym}→${nextSym}`],
				finalUnits: 0n
			};
		}

		const beforeIn = reserveIn,
			beforeOut = reserveOut;

		const { dy, newIn, newOut } = outGivenInXYKBig(reserveIn, reserveOut, amount, state.feeBps);
		if (dy <= 0n) {
			return { ok: false, logs: [`Zero out on leg ${curSym}→${nextSym}`], finalUnits: 0n };
		}

		// Update local reserves for this leg only (don’t mutate map)
		reserveIn = newIn;
		reserveOut = newOut;

		logs.push(
			`Swap on ${poolId}: ${fmtAmount(amount, decIn)} ${curSym} → ${fmtAmount(dy, decOut)} ${nextSym} ` +
				`(reserves: ${fmtAmount(beforeIn, decIn)}/${fmtAmount(beforeOut, decOut)} → ${fmtAmount(reserveIn, decIn)}/${fmtAmount(reserveOut, decOut)})`
		);

		amount = dy;
		curSym = nextSym;
	}

	return { ok: true, logs, finalUnits: amount };
};

// Choose a conservative test input: ~0.1% of input-side reserve of first leg, clamped
export const pickTestInput = (
	firstPool: PoolState,
	fromSym: string
): { units: bigint; decimals: number } => {
	const is0 = fromSym === firstPool.token0Sym;
	const dec = is0 ? firstPool.dec0 : firstPool.dec1;
	const reserveIn = is0 ? firstPool.reserve0 : firstPool.reserve1;

	// 0.1% of reserve, min 1 unit, max 1% to avoid absurd slippage
	let units = reserveIn / 1000n;
	if (units < 1n) {
		units = 1n;
	}
	const cap = reserveIn / 100n;
	if (units > cap) {
		units = cap;
	}

	return { units, decimals: dec };
};
