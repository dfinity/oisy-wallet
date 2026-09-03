import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_REGTEST_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_EXTERNAL_REF_KEYS } from '$lib/types/oisy-trade-swap';
import { SwapProvider } from '$lib/types/swap';
import {
	buildOisyTradeSwapTrackingMetadata,
	findOisyTradeRowToken,
	isOisyTradeActiveUserTransaction,
	toOisyTradeCandidDataSide,
	toOisyTradeData,
	toOisyTradeDisplayRefs,
	toOisyTradeExternalRefs,
	toOisyTradeExternalRefsMap,
	toOisyTradeRefAmount
} from '$lib/utils/oisy-trade-active-tx.utils';
import {
	mockActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const CKUSDC_LEDGER = 'xevnm-gaaaa-aaaar-qafnq-cai';

const CKUSDC: IcToken = {
	...mockValidIcToken,
	ledgerCanisterId: CKUSDC_LEDGER,
	symbol: 'ckUSDC',
	decimals: 6
};

const row = (overrides: Partial<ActiveUserTransaction> = {}): ActiveUserTransaction => ({
	...mockActiveUserTransaction,
	data: {
		OisyTrade: {
			side: { Sell: null },
			source_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
			dest_token: { Icrc: Principal.fromText(CKUSDC_LEDGER) },
			amount: 300_000_000n
		}
	},
	...overrides
});

describe('oisy-trade-active-tx.utils', () => {
	describe('isOisyTradeActiveUserTransaction', () => {
		it('recognizes an OISY Trade row', () => {
			expect(isOisyTradeActiveUserTransaction(row())).toBeTruthy();
		});

		it('rejects another provider’s row', () => {
			expect(isOisyTradeActiveUserTransaction(mockNearIntentsActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('toOisyTradeCandidDataSide', () => {
		it.each([
			{ side: 'sell', expected: { Sell: null } },
			{ side: 'buy', expected: { Buy: null } }
		] as const)('maps $side onto the candid discriminant', ({ side, expected }) => {
			expect(toOisyTradeCandidDataSide(side)).toEqual(expected);
		});
	});

	describe('toOisyTradeData', () => {
		// The side is what fixes the base/quote orientation: `Sell` spends the base
		// token, `Buy` the quote one, and the two token ids alone cannot say which.
		it('carries the side alongside the immutable trio', () => {
			expect(
				toOisyTradeData({
					side: 'buy',
					sourceToken: CKUSDC,
					destinationToken: ICP_TOKEN,
					amount: 3_702_000n
				})
			).toEqual({
				OisyTrade: {
					side: { Buy: null },
					source_token: { Icrc: Principal.fromText(CKUSDC_LEDGER) },
					dest_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
					amount: 3_702_000n
				}
			});
		});

		// The caller treats this as a reason to abort the swap rather than to proceed
		// untracked, which is the opposite of every other provider's reading.
		it('returns undefined when a token has no backend id', () => {
			expect(
				toOisyTradeData({
					side: 'sell',
					// Bitcoin regtest is the one asset with no backend `TokenId` variant.
					sourceToken: BTC_REGTEST_TOKEN,
					destinationToken: CKUSDC,
					amount: 1n
				})
			).toBeUndefined();
		});
	});

	describe('toOisyTradeExternalRefs', () => {
		it('sorts the keys and drops empty values', () => {
			expect(
				toOisyTradeExternalRefs({
					[OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID]: 'order-1',
					[OISY_TRADE_EXTERNAL_REF_KEYS.AMOUNT]: '',
					[OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]: '7'
				})
			).toEqual([
				{ key: OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX, value: '7' },
				{ key: OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID, value: 'order-1' }
			]);
		});

		// A zero baseline is a fact, not an absence: it says the user held nothing on the
		// DEX, which is what makes the whole current balance attributable to this order.
		it('keeps a zero baseline', () => {
			expect(
				toOisyTradeExternalRefs({
					[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]: '0'
				})
			).toEqual([{ key: OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE, value: '0' }]);
		});
	});

	describe('toOisyTradeExternalRefsMap', () => {
		it('keys the wire-format array', () => {
			expect(
				toOisyTradeExternalRefsMap([
					{ key: OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID, value: 'order-1' }
				])
			).toEqual({ [OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID]: 'order-1' });
		});
	});

	describe('toOisyTradeDisplayRefs', () => {
		// OneSec's exact key strings, which is the whole reason an OISY Trade row renders
		// without a new layout: `ActiveUserTransactionItem` reads every row's refs through
		// `toOneSecExternalRefsMap`.
		it('snapshots both legs under OneSec’s key names', () => {
			expect(
				toOisyTradeDisplayRefs({
					sourceToken: ICP_TOKEN,
					destinationToken: CKUSDC,
					amount: '3',
					usdSourceValue: '36.5'
				})
			).toEqual({
				amount: '3',
				usd_source_value: '36.5',
				source_token_symbol: ICP_TOKEN.symbol,
				source_network_symbol: ICP_TOKEN.network.name,
				destination_token_symbol: CKUSDC.symbol,
				destination_network_symbol: CKUSDC.network.name
			});
		});

		it('omits an unknown USD value rather than writing an empty ref', () => {
			expect(
				toOisyTradeDisplayRefs({
					sourceToken: ICP_TOKEN,
					destinationToken: CKUSDC,
					amount: '3'
				})
			).not.toHaveProperty('usd_source_value');
		});
	});

	describe('toOisyTradeRefAmount', () => {
		it('reads a base-unit ref', () => {
			expect(toOisyTradeRefAmount('300000000')).toBe(300_000_000n);
		});

		// Conservative on purpose: a zero baseline attributes the whole current balance to
		// this order and settlement withdraws it. Leaving the funds in DEX custody because
		// a ref was dropped would be the worse failure.
		it.each([undefined, '', 'not a number'])('reads %s as zero', (value) => {
			expect(toOisyTradeRefAmount(value)).toBe(ZERO);
		});
	});

	describe('findOisyTradeRowToken', () => {
		const tokens = [USDC_TOKEN, ICP_TOKEN, CKUSDC];

		it('resolves an ICRC leg by ledger id', () => {
			expect(
				findOisyTradeRowToken({ tokenId: { Icrc: Principal.fromText(CKUSDC_LEDGER) }, tokens })
			).toBe(CKUSDC);
		});

		// ICP is written as `Icrc` by ledger id, so it resolves the same way rather than
		// through the `IcpNative` variant reserved for the exchange-rate path.
		it('resolves the ICP leg by its ledger id', () => {
			expect(
				findOisyTradeRowToken({
					tokenId: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
					tokens
				})
			).toBe(ICP_TOKEN);
		});

		it('resolves nothing for a ledger the wallet does not know', () => {
			expect(
				findOisyTradeRowToken({
					tokenId: { Icrc: Principal.fromText('mxzaz-hqaaa-aaaar-qaada-cai') },
					tokens
				})
			).toBeUndefined();
		});

		// Settlement is ICRC-only by construction, and a non-IC token could not carry the
		// ledger id or the fee it needs.
		it('never resolves a non-IC token', () => {
			expect(findOisyTradeRowToken({ tokenId: { EvmNative: 1n }, tokens })).toBeUndefined();
		});
	});

	describe('buildOisyTradeSwapTrackingMetadata', () => {
		// Resolved entirely off the refs snapshot, so it stays correct across a refresh, a
		// re-login, and after the user disables one of the two tokens.
		it('builds the shared swap metadata from the row’s refs', () => {
			expect(
				buildOisyTradeSwapTrackingMetadata({
					tx: row({
						external_refs: toOisyTradeExternalRefs({
							[OISY_TRADE_EXTERNAL_REF_KEYS.AMOUNT]: '3',
							[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'ICP',
							[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: 'Internet Computer',
							[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: 'ckUSDC',
							[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: 'Internet Computer'
						})
					})
				})
			).toEqual({
				sourceToken: 'ICP',
				destinationToken: 'ckUSDC',
				dApp: SwapProvider.OISY_TRADE,
				tokenAmount: '3',
				sourceNetwork: 'Internet Computer',
				destinationNetwork: 'Internet Computer'
			});
		});

		it('carries the row’s error onto a failed row’s metadata', () => {
			expect(
				buildOisyTradeSwapTrackingMetadata({
					tx: row({ status: { Failed: null }, error: ['could not fill'] })
				})
			).toEqual(expect.objectContaining({ error: 'could not fill' }));
		});
	});
});
