import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import {
	computeOisyTradeReceiveAmount,
	findOisyTradePair,
	isOisyTradePair,
	oisyTradeCompatibleDestinations,
	oisyTradeSupportedSourceTokens,
	resolveOisyTradeOrder,
	resolveOisyTradeSide,
	toOisyTradePairTable
} from '$lib/utils/oisy-trade-swap.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';
const CKBTC_LEDGER = 'mxzaz-hqaaa-aaaar-qaada-cai';
const UNPAIRED_LEDGER = 'ss2fx-dyaaa-aaaar-qacoq-cai';

const icToken = ({
	ledgerCanisterId,
	decimals,
	symbol
}: {
	ledgerCanisterId: string;
	decimals: number;
	symbol: string;
}): IcToken => ({ ...mockValidIcToken, ledgerCanisterId, decimals, symbol });

const ICP = icToken({ ledgerCanisterId: ICP_LEDGER, decimals: 8, symbol: 'ICP' });
const CKUSDC = icToken({ ledgerCanisterId: CKUSDC_LEDGER, decimals: 6, symbol: 'ckUSDC' });
const CKBTC = icToken({ ledgerCanisterId: CKBTC_LEDGER, decimals: 8, symbol: 'ckBTC' });
const UNPAIRED = icToken({ ledgerCanisterId: UNPAIRED_LEDGER, decimals: 18, symbol: 'ckETH' });

const buildPair = ({
	base,
	quote,
	halted = false,
	lotSize = 1_000_000n,
	tickSize = 1_000n,
	minNotional = 5_000_000n,
	maxNotional = [] as [] | [bigint]
}: {
	base: IcToken;
	quote: IcToken;
	halted?: boolean;
	lotSize?: bigint;
	tickSize?: bigint;
	minNotional?: bigint;
	maxNotional?: [] | [bigint];
}): TradingPairInfo =>
	({
		status: halted ? { Halted: null } : { Trading: null },
		base: {
			id: { ledger_id: Principal.fromText(base.ledgerCanisterId) },
			metadata: { symbol: base.symbol, decimals: base.decimals }
		},
		quote: {
			id: { ledger_id: Principal.fromText(quote.ledgerCanisterId) },
			metadata: { symbol: quote.symbol, decimals: quote.decimals }
		},
		lot_size: lotSize,
		tick_size: tickSize,
		min_notional: minNotional,
		max_notional: maxNotional,
		maker_fee_bps: 5,
		taker_fee_bps: 10
	}) as unknown as TradingPairInfo;

// ICP/ckUSDC: 8 dp base, 6 dp quote. Lot 0.01 ICP, tick 0.001 ckUSDC, floor 5 ckUSDC.
const icpUsdc = buildPair({ base: ICP, quote: CKUSDC });
const ckbtcUsdc = buildPair({ base: CKBTC, quote: CKUSDC });

describe('oisy-trade-swap.utils', () => {
	describe('toOisyTradePairTable', () => {
		it('keeps actively-trading pairs', () => {
			expect(toOisyTradePairTable([icpUsdc, ckbtcUsdc])).toHaveLength(2);
		});

		it('drops halted pairs — the canister rejects new orders on them', () => {
			const halted = buildPair({ base: ICP, quote: CKUSDC, halted: true });

			expect(toOisyTradePairTable([halted, ckbtcUsdc])).toEqual([ckbtcUsdc]);
		});

		it('returns nothing when every pair is halted', () => {
			const halted = buildPair({ base: ICP, quote: CKUSDC, halted: true });

			expect(toOisyTradePairTable([halted])).toEqual([]);
		});
	});

	describe('oisyTradeSupportedSourceTokens', () => {
		it('collects both legs of every pair', () => {
			expect(oisyTradeSupportedSourceTokens([icpUsdc, ckbtcUsdc])).toEqual(
				new Set([ICP_LEDGER, CKUSDC_LEDGER, CKBTC_LEDGER])
			);
		});

		it('is empty for an empty table, so the provider contributes nothing', () => {
			expect(oisyTradeSupportedSourceTokens([])).toEqual(new Set());
		});
	});

	describe('oisyTradeCompatibleDestinations', () => {
		const table = [icpUsdc, ckbtcUsdc];

		it('narrows to the pair counterparts only, never the whole supported set', () => {
			// ckUSDC is paired with both ICP and ckBTC; ICP is paired only with ckUSDC.
			// A symmetric builder would hand ICP the whole set, which is the bug this guards.
			expect(oisyTradeCompatibleDestinations({ sourceToken: ICP, table })).toEqual({
				icp: new Set([CKUSDC_LEDGER])
			});
		});

		it('returns every counterpart when the token is a leg of several pairs', () => {
			expect(oisyTradeCompatibleDestinations({ sourceToken: CKUSDC, table })).toEqual({
				icp: new Set([ICP_LEDGER, CKBTC_LEDGER])
			});
		});

		it('returns undefined for a token in no pair', () => {
			expect(oisyTradeCompatibleDestinations({ sourceToken: UNPAIRED, table })).toBeUndefined();
		});

		it('returns undefined for a halted pair, on either side', () => {
			const halted = toOisyTradePairTable([buildPair({ base: ICP, quote: CKUSDC, halted: true })]);

			expect(oisyTradeCompatibleDestinations({ sourceToken: ICP, table: halted })).toBeUndefined();
			expect(
				oisyTradeCompatibleDestinations({ sourceToken: CKUSDC, table: halted })
			).toBeUndefined();
		});

		it('returns undefined for a non-IC token', () => {
			const evmToken = { ...mockValidIcToken, ledgerCanisterId: undefined } as unknown as Token;

			expect(oisyTradeCompatibleDestinations({ sourceToken: evmToken, table })).toBeUndefined();
		});
	});

	describe('findOisyTradePair / isOisyTradePair', () => {
		const table = [icpUsdc, ckbtcUsdc];

		it('finds the pair regardless of which side each token is on', () => {
			expect(findOisyTradePair({ sourceToken: ICP, destinationToken: CKUSDC, table })).toBe(
				icpUsdc
			);
			expect(findOisyTradePair({ sourceToken: CKUSDC, destinationToken: ICP, table })).toBe(
				icpUsdc
			);
		});

		it('is false for two tokens that share no pair', () => {
			expect(isOisyTradePair({ sourceToken: ICP, destinationToken: CKBTC, table })).toBeFalsy();
		});
	});

	describe('resolveOisyTradeSide', () => {
		it('spending the base token is a sell', () => {
			expect(resolveOisyTradeSide({ sourceToken: ICP, pair: icpUsdc })).toBe('sell');
		});

		it('spending the quote token is a buy', () => {
			expect(resolveOisyTradeSide({ sourceToken: CKUSDC, pair: icpUsdc })).toBe('buy');
		});

		it('is undefined for a token that is not a leg', () => {
			expect(resolveOisyTradeSide({ sourceToken: CKBTC, pair: icpUsdc })).toBeUndefined();
		});
	});

	describe('resolveOisyTradeOrder', () => {
		it('deposits exactly the ordered quantity on a sell', () => {
			// 2 ICP at 10 ckUSDC — already a lot multiple, so nothing is floored away.
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_000_000n,
				price: 10,
				freeBalance: 5,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.side).toBe('sell');
			expect(result.order.quantity).toBe(200_000_000n);
			expect(result.order.depositAmount).toBe(200_000_000n);
			// 10 ckUSDC (6 dp) per whole base.
			expect(result.order.price).toBe(10_000_000n);
		});

		it('deposits the order reserve on a buy, computed exactly in bigint', () => {
			// 50 ckUSDC at 10 ckUSDC/ICP buys 5 ICP; the reserve is
			// price × quantity / 10^baseDecimals = 10_000_000 × 500_000_000 / 10^8.
			const result = resolveOisyTradeOrder({
				sourceToken: CKUSDC,
				amount: 50_000_000n,
				price: 10,
				freeBalance: 100,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.side).toBe('buy');
			expect(result.order.quantity).toBe(500_000_000n);
			expect(result.order.depositAmount).toBe(50_000_000n);
		});

		it('refuses a sell amount off the lot grid rather than rounding it, like the Limit Order form', () => {
			// 2.005 ICP against a 0.01 ICP lot is not a lot multiple. The form never
			// lets such an amount through (it validates, and floors only in the Max
			// link), so the swap contributes no offer instead of silently selling less
			// than the user typed.
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_500_000n,
				price: 10,
				freeBalance: 5,
				pair: icpUsdc
			});

			assert(!result.ok);

			expect(result.errorKind).toBe('lot');
		});

		it('floors the derived buy quantity to the lot grid, shrinking the deposit to the reserve', () => {
			// 50.05 ckUSDC at 10 ckUSDC/ICP affords 5.005 ICP, which floors to 5.00 on
			// the 0.01 lot — a quantity the user cannot control by typing. The deposit
			// is the reserve at the limit price, so the unorderable 0.05 ckUSDC never
			// leaves the wallet.
			const result = resolveOisyTradeOrder({
				sourceToken: CKUSDC,
				amount: 50_050_000n,
				price: 10,
				freeBalance: 100,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.quantity).toBe(500_000_000n);
			expect(result.order.depositAmount).toBe(50_000_000n);
		});

		it('snaps the price down to the tick grid', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_000_000n,
				price: 10.00099,
				freeBalance: 5,
				pair: icpUsdc
			});

			assert(result.ok);

			// tick is 0.001 ckUSDC, so 10.00099 → 10.000.
			expect(result.order.price).toBe(10_000_000n);
		});

		it('refuses an amount below one lot', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 100_000n,
				price: 10,
				freeBalance: 5,
				pair: icpUsdc
			});

			expect(result.ok).toBeFalsy();
		});

		it('refuses a notional below the pair floor, naming the reason', () => {
			// 0.01 ICP at 10 ckUSDC is a 0.1 ckUSDC notional, under the 5 ckUSDC floor.
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 1_000_000n,
				price: 10,
				freeBalance: 5,
				pair: icpUsdc
			});

			assert(!result.ok);

			expect(result.errorKind).toBe('min_notional');
		});

		it('refuses an order the wallet balance cannot cover', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_000_000n,
				price: 10,
				freeBalance: 1,
				pair: icpUsdc
			});

			assert(!result.ok);

			expect(result.errorKind).toBe('balance');
		});

		it('refuses a token that is not a leg of the pair', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: CKBTC,
				amount: 200_000_000n,
				price: 10,
				freeBalance: 5,
				pair: icpUsdc
			});

			expect(result.ok).toBeFalsy();
		});

		it('refuses a price that floors to zero on the tick grid', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_000_000n,
				price: 0.0001,
				freeBalance: 5,
				pair: icpUsdc
			});

			expect(result.ok).toBeFalsy();
		});

		// An 18-decimal base token is where the human-float round-trip the shipped
		// Limit Order form uses stops being safe: one lot is 1e15 base units, far
		// below the 1e-6 *relative* slack `isMultipleOfStep` allows, so a float
		// verdict can pass a quantity the canister then rejects with
		// `InvalidQuantity` — after `deposit` has already moved the funds.
		describe('18-decimal precision', () => {
			// The same 18-decimal ckETH token the unpaired-token cases use, here given a
			// pair of its own. 18 dp base, 6 dp quote; lot 0.001 ckETH, tick 0.001 ckUSDC.
			const cketh = UNPAIRED;
			const ckethUsdc = buildPair({
				base: cketh,
				quote: CKUSDC,
				lotSize: 1_000_000_000_000_000n
			});

			const resolve = ({ sourceToken = cketh, amount }: { sourceToken?: Token; amount: bigint }) =>
				resolveOisyTradeOrder({
					sourceToken,
					amount,
					// Well above the 5 ckUSDC floor at these sizes, and on the tick grid.
					price: 1000,
					pair: ckethUsdc
				});

			// The exact case that regressed: 0.009 ckETH is a clean multiple of the
			// 0.001 lot, but 9e15/1e18 has no exact binary form, so multiplying back
			// out produced 8999999999999999 — one base unit off the grid, while the
			// float lot check still passed. Note 9e15 is *below* `2^53`, so this is the
			// divide-then-multiply round-trip rather than an unsafe-integer problem.
			it('keeps an on-grid 0.009 ckETH sell exactly on the lot grid', () => {
				const result = resolve({ amount: 9_000_000_000_000_000n });

				assert(result.ok);

				expect(result.order.quantity).toBe(9_000_000_000_000_000n);
				expect(result.order.quantity % ckethUsdc.lot_size).toBe(ZERO);
				// A Sell deposits the ordered quantity exactly — acceptance criterion 10.
				expect(result.order.depositAmount).toBe(9_000_000_000_000_000n);
			});

			// From 5 lots up, since at this price one lot is 1 ckUSDC and the pair's
			// floor is 5 — below that the rejection is the notional, not the grid.
			it('round-trips every on-grid quantity without drift', () => {
				const drifted = Array.from({ length: 200 }, (_, index) => BigInt(index + 5))
					.map((lots) => ({ lots, amount: lots * ckethUsdc.lot_size }))
					.filter(({ amount }) => {
						const result = resolve({ amount });

						return !result.ok || result.order.quantity !== amount;
					});

				expect(drifted).toEqual([]);
			});

			// Off the grid by 1e9 base units — a 1e-9 *relative* deviation, which the
			// float check's 1e-6 tolerance waves through. Only an exact check rejects
			// it, and rejecting it here is what keeps the deposit from happening.
			it('refuses an amount off the grid by less than the float tolerance', () => {
				const result = resolve({ amount: 9_000_000_000_000_000n + 1_000_000_000n });

				assert(!result.ok);

				expect(result.errorKind).toBe('lot');
			});

			// Above 1e21 base units `Number.toFixed(0)` switches to exponential
			// notation, which `BigInt` refuses — the old conversion threw a
			// `SyntaxError` out of a function documented as never throwing.
			it('resolves an amount past the exponential-notation threshold', () => {
				const amount = 1_000_007_000_000_000_000_000n;

				expect(() => resolve({ amount })).not.toThrow();

				const result = resolve({ amount });

				assert(result.ok);

				expect(result.order.quantity).toBe(amount);
			});

			// The derived side: the quantity comes out of a bigint division, so the
			// deposit is the exact reserve with no residue left in the wallet.
			it('derives a buy quantity into 18 decimals exactly', () => {
				const result = resolve({ sourceToken: CKUSDC, amount: 9_000_000n });

				assert(result.ok);

				expect(result.order.side).toBe('buy');
				expect(result.order.quantity).toBe(9_000_000_000_000_000n);
				expect(result.order.quantity % ckethUsdc.lot_size).toBe(ZERO);
				expect(result.order.depositAmount).toBe(9_000_000n);
			});
		});
	});

	describe('computeOisyTradeReceiveAmount', () => {
		it('rescales down across a decimals mismatch', () => {
			// 1 ICP (8 dp) at 1:1 is 1 ckUSDC (6 dp) — a plain bigint copy is 100× wrong.
			expect(
				computeOisyTradeReceiveAmount({
					amount: 100_000_000n,
					sourceDecimals: 8,
					destinationDecimals: 6
				})
			).toBe(1_000_000n);
		});

		it('rescales up in the other direction', () => {
			expect(
				computeOisyTradeReceiveAmount({
					amount: 1_000_000n,
					sourceDecimals: 6,
					destinationDecimals: 8
				})
			).toBe(100_000_000n);
		});

		it('passes the amount through when the decimals match', () => {
			expect(
				computeOisyTradeReceiveAmount({
					amount: 12_345n,
					sourceDecimals: 8,
					destinationDecimals: 8
				})
			).toBe(12_345n);
		});

		it('floors rather than rounding, so it never over-quotes', () => {
			// 0.000000019 ICP has no representation at 6 dp; the fraction is dropped.
			expect(
				computeOisyTradeReceiveAmount({
					amount: 19n,
					sourceDecimals: 8,
					destinationDecimals: 6
				})
			).toBe(ZERO);
		});
	});
});
