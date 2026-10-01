import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import {
	findOisyTradePair,
	isOisyTradePair,
	oisyTradeAmountObjection,
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
		// 10 ckUSDC/ICP on both sides. The bids hold 5 ICP, which every Sell below stays
		// inside except the one testing a book too thin; the asks hold 50 ICP, since a
		// Buy is covered by the levels' *value* and 5 ICP is only 50 ckUSDC of it. These
		// cases are about the adaptation rather than the walk, which has its own suite
		// over the shared fixtures in `oisy-trade/offer.spec.ts`.
		const depth = {
			bids: [{ price: 10_000_000n, quantity: 500_000_000n }],
			asks: [{ price: 10_000_000n, quantity: 5_000_000_000n }]
		};

		it('deposits exactly the ordered quantity on a sell', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_000_000n,
				depth,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.side).toBe('sell');
			expect(result.order.quantity).toBe(200_000_000n);
			expect(result.order.depositAmount).toBe(200_000_000n);
			// 10 ckUSDC (6 dp) per whole base, straight off the book.
			expect(result.order.price).toBe(10_000_000n);
			// 2 ICP at 10 → 20 ckUSDC, before the taker and ledger fees the caller nets.
			expect(result.gross).toBe(20_000_000n);
		});

		it('deposits the order reserve on a buy, computed exactly in bigint', () => {
			// 50 ckUSDC at 10 ckUSDC/ICP buys 5 ICP; the reserve is
			// price × quantity / 10^baseDecimals = 10_000_000 × 500_000_000 / 10^8.
			const result = resolveOisyTradeOrder({
				sourceToken: CKUSDC,
				amount: 50_000_000n,
				depth,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.side).toBe('buy');
			expect(result.order.quantity).toBe(500_000_000n);
			expect(result.order.depositAmount).toBe(50_000_000n);
			// A buy is paid in the base token, so the gross *is* the quantity.
			expect(result.gross).toBe(500_000_000n);
		});

		// Reverses what this file previously locked: a Sell is floored onto the lot grid
		// instead of refused. At a realistic lot almost every amount a person types is
		// off-grid, so validating meant OISY Trade contributed no Sell offer at all,
		// while the Buy side had been spending less than typed since the provider
		// shipped. The residue never leaves the wallet.
		it('floors a sell amount onto the lot grid rather than refusing it', () => {
			// 2.005 ICP against a 0.01 ICP lot floors to 2.00.
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 200_500_000n,
				depth,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.quantity).toBe(200_000_000n);
			expect(result.order.depositAmount).toBe(200_000_000n);
		});

		it('floors the derived buy quantity to the lot grid, shrinking the deposit to the reserve', () => {
			// 50.05 ckUSDC at 10 ckUSDC/ICP affords 5.005 ICP, which floors to 5.00 on
			// the 0.01 lot — a quantity the user cannot control by typing. The deposit
			// is the reserve at the limit price, so the unorderable 0.05 ckUSDC never
			// leaves the wallet.
			const result = resolveOisyTradeOrder({
				sourceToken: CKUSDC,
				amount: 50_050_000n,
				depth,
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.quantity).toBe(500_000_000n);
			expect(result.order.depositAmount).toBe(50_000_000n);
		});

		it('prices at the level that absorbs the whole order, not at the top of book', () => {
			// 3 ICP against 2 ICP at 10 and 2 ICP at 9: only the second level completes
			// the order, so 9 is the highest price the whole quantity can still fill at.
			const result = resolveOisyTradeOrder({
				sourceToken: ICP,
				amount: 300_000_000n,
				depth: {
					bids: [
						{ price: 10_000_000n, quantity: 200_000_000n },
						{ price: 9_000_000n, quantity: 200_000_000n }
					],
					asks: []
				},
				pair: icpUsdc
			});

			assert(result.ok);

			expect(result.order.price).toBe(9_000_000n);
			expect(result.gross).toBe(27_000_000n);
		});

		// Every rejection is bare: the fan-out transports offers only, so a reason would
		// have no reader. Which reason applies is the module's own concern and is
		// asserted over the shared fixtures in `oisy-trade/offer.spec.ts`.
		it('refuses an amount below one lot', () => {
			expect(
				resolveOisyTradeOrder({
					sourceToken: ICP,
					amount: 100_000n,
					depth,
					pair: icpUsdc
				})
			).toEqual({ ok: false });
		});

		it('refuses a notional below the pair floor', () => {
			// 0.01 ICP at 10 ckUSDC is a 0.1 ckUSDC notional, under the 5 ckUSDC floor.
			expect(
				resolveOisyTradeOrder({
					sourceToken: ICP,
					amount: 1_000_000n,
					depth,
					pair: icpUsdc
				})
			).toEqual({ ok: false });
		});

		it('refuses an order the book cannot absorb', () => {
			expect(
				resolveOisyTradeOrder({
					sourceToken: ICP,
					amount: 600_000_000n,
					depth,
					pair: icpUsdc
				})
			).toEqual({ ok: false });
		});

		it('refuses an order when the opposite side is empty', () => {
			expect(
				resolveOisyTradeOrder({
					sourceToken: ICP,
					amount: 200_000_000n,
					depth: { bids: [], asks: depth.asks },
					pair: icpUsdc
				})
			).toEqual({ ok: false });
		});

		it('refuses a token that is not a leg of the pair', () => {
			const result = resolveOisyTradeOrder({
				sourceToken: CKBTC,
				amount: 200_000_000n,
				depth,
				pair: icpUsdc
			});

			expect(result.ok).toBeFalsy();
		});

		// An 18-decimal base token is where a human-float round-trip stops being safe:
		// one lot is 1e15 base units, far below the 1e-6 *relative* slack the float
		// helpers allow, so a float verdict could pass a quantity the canister then
		// rejects with `InvalidQuantity` — after `deposit` has already moved the funds.
		// The path is now bigint end to end, and these cases keep it that way.
		describe('18-decimal precision', () => {
			// The same 18-decimal ckETH token the unpaired-token cases use, here given a
			// pair of its own. 18 dp base, 6 dp quote; lot 0.001 ckETH.
			const cketh = UNPAIRED;
			const ckethUsdc = buildPair({
				base: cketh,
				quote: CKUSDC,
				lotSize: 1_000_000_000_000_000n
			});

			// 1000 ckUSDC per whole ckETH, deep enough for every order below. Well above
			// the 5 ckUSDC floor at these sizes.
			const level = { price: 1_000_000_000n, quantity: 10_000_000_000_000_000_000_000n };

			const resolve = ({ sourceToken = cketh, amount }: { sourceToken?: Token; amount: bigint }) =>
				resolveOisyTradeOrder({
					sourceToken,
					amount,
					depth: { bids: [level], asks: [level] },
					pair: ckethUsdc
				});

			// 0.009 ckETH is a clean multiple of the 0.001 lot, but 9e15/1e18 has no
			// exact binary form: a divide-then-multiply round-trip produced
			// 8999999999999999, one base unit off the grid, while a float lot check
			// still passed. Note 9e15 is *below* `2^53`, so this is the round-trip
			// rather than an unsafe-integer problem.
			it('keeps an on-grid 0.009 ckETH sell exactly on the lot grid', () => {
				const result = resolve({ amount: 9_000_000_000_000_000n });

				assert(result.ok);

				expect(result.order.quantity).toBe(9_000_000_000_000_000n);
				expect(result.order.quantity % ckethUsdc.lot_size).toBe(ZERO);
				expect(result.order.depositAmount).toBe(9_000_000_000_000_000n);
				// 0.009 ckETH at 1000 → 9 ckUSDC, exactly.
				expect(result.gross).toBe(9_000_000n);
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

			// Off the grid by 1e9 base units — a 1e-9 *relative* deviation, which a
			// float check's 1e-6 tolerance waves through. Flooring has to land on the
			// exact multiple, not near it: the canister rejects anything else after the
			// deposit has moved.
			it('floors an off-grid amount onto the exact lot multiple', () => {
				const result = resolve({ amount: 9_000_000_000_000_000n + 1_000_000_000n });

				assert(result.ok);

				expect(result.order.quantity).toBe(9_000_000_000_000_000n);
				expect(result.order.quantity % ckethUsdc.lot_size).toBe(ZERO);
			});

			// Above 1e21 base units `Number.toFixed(0)` switches to exponential
			// notation, which `BigInt` refuses — an earlier conversion threw a
			// `SyntaxError` out of a function documented as never throwing. Nothing on
			// this path converts any more, and this is what would notice a relapse.
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

	// The form's empty-offer-list explanation. Book-free by construction: it runs in a
	// `$derived.by`, which cannot await the depth query the quote now makes.
	describe('oisyTradeAmountObjection', () => {
		it('names the lot when a sell is below one lot', () => {
			expect(oisyTradeAmountObjection({ sourceToken: ICP, amount: 100_000n, pair: icpUsdc })).toBe(
				'lot'
			);
		});

		it('names the floor when a buy spends less than min_notional', () => {
			// The reserve never exceeds the spend, so this cannot clear the floor
			// whatever price the walk finds.
			expect(
				oisyTradeAmountObjection({ sourceToken: CKUSDC, amount: 4_000_000n, pair: icpUsdc })
			).toBe('min_notional');
		});

		it('says nothing about an orderable sell, whose absence would be the book', () => {
			expect(
				oisyTradeAmountObjection({ sourceToken: ICP, amount: 200_000_000n, pair: icpUsdc })
			).toBeUndefined();
		});

		it('says nothing about an orderable buy', () => {
			expect(
				oisyTradeAmountObjection({ sourceToken: CKUSDC, amount: 50_000_000n, pair: icpUsdc })
			).toBeUndefined();
		});

		it('says nothing for a token that is not a leg of the pair', () => {
			expect(
				oisyTradeAmountObjection({ sourceToken: CKBTC, amount: 100_000n, pair: icpUsdc })
			).toBeUndefined();
		});
	});
});
