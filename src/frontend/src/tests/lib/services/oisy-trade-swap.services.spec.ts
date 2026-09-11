import type {
	OrderStatus,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { OisyTradeRequestError, OisyTradeTemporaryError } from '$lib/canisters/oisy-trade.errors';
import * as appConstants from '$lib/constants/app.constants';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import * as oisyTradeSwapServices from '$lib/services/oisy-trade-swap.services';
import {
	fetchOisyTradeQuote,
	fetchOisyTradeSwap,
	loadOisyTradeSwapPairs,
	mapOisyTradeQuoteResult,
	oisyTradeSwapPairTable,
	settleOisyTradeSwap
} from '$lib/services/oisy-trade-swap.services';
import { fetchSwapAmounts } from '$lib/services/swap.services';
import * as tradingAnalytics from '$lib/services/trading-analytics.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeResolvedOrder } from '$lib/types/oisy-trade-swap';
import { SwapProvider } from '$lib/types/swap';
import * as consoleUtils from '$lib/utils/console.utils';
import * as walletUtils from '$lib/utils/wallet.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

// The registry reads the flag at module scope, so it has to be true before
// `swap.providers` is first imported — hence `vi.hoisted` rather than a plain let.
const mockEnv = vi.hoisted(() => ({ enabled: true }));

vi.mock('$env/oisy-trade-swap', () => ({
	get OISY_TRADE_SWAP_ENABLED() {
		return mockEnv.enabled;
	},
	get oisyTradeSwapEnabled() {
		return mockEnv.enabled;
	}
}));

// The two sibling providers in the same registry. Neither should contribute to
// the fan-out assertions below, which are about OISY Trade alone.
vi.mock('$lib/api/kong_backend.api', () => ({
	kongSwapAmounts: () => Promise.reject(new Error('kong unavailable in test'))
}));

vi.mock('$lib/services/icp-swap.services', () => ({
	icpSwapAmounts: () => Promise.reject(new Error('icpSwap unavailable in test')),
	icpSwapSupportedTokens: () => Promise.resolve(new Set<string>())
}));

const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';
const CKBTC_LEDGER = 'mxzaz-hqaaa-aaaar-qaada-cai';

const icToken = ({
	ledgerCanisterId,
	decimals,
	symbol,
	fee
}: {
	ledgerCanisterId: string;
	decimals: number;
	symbol: string;
	fee: bigint;
}): IcToken => ({ ...mockValidIcToken, ledgerCanisterId, decimals, symbol, fee });

// 8 dp, 10_000 e8s ledger fee.
const ICP = icToken({
	ledgerCanisterId: ICP_LEDGER,
	decimals: 8,
	symbol: 'ICP',
	fee: 10_000n
});
// 6 dp, 10_000 (0.01 ckUSDC) ledger fee.
const CKUSDC = icToken({
	ledgerCanisterId: CKUSDC_LEDGER,
	decimals: 6,
	symbol: 'ckUSDC',
	fee: 10_000n
});
const CKBTC = icToken({
	ledgerCanisterId: CKBTC_LEDGER,
	decimals: 8,
	symbol: 'ckBTC',
	fee: 10n
});

const buildPair = ({
	base,
	quote,
	halted = false,
	lotSize = 1_000_000n,
	minNotional = 1_000n,
	takerFeeBps = 10
}: {
	base: IcToken;
	quote: IcToken;
	halted?: boolean;
	lotSize?: bigint;
	minNotional?: bigint;
	takerFeeBps?: number;
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
		tick_size: 1_000n,
		min_notional: minNotional,
		max_notional: [],
		maker_fee_bps: 5,
		taker_fee_bps: takerFeeBps
	}) as unknown as TradingPairInfo;

const icpUsdc = buildPair({ base: ICP, quote: CKUSDC });

describe('oisy-trade-swap.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		oisyTradeStore.reset();
	});

	describe('loadOisyTradeSwapPairs', () => {
		it('caches the table and reports both legs as quotable sources', async () => {
			vi.spyOn(oisyTradeApi, 'getTradingPairs').mockResolvedValue([icpUsdc]);

			const supported = await loadOisyTradeSwapPairs({ identity: mockIdentity });

			expect(supported).toEqual(new Set([ICP_LEDGER, CKUSDC_LEDGER]));
			expect(oisyTradeSwapPairTable()).toEqual([icpUsdc]);
		});

		it('excludes halted pairs from the supported set', async () => {
			vi.spyOn(oisyTradeApi, 'getTradingPairs').mockResolvedValue([
				buildPair({ base: ICP, quote: CKUSDC, halted: true })
			]);

			const supported = await loadOisyTradeSwapPairs({ identity: mockIdentity });

			expect(supported).toEqual(new Set());
		});

		it('writes pairs without clobbering what the Trading tab loaded', async () => {
			// `set` replaces all four fields; the swap loader must not wipe the
			// balances and orders the Trading tab put there.
			const balances = [{ marker: 'balances' }] as unknown as never;
			const orders = [{ marker: 'orders' }] as unknown as never;
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances,
				orders
			});

			vi.spyOn(oisyTradeApi, 'getTradingPairs').mockResolvedValue([icpUsdc]);

			await loadOisyTradeSwapPairs({ identity: mockIdentity });

			expect(get(oisyTradeStore).balances).toBe(balances);
			expect(get(oisyTradeStore).orders).toBe(orders);
			expect(get(oisyTradeStore).pairs).toEqual([icpUsdc]);
		});
	});

	describe('fetchOisyTradeQuote', () => {
		beforeEach(() => {
			oisyTradeStore.setPairs([icpUsdc]);
		});

		it('quotes a sell, netting both destination-denominated fees off the fill', () => {
			// 2 ICP at the 1:1 placeholder → 2 ckUSDC gross (2_000_000 at 6 dp).
			// Taker 10 bps = 2_000; withdrawal ledger fee = 10_000.
			const result = fetchOisyTradeQuote({
				sourceToken: ICP,
				destinationToken: CKUSDC,
				sourceAmount: 200_000_000n
			});

			assert(result.ok);

			expect(result.quote.receiveAmount).toBe(2_000_000n - 2_000n - 10_000n);
			expect(result.quote.swapDetails.order.side).toBe('sell');
			expect(result.quote.swapDetails.order.depositAmount).toBe(200_000_000n);
		});

		it('quotes a buy in the other direction', () => {
			// 2 ckUSDC at 1:1 → 2 ICP gross (200_000_000 at 8 dp).
			// Taker 10 bps = 200_000; withdrawal ledger fee = 10_000.
			const result = fetchOisyTradeQuote({
				sourceToken: CKUSDC,
				destinationToken: ICP,
				sourceAmount: 2_000_000n
			});

			assert(result.ok);

			expect(result.quote.receiveAmount).toBe(200_000_000n - 200_000n - 10_000n);
			expect(result.quote.swapDetails.order.side).toBe('buy');
		});

		it('itemizes the three fees in their own tokens and never sums them', () => {
			const result = fetchOisyTradeQuote({
				sourceToken: ICP,
				destinationToken: CKUSDC,
				sourceAmount: 200_000_000n
			});

			assert(result.ok);

			expect(result.quote.swapDetails.fees).toEqual([
				// Two source ledger fees — approve and transfer_from — paid on top.
				{ labelPath: 'swap.text.oisy_trade_deposit_fee', fee: 20_000n, token: ICP },
				{ labelPath: 'swap.text.oisy_trade_taker_fee', fee: 2_000n, token: CKUSDC },
				{ labelPath: 'swap.text.oisy_trade_withdrawal_fee', fee: 10_000n, token: CKUSDC }
			]);
		});

		it('carries the taker rate and the pair floor for the sheet', () => {
			const result = fetchOisyTradeQuote({
				sourceToken: ICP,
				destinationToken: CKUSDC,
				sourceAmount: 200_000_000n
			});

			assert(result.ok);

			expect(result.quote.swapDetails.takerFeeBps).toBe(10);
			expect(result.quote.swapDetails.minNotional).toBe(1_000n);
			// The quote leg is the destination on a sell.
			expect(result.quote.swapDetails.quoteToken).toBe(CKUSDC);
		});

		it('rejects a halted pair without a reason to name', () => {
			oisyTradeStore.setPairs([buildPair({ base: ICP, quote: CKUSDC, halted: true })]);

			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: CKUSDC,
					sourceAmount: 200_000_000n
				})
			).toEqual({ ok: false });
		});

		it('rejects tokens that share no pair', () => {
			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: CKBTC,
					sourceAmount: 200_000_000n
				})
			).toEqual({ ok: false });
		});

		it('rejects every quote while the pair table has not loaded', () => {
			oisyTradeStore.reset();

			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: CKUSDC,
					sourceAmount: 200_000_000n
				})
			).toEqual({ ok: false });
		});

		it('rejects an amount off the lot grid, naming the reason for the form', () => {
			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: CKUSDC,
					sourceAmount: 100_000n
				})
			).toEqual({ ok: false, errorKind: 'lot' });
		});

		it('rejects a quote whose fees would swallow the whole fill', () => {
			// 0.01 ICP → 10_000 gross ckUSDC, exactly the withdrawal ledger fee.
			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: CKUSDC,
					sourceAmount: 1_000_000n
				})
			).toEqual({ ok: false });
		});

		it('rejects a quote when a ledger fee is unknown', () => {
			const feeless = { ...CKUSDC, fee: undefined } as unknown as IcToken;

			expect(
				fetchOisyTradeQuote({
					sourceToken: ICP,
					destinationToken: feeless,
					sourceAmount: 200_000_000n
				})
			).toEqual({ ok: false });
		});
	});

	// `fetchSwapAmountsICP` maps provider results by key in an inline if/else
	// chain. A registered provider whose key is missing from that chain quotes
	// successfully and is then discarded with `mapped` left `undefined` — no
	// error, no offer, nothing in the logs. This is the single most likely way
	// for the integration to look broken for no reason, so the branch is pinned.
	describe('fetchSwapAmountsICP mapping branch', () => {
		const fanOutParams = {
			identity: mockIdentity,
			tokens: [],
			slippage: 0.5,
			userEthAddress: undefined,
			userSolAddress: undefined,
			userBtcAddress: undefined
		};

		beforeEach(() => {
			oisyTradeStore.setPairs([icpUsdc]);
		});

		it('carries an OISY Trade quote through the fan-out into the results', async () => {
			const results = await fetchSwapAmounts({
				...fanOutParams,
				sourceToken: ICP,
				destinationToken: CKUSDC,
				amount: 2,
				isSourceTokenIcrc2: true
			});

			const offer = results.find(({ provider }) => provider === SwapProvider.OISY_TRADE);

			expect(offer).toBeDefined();
			expect(offer?.receiveAmount).toBe(2_000_000n - 2_000n - 10_000n);
		});

		it('drops the offer when the source ledger has no ICRC-2', async () => {
			// The deposit leg is `icrc2_approve` + `icrc2_transfer_from`, so a source
			// without ICRC-2 cannot be deposited at all.
			const results = await fetchSwapAmounts({
				...fanOutParams,
				sourceToken: ICP,
				destinationToken: CKUSDC,
				amount: 2,
				isSourceTokenIcrc2: false
			});

			expect(results.find(({ provider }) => provider === SwapProvider.OISY_TRADE)).toBeUndefined();
		});

		it('contributes nothing when the pair table is empty', async () => {
			oisyTradeStore.reset();

			const results = await fetchSwapAmounts({
				...fanOutParams,
				sourceToken: ICP,
				destinationToken: CKUSDC,
				amount: 2,
				isSourceTokenIcrc2: true
			});

			expect(results.find(({ provider }) => provider === SwapProvider.OISY_TRADE)).toBeUndefined();
		});

		// Every `getQuote` is called inside a `.map()` whose array only afterwards
		// reaches `Promise.allSettled`, so a *synchronous* throw escapes the settling
		// and rejects the entire fan-out — losing ICPSwap's and KongSwap's offers
		// along with OISY Trade's. The two siblings are async functions and get that
		// containment for free; this entry is a sync quote and has to ask for it.
		// `fetchOisyTradeQuote` is written not to throw, so this pins the containment
		// rather than a reachable path — and the order-book walk that replaces the
		// placeholder lands in exactly this function.
		it('contains a synchronous quote failure rather than rejecting the fan-out', async () => {
			vi.spyOn(oisyTradeSwapServices, 'fetchOisyTradeQuote').mockImplementation(() => {
				throw new Error('synchronous quote failure');
			});

			await expect(
				fetchSwapAmounts({
					...fanOutParams,
					sourceToken: ICP,
					destinationToken: CKUSDC,
					amount: 2,
					isSourceTokenIcrc2: true
				})
			).resolves.toEqual([]);
		});
	});

	describe('mapOisyTradeQuoteResult', () => {
		it('tags the mapped offer with the OISY Trade provider', () => {
			oisyTradeStore.setPairs([icpUsdc]);

			const result = fetchOisyTradeQuote({
				sourceToken: ICP,
				destinationToken: CKUSDC,
				sourceAmount: 200_000_000n
			});

			assert(result.ok);

			const mapped = mapOisyTradeQuoteResult({ quote: result.quote });

			expect(mapped.provider).toBe(SwapProvider.OISY_TRADE);
			expect(mapped.receiveAmount).toBe(result.quote.receiveAmount);
			// No `receiveOutMinimum`: fill-or-kill has no slippage semantics.
			expect(mapped).not.toHaveProperty('receiveOutMinimum');
		});
	});

	describe('settleOisyTradeSwap', () => {
		const ORDER_ID = 'order-1';

		// A zero baseline means nothing was on the DEX before the deposit, so everything
		// free is this order's and the assertions below read as plain balances. The
		// pre-existing-balance cases pass their own.
		const settleParams = {
			identity: mockIdentity,
			orderId: ORDER_ID,
			sourceToken: ICP,
			destinationToken: CKUSDC,
			baseline: { source: ZERO, destination: ZERO }
		};

		const userOrder = (status: OrderStatus) =>
			[{ id: ORDER_ID, order: { status }, pair: {} }] as unknown as UserOrder[];

		const balance = ({ token, free }: { token: IcToken; free: bigint }) =>
			({
				token: { id: { ledger_id: Principal.fromText(token.ledgerCanisterId) } },
				balance: { free, reserved: ZERO }
			}) as unknown as UserTokenBalance;

		const mockBalances = ({ source, destination }: { source: bigint; destination: bigint }) =>
			vi
				.spyOn(oisyTradeApi, 'getBalances')
				.mockResolvedValue([
					balance({ token: ICP, free: source }),
					balance({ token: CKUSDC, free: destination })
				]);

		const mockWithdraw = () =>
			vi.spyOn(oisyTradeApi, 'withdraw').mockResolvedValue({ block_index: 42n });

		const ledgerOf = (call: { request: { token_id: { ledger_id: Principal } } }) =>
			call.request.token_id.ledger_id.toText();

		// A live order's reserve is locked — "funds reserved by open orders are not
		// withdrawable until the order fills or is canceled" — so asking would only fail.
		it.each([['Pending'], ['Open']])(
			'withdraws nothing while the order is %s',
			async (state: string) => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(
					userOrder({ [state]: null } as unknown as OrderStatus)
				);
				const balances = mockBalances({ source: ZERO, destination: ZERO });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap(settleParams);

				expect(settlement).toEqual({ status: 'pending', withdrawals: [] });
				expect(withdrawSpy).not.toHaveBeenCalled();
				// Not even read: a pending order settles nothing, so the balances are moot.
				expect(balances).not.toHaveBeenCalled();
			}
		);

		it('withdraws the destination token on a filled order', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			mockBalances({ source: ZERO, destination: 2_000_000n });
			const withdrawSpy = mockWithdraw();

			const settlement = await settleOisyTradeSwap(settleParams);

			expect(settlement.status).toBe('filled');
			expect(settlement.withdrawals).toEqual([42n]);
			expect(withdrawSpy).toHaveBeenCalledOnce();
			expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(CKUSDC_LEDGER);
		});

		// A killed order is a *failed swap whose funds came back* — the source token, not
		// the destination, and the whole reason the error is raised only after this ran.
		it.each([['Expired'], ['Canceled']])(
			'withdraws the source token back on a %s order',
			async (state: string) => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(
					userOrder({ [state]: null } as unknown as OrderStatus)
				);
				mockBalances({ source: 200_000_000n, destination: ZERO });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap(settleParams);

				expect(settlement.status).toBe('killed');
				expect(withdrawSpy).toHaveBeenCalledOnce();
				expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(ICP_LEDGER);
			}
		);

		// A Buy that crosses below its limit price has the unspent reserve released back to
		// free balance, so a *successful* swap still has source to sweep.
		it('sweeps a source residue alongside the destination on a fill', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			mockBalances({ source: 200_000_000n, destination: 2_000_000n });
			const withdrawSpy = mockWithdraw();

			const settlement = await settleOisyTradeSwap(settleParams);

			expect(settlement.withdrawals).toHaveLength(2);
			expect(withdrawSpy).toHaveBeenCalledTimes(2);
			// Destination first: it is what the user is waiting for.
			expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(CKUSDC_LEDGER);
			expect(ledgerOf(withdrawSpy.mock.calls[1][0])).toBe(ICP_LEDGER);
		});

		// `withdraw` refuses an amount at or below the ledger fee (`AmountTooSmall`), so a
		// residue that small can never be moved. Retrying it would strand the settlement.
		it('skips a dust residue instead of failing the settlement', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			// ICP's ledger fee is 10_000; a residue at the fee is unwithdrawable.
			mockBalances({ source: 10_000n, destination: 2_000_000n });
			const withdrawSpy = mockWithdraw();

			const settlement = await settleOisyTradeSwap(settleParams);

			expect(settlement.status).toBe('filled');
			expect(withdrawSpy).toHaveBeenCalledOnce();
			expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(CKUSDC_LEDGER);
		});

		// The residue is the smaller amount by construction; letting a *definitive*
		// failure of it fail the settlement would strand an operation whose funds have
		// already arrived — and the reported outcome is true regardless.
		it('does not let a definitive residue withdrawal failure block the primary one', async () => {
			const consoleErrorSpy = vi
				.spyOn(consoleUtils, 'consoleError')
				.mockImplementation(() => undefined);

			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			mockBalances({ source: 200_000_000n, destination: 2_000_000n });
			const residueError = new Error('residue withdrawal failed');
			vi.spyOn(oisyTradeApi, 'withdraw')
				.mockResolvedValueOnce({ block_index: 42n })
				.mockRejectedValueOnce(residueError);

			const settlement = await settleOisyTradeSwap(settleParams);

			expect(settlement.status).toBe('filled');
			expect(settlement.withdrawals).toEqual([42n]);
			// Swallowed, but not silently: the residue is still owed to the user.
			expect(consoleErrorSpy).toHaveBeenCalledWith(residueError);
		});

		// A transient residue failure propagates instead: the caller's retry loop
		// re-enters the settlement, where the withdrawn primary's delta reads zero and
		// only the residue is left to take. Swallowing it would report success with
		// funds silently left in DEX custody.
		it('propagates a retryable residue withdrawal failure to the caller', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			mockBalances({ source: 200_000_000n, destination: 2_000_000n });
			vi.spyOn(oisyTradeApi, 'withdraw')
				.mockResolvedValueOnce({ block_index: 42n })
				.mockRejectedValueOnce(
					new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
				);

			await expect(settleOisyTradeSwap(settleParams)).rejects.toThrow('busy');
		});

		// A user can arrive at a swap with either leg already funded from the Trading tab —
		// they may have deposited there to place limit orders. Those balances are their own
		// funds, but not this swap's to move or to draw conclusions from.
		describe('a pre-existing DEX balance', () => {
			it('withdraws only what this order added, leaving the rest on the DEX', async () => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
				// 100 ckUSDT parked from the Trading tab, plus 2 credited by this fill.
				mockBalances({ source: 50_000_000n, destination: 102_000_000n });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap({
					...settleParams,
					baseline: { source: 50_000_000n, destination: 100_000_000n }
				});

				expect(settlement.status).toBe('filled');
				// The fill only, not the 100 that was already there.
				expect(withdrawSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						request: expect.objectContaining({ amount: 2_000_000n })
					})
				);
				expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(CKUSDC_LEDGER);
			});

			// The dangerous half: with the order gone, the classification falls back to the
			// balances. Reading the account-wide total would call this killed order filled
			// purely because the user happened to hold the destination token already.
			it('does not let a held destination balance report a killed order as filled', async () => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
				// The source came back (the kill), and the destination holding is untouched.
				mockBalances({ source: 200_000_000n, destination: 100_000_000n });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap({
					...settleParams,
					baseline: { source: ZERO, destination: 100_000_000n }
				});

				expect(settlement.status).toBe('killed');
				expect(withdrawSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						request: expect.objectContaining({ amount: 200_000_000n })
					})
				);
				expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(ICP_LEDGER);
			});

			// Nothing of ours on either leg, so there is nothing to settle and nothing that
			// says how it ended — even though both legs hold plenty.
			it('reports unresolved when a vanished order added nothing to either leg', async () => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
				mockBalances({ source: 50_000_000n, destination: 100_000_000n });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap({
					...settleParams,
					baseline: { source: 50_000_000n, destination: 100_000_000n }
				});

				expect(settlement).toEqual({ status: 'unresolved', withdrawals: [] });
				expect(withdrawSpy).not.toHaveBeenCalled();
			});

			// A baseline can only go stale in one direction — the user withdrawing from the
			// Trading tab mid-flow makes it too high — and the delta is floored at zero
			// rather than going negative. That leaves the fill on the DEX, where the Trading
			// tab still shows it; the alternative reading would withdraw someone else's
			// deposit, which is the outcome the baseline exists to prevent.
			it('withdraws nothing rather than over-claiming when the baseline is stale', async () => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
				mockBalances({ source: ZERO, destination: 2_000_000n });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap({
					...settleParams,
					baseline: { source: ZERO, destination: 100_000_000n }
				});

				expect(settlement).toEqual({ status: 'filled', withdrawals: [] });
				expect(withdrawSpy).not.toHaveBeenCalled();
			});
		});

		// An unknown ledger fee says nothing about whether the balance is withdrawable, so
		// it must not share the dust skip: skipping would report the swap settled with the
		// funds still in DEX custody. `IcTokenSchema` requires `fee`, so reaching this at
		// all means constructing a token without one.
		it('fails rather than skipping the withdrawal when the ledger fee is unknown', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue(userOrder({ Filled: null }));
			mockBalances({ source: ZERO, destination: 2_000_000n });
			const withdrawSpy = mockWithdraw();

			const feeless = { ...CKUSDC, fee: undefined } as unknown as IcToken;

			await expect(
				settleOisyTradeSwap({ ...settleParams, destinationToken: feeless })
			).rejects.toThrow(en.trading.deposit.error.unknown_fee);

			expect(withdrawSpy).not.toHaveBeenCalled();
		});

		// "Not found" has two documented spellings and the did never says whether terminal
		// orders are retained, so both resolve from the balances instead — which is what
		// keeps settlement correct either way.
		it.each([
			{
				label: 'an empty result',
				mockOrders: () => vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([])
			},
			{
				label: 'an OrderNotFound error',
				mockOrders: () =>
					vi
						.spyOn(oisyTradeApi, 'getMyOrders')
						.mockRejectedValue(
							new OisyTradeRequestError({ message: 'gone', reason: 'OrderNotFound' })
						)
			}
		])(
			'resolves a fill from the balances when the order reads as $label',
			async ({ mockOrders }) => {
				mockOrders();
				mockBalances({ source: ZERO, destination: 2_000_000n });
				const withdrawSpy = mockWithdraw();

				const settlement = await settleOisyTradeSwap(settleParams);

				expect(settlement.status).toBe('filled');
				expect(ledgerOf(withdrawSpy.mock.calls[0][0])).toBe(CKUSDC_LEDGER);
			}
		);

		it('resolves a kill from the balances when the order is gone', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
			mockBalances({ source: 200_000_000n, destination: ZERO });
			mockWithdraw();

			const { status } = await settleOisyTradeSwap(settleParams);

			expect(status).toBe('killed');
		});

		it('reports an unresolved settlement when nothing is left in custody', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
			mockBalances({ source: ZERO, destination: ZERO });
			const withdrawSpy = mockWithdraw();

			const settlement = await settleOisyTradeSwap(settleParams);

			expect(settlement).toEqual({ status: 'unresolved', withdrawals: [] });
			expect(withdrawSpy).not.toHaveBeenCalled();
		});

		// Any other canister error is the caller's to handle, not something to swallow into
		// a "nothing to settle" answer.
		it('propagates an order read failure that is not a missing order', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockRejectedValue(
				new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
			);

			await expect(settleOisyTradeSwap(settleParams)).rejects.toThrow('busy');
		});
	});

	describe('fetchOisyTradeSwap', () => {
		// Distinctive values, so the assertions below prove these were carried through from
		// the reviewed quote rather than re-derived from the amount and the pair.
		const sellOrder: OisyTradeResolvedOrder = {
			side: 'sell',
			pair: {
				base: Principal.fromText(ICP_LEDGER),
				quote: Principal.fromText(CKUSDC_LEDGER)
			},
			price: 1_234_000n,
			quantity: 300_000_000n,
			depositAmount: 300_000_000n
		};

		// A Buy spends the quote token, so the deposit is the order's reserve at the limit
		// price — `price × quantity / 10^baseDecimals` — not the typed amount.
		const buyOrder: OisyTradeResolvedOrder = {
			...sellOrder,
			side: 'buy',
			depositAmount: 3_702_000n
		};

		const swapParams = {
			identity: mockIdentity,
			sourceToken: ICP,
			destinationToken: CKUSDC,
			order: sellOrder
		};

		let approveSpy: MockInstance;
		let depositSpy: MockInstance;
		let addLimitOrderSpy: MockInstance;

		beforeEach(() => {
			vi.spyOn(appConstants, 'OISY_TRADE_CANISTER_ID', 'get').mockImplementation(() => 'aaaaa-aa');

			approveSpy = vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
			depositSpy = vi.spyOn(oisyTradeApi, 'deposit').mockResolvedValue({ block_index: 7n });
			addLimitOrderSpy = vi.spyOn(oisyTradeApi, 'addLimitOrder').mockResolvedValue('order-1');

			vi.spyOn(walletUtils, 'waitAndTriggerWallet').mockResolvedValue(undefined);

			// Filled and credited, which is the happy path every test below starts from.
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([
				{ id: 'order-1', order: { status: { Filled: null } }, pair: {} }
			] as unknown as UserOrder[]);
			// The first read is the pre-deposit baseline — nothing on the DEX yet — and
			// every read after it sees what the fill credited. Returning the credited
			// balance to the baseline read as well would make it look like a holding the
			// user already had, and settlement would correctly leave it alone.
			vi.spyOn(oisyTradeApi, 'getBalances')
				.mockResolvedValueOnce([])
				.mockResolvedValue([
					{
						token: { id: { ledger_id: Principal.fromText(CKUSDC_LEDGER) } },
						balance: { free: 2_000_000n, reserved: ZERO }
					}
				] as unknown as UserTokenBalance[]);
			vi.spyOn(oisyTradeApi, 'withdraw').mockResolvedValue({ block_index: 42n });
		});

		const run = (params = {}) =>
			fetchOisyTradeSwap({ ...swapParams, progress: vi.fn(), ...params });

		// `mockResolvedValueOnce` queues survive re-spying, so a test supplying its own
		// sequence of balance reads has to clear the one `beforeEach` queued — otherwise
		// its first value lands on the baseline read and everything shifts by one.
		const resetBalanceReads = () => {
			const spy = vi.spyOn(oisyTradeApi, 'getBalances');
			spy.mockReset();

			return spy;
		};

		it('submits a fill-or-kill order at the reviewed price and quantity', async () => {
			await run();

			expect(addLimitOrderSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					request: {
						pair: sellOrder.pair,
						side: { Sell: null },
						quantity: sellOrder.quantity,
						price: sellOrder.price,
						time_in_force: [{ FillOrKill: null }]
					}
				})
			);
		});

		it('deposits exactly the ordered quantity on a sell', async () => {
			await run();

			expect(depositSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					request: expect.objectContaining({ amount: sellOrder.quantity })
				})
			);
			// The allowance has to cover the `icrc2_transfer_from` fee on top of the amount.
			expect(approveSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ amount: sellOrder.quantity + ICP.fee })
			);
		});

		// The unorderable slice of the typed amount never leaves the wallet: the user pays
		// slightly less than they typed rather than receiving less than they were quoted.
		it('deposits the order reserve rather than the typed amount on a buy', async () => {
			await run({ order: buyOrder });

			expect(depositSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					request: expect.objectContaining({ amount: buyOrder.depositAmount })
				})
			);
		});

		it('walks the progress steps and enables the destination token', async () => {
			const progress = vi.fn();
			const enableDestinationToken = vi.fn().mockResolvedValue(undefined);

			await run({ progress, enableDestinationToken });

			expect(progress.mock.calls.flat()).toEqual([
				ProgressStepsSwap.APPROVE,
				ProgressStepsSwap.SWAP,
				ProgressStepsSwap.WITHDRAW,
				ProgressStepsSwap.UPDATE_UI
			]);
			expect(enableDestinationToken).toHaveBeenCalledOnce();
		});

		// A swap-placed order genuinely is a deposit and a limit order, so dropping either
		// event would leave a hole in the Trading funnel proportional to Swap's success.
		it('fires both Trading funnels alongside the swap', async () => {
			const depositSpyTracker = vi.spyOn(tradingAnalytics, 'trackDepositWithdraw');
			const orderSpyTracker = vi.spyOn(tradingAnalytics, 'trackLimitOrder');

			await run();

			expect(depositSpyTracker).toHaveBeenCalledWith(
				expect.objectContaining({
					direction: 'deposit',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
					token: ICP.symbol
				})
			);
			expect(orderSpyTracker).toHaveBeenCalledWith(
				expect.objectContaining({
					action: 'create',
					orderType: 'FOK',
					side: 'sell',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				})
			);
		});

		// Ordering, not just presence: the deposit credits the source leg, so a baseline
		// taken after it would make a killed order's returned reserve look like a balance
		// the user already had and leave it on the DEX.
		it('reads the balance baseline before depositing', async () => {
			const calls: string[] = [];

			resetBalanceReads().mockImplementation(() => {
				calls.push('getBalances');

				return Promise.resolve([
					{
						token: { id: { ledger_id: Principal.fromText(CKUSDC_LEDGER) } },
						balance: { free: 2_000_000n, reserved: ZERO }
					}
				] as unknown as UserTokenBalance[]);
			});
			depositSpy.mockImplementation(() => {
				calls.push('deposit');

				return Promise.resolve({ block_index: 7n });
			});

			await run();

			expect(calls[0]).toBe('getBalances');
			expect(calls.indexOf('deposit')).toBeGreaterThan(0);
		});

		it('never places an order when the deposit fails', async () => {
			depositSpy.mockRejectedValue(new Error('deposit failed'));

			await expect(run()).rejects.toThrow('deposit failed');

			expect(addLimitOrderSpy).not.toHaveBeenCalled();
		});

		// The one case unlike every other provider: the swap failed, but the funds came back.
		// The error is raised only *after* the source token has been withdrawn, so the user is
		// never told the swap failed while their money is still in someone else's custody.
		it('withdraws the source back before reporting a killed order', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([
				{ id: 'order-1', order: { status: { Expired: null } }, pair: {} }
			] as unknown as UserOrder[]);
			const withdrawSpy = vi.spyOn(oisyTradeApi, 'withdraw').mockResolvedValue({
				block_index: 42n
			});
			// Baseline first (nothing held), then the source the kill released back.
			resetBalanceReads()
				.mockResolvedValueOnce([])
				.mockResolvedValue([
					{
						token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
						balance: { free: 300_000_000n, reserved: ZERO }
					}
				] as unknown as UserTokenBalance[]);

			const progress = vi.fn();
			const enableDestinationToken = vi.fn();
			const walletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');

			// The typed error, with `kind`, is what the wizard branches on to present a
			// kill as the expected market outcome it is rather than an unexpected failure.
			await expect(run({ progress, enableDestinationToken })).rejects.toMatchObject({
				name: 'OisyTradeSwapError',
				kind: 'killed',
				message: en.swap.error.oisy_trade_order_killed
			});

			expect(withdrawSpy).toHaveBeenCalledOnce();
			expect(withdrawSpy.mock.calls[0][0].request.token_id.ledger_id.toText()).toBe(ICP_LEDGER);
			// The recovered source balance is refreshed, but the user never received the
			// destination token: nothing enables it, and the progress bar never reaches
			// the final step.
			expect(walletSpy).toHaveBeenCalledOnce();
			expect(enableDestinationToken).not.toHaveBeenCalled();
			expect(progress).not.toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		});

		// Nothing left in custody and nothing that says how the order ended: the error
		// asks the user to check the Trading tab, and since nothing was withdrawn there
		// is no wallet change to refresh and no destination token to enable.
		it('reports an unresolved settlement without refreshing or enabling anything', async () => {
			vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
			vi.spyOn(oisyTradeApi, 'getBalances').mockResolvedValue([]);
			const walletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');
			const enableDestinationToken = vi.fn();

			await expect(run({ enableDestinationToken })).rejects.toMatchObject({
				name: 'OisyTradeSwapError',
				kind: 'unresolved',
				message: en.swap.error.oisy_trade_settlement_unresolved
			});

			expect(walletSpy).not.toHaveBeenCalled();
			expect(enableDestinationToken).not.toHaveBeenCalled();
		});

		// The canister replying with an `Err` means the order was definitively not
		// accepted: the deposit sits in free balance with no order reserving it, and
		// rethrowing would return the wizard to Review with the funds still in DEX
		// custody — where a retry's fresh baseline would classify them as a holding no
		// later settlement sweeps.
		describe('an order the canister rejected', () => {
			beforeEach(() => {
				addLimitOrderSpy.mockRejectedValue(
					new OisyTradeRequestError({ message: 'off grid', reason: 'InvalidQuantity' })
				);

				// Baseline first — the user already holds some source on the DEX — then
				// what the deposit added on top of it.
				resetBalanceReads()
					.mockResolvedValueOnce([
						{
							token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
							balance: { free: 50_000_000n, reserved: ZERO }
						}
					] as unknown as UserTokenBalance[])
					.mockResolvedValue([
						{
							token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
							balance: { free: 350_000_000n, reserved: ZERO }
						}
					] as unknown as UserTokenBalance[]);
			});

			it('recovers the deposit before reporting the rejection', async () => {
				const withdrawSpy = vi.spyOn(oisyTradeApi, 'withdraw');
				const walletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');
				const getMyOrdersSpy = vi.spyOn(oisyTradeApi, 'getMyOrders');
				const enableDestinationToken = vi.fn();
				const progress = vi.fn();

				await expect(run({ progress, enableDestinationToken })).rejects.toMatchObject({
					name: 'OisyTradeSwapError',
					kind: 'not_placed',
					message: en.swap.error.oisy_trade_order_not_placed
				});

				// Only what the deposit added — never the account-wide free balance, part
				// of which the user funded from the Trading tab.
				expect(withdrawSpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						request: expect.objectContaining({ amount: 300_000_000n })
					})
				);
				expect(withdrawSpy.mock.calls[0][0].request.token_id.ledger_id.toText()).toBe(ICP_LEDGER);

				// No order exists, so there is nothing to settle; the recovered source
				// balance is refreshed, and the destination token the user never received
				// is neither enabled nor reached in the progress bar.
				expect(getMyOrdersSpy).not.toHaveBeenCalled();
				expect(walletSpy).toHaveBeenCalledOnce();
				expect(enableDestinationToken).not.toHaveBeenCalled();
				expect(progress.mock.calls.flat()).toEqual([
					ProgressStepsSwap.APPROVE,
					ProgressStepsSwap.SWAP,
					ProgressStepsSwap.WITHDRAW
				]);
			});

			it('reports a failed recovery pointing at the Trading tab', async () => {
				const recoveryError = new OisyTradeRequestError({
					message: 'nope',
					reason: 'InsufficientBalance'
				});
				vi.spyOn(oisyTradeApi, 'withdraw').mockRejectedValue(recoveryError);
				const consoleErrorSpy = vi
					.spyOn(consoleUtils, 'consoleError')
					.mockImplementation(() => undefined);
				const walletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');

				await expect(run()).rejects.toMatchObject({
					name: 'OisyTradeSwapError',
					kind: 'recovery_failed',
					message: en.swap.error.oisy_trade_recovery_failed
				});

				// The funds are still in DEX custody, so there is no wallet change to show.
				expect(walletSpy).not.toHaveBeenCalled();
				expect(consoleErrorSpy).toHaveBeenCalledWith(recoveryError);
			});
		});

		// A failure that is not the canister's `Err` reply is ambiguous — the call may
		// have landed and only the reply been lost, so an order may exist with the
		// reserve locked. Withdrawing here could race that live order, so the error
		// propagates untouched and the case belongs to step 2's durable recovery record.
		it('rethrows an ambiguous placement failure without touching the deposit', async () => {
			addLimitOrderSpy.mockRejectedValue(new Error('reply lost'));
			const withdrawSpy = vi.spyOn(oisyTradeApi, 'withdraw');
			const walletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');

			await expect(run()).rejects.toThrow('reply lost');

			expect(withdrawSpy).not.toHaveBeenCalled();
			expect(walletSpy).not.toHaveBeenCalled();
		});

		describe('retrying', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const settleWithFakeTimers = async (promise: Promise<unknown>) => {
				// One tick of the settle interval is all the mocks below need; the assertion
				// is that the flow asked a second time rather than giving up on the first.
				await vi.advanceTimersByTimeAsync(OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS);

				return await promise;
			};

			it('keeps polling while the order has not settled yet', async () => {
				const getMyOrdersSpy = vi
					.spyOn(oisyTradeApi, 'getMyOrders')
					.mockResolvedValueOnce([
						{ id: 'order-1', order: { status: { Pending: null } }, pair: {} }
					] as unknown as UserOrder[])
					.mockResolvedValue([
						{ id: 'order-1', order: { status: { Filled: null } }, pair: {} }
					] as unknown as UserOrder[]);

				await settleWithFakeTimers(run());

				expect(getMyOrdersSpy).toHaveBeenCalledTimes(2);
			});

			// The most damaging bug this integration can ship is ending the operation on a
			// transient failure, with the funds still in DEX custody and nothing watching them.
			it('retries a retryable withdrawal failure rather than failing the swap', async () => {
				const withdrawSpy = vi
					.spyOn(oisyTradeApi, 'withdraw')
					.mockRejectedValueOnce(
						new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
					)
					.mockResolvedValue({ block_index: 42n });

				const settlement = await settleWithFakeTimers(run());

				expect(settlement).toEqual({ status: 'filled', withdrawals: [42n] });
				expect(withdrawSpy).toHaveBeenCalledTimes(2);
			});

			// A filled Buy whose price-improved fill released unspent reserve: the primary
			// (destination) withdrawal lands, the residue (source) withdrawal fails
			// transiently, and the retry re-enters the settlement — where the withdrawn
			// primary's delta reads zero and only the residue is left to take. The swap
			// still succeeds, with no funds left behind.
			it('retries a retryable residue withdrawal failure and still succeeds', async () => {
				vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([
					{ id: 'order-1', order: { status: { Filled: null } }, pair: {} }
				] as unknown as UserOrder[]);
				resetBalanceReads()
					// Baseline: nothing on the DEX.
					.mockResolvedValueOnce([])
					// After the fill: the credited destination plus the released source reserve.
					.mockResolvedValueOnce([
						{
							token: { id: { ledger_id: Principal.fromText(CKUSDC_LEDGER) } },
							balance: { free: 2_000_000n, reserved: ZERO }
						},
						{
							token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
							balance: { free: 100_000_000n, reserved: ZERO }
						}
					] as unknown as UserTokenBalance[])
					// After the primary withdrawal: only the residue remains.
					.mockResolvedValue([
						{
							token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
							balance: { free: 100_000_000n, reserved: ZERO }
						}
					] as unknown as UserTokenBalance[]);
				const withdrawSpy = vi
					.spyOn(oisyTradeApi, 'withdraw')
					.mockResolvedValueOnce({ block_index: 42n })
					.mockRejectedValueOnce(
						new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
					)
					.mockResolvedValue({ block_index: 43n });

				const promise = run();

				// The retry's sleep is scheduled deep in a promise chain, so a single
				// advance can complete before the timer even exists — `vi.waitFor`
				// advances the fake timers by `interval` on every check instead.
				await vi.waitFor(() => expect(withdrawSpy).toHaveBeenCalledTimes(3), {
					interval: OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS,
					timeout: 4 * OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS
				});

				// The second attempt's outcome: the primary is dust-skipped (already
				// withdrawn) and the residue's block index is the one reported.
				await expect(promise).resolves.toEqual({ status: 'filled', withdrawals: [43n] });
			});

			// The recovery withdrawal honours the same retry policy as settlement, and for
			// the same reason: giving up on a transient failure would end the flow with
			// the funds still in DEX custody and nothing watching them.
			it('retries a retryable recovery failure after a rejected order', async () => {
				addLimitOrderSpy.mockRejectedValue(
					new OisyTradeRequestError({ message: 'off grid', reason: 'InvalidQuantity' })
				);
				resetBalanceReads()
					.mockResolvedValueOnce([])
					.mockResolvedValue([
						{
							token: { id: { ledger_id: Principal.fromText(ICP_LEDGER) } },
							balance: { free: 300_000_000n, reserved: ZERO }
						}
					] as unknown as UserTokenBalance[]);
				const withdrawSpy = vi
					.spyOn(oisyTradeApi, 'withdraw')
					.mockRejectedValueOnce(
						new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
					)
					.mockResolvedValue({ block_index: 42n });

				const promise = run();
				// The flow rejects while the timers below advance, which would otherwise
				// fire as an unhandled rejection; the assertion re-awaits the same promise.
				promise.catch(() => undefined);

				// The retry's sleep is scheduled deep in a promise chain, so a single
				// advance can complete before the timer even exists. `vi.waitFor` advances
				// the fake timers by `interval` on every check, which reaches it
				// deterministically — provided each step covers the whole poll interval.
				await vi.waitFor(() => expect(withdrawSpy).toHaveBeenCalledTimes(2), {
					interval: OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS,
					timeout: 4 * OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS
				});

				await expect(promise).rejects.toMatchObject({
					name: 'OisyTradeSwapError',
					kind: 'not_placed'
				});
			});

			// No timer advance: a non-retryable failure ends the swap on the first attempt,
			// which is exactly the difference from the test above.
			it('fails the swap on a withdrawal failure that is not retryable', async () => {
				const withdrawSpy = vi
					.spyOn(oisyTradeApi, 'withdraw')
					.mockRejectedValue(
						new OisyTradeRequestError({ message: 'nope', reason: 'InsufficientBalance' })
					);

				await expect(run()).rejects.toThrow('nope');

				expect(withdrawSpy).toHaveBeenCalledOnce();
			});
		});
	});
});
