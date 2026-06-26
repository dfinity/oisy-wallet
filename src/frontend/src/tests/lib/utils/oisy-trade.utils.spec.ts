import type {
	Token as OisyTradeToken,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import {
	mapOisyTradeAssets,
	oisyTradeAssetHasReserved,
	oisyTradeDepositableTokens,
	oisyTradeSupportedTokenSymbols,
	sumOisyTradeAssetsUsd
} from '$lib/utils/oisy-trade.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const mockLedgerId = mockValidIcToken.ledgerCanisterId;

const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
	({
		base: { metadata: { symbol: base } },
		quote: { metadata: { symbol: quote } }
	}) as unknown as TradingPairInfo;

const buildBalance = ({ free, reserved }: { free: bigint; reserved: bigint }): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(mockLedgerId) } },
		balance: { free, reserved }
	}) as unknown as UserTokenBalance;

const buildAsset = (over: Partial<OisyTradeAsset>): OisyTradeAsset => ({
	token: mockValidIcToken,
	free: ZERO,
	reserved: ZERO,
	total: ZERO,
	totalUsd: undefined,
	freeUsd: undefined,
	...over
});

describe('oisy-trade.utils', () => {
	describe('oisyTradeSupportedTokenSymbols', () => {
		it('returns the distinct union of base and quote symbols', () => {
			expect(
				oisyTradeSupportedTokenSymbols([
					buildPair({ base: 'ICP', quote: 'ckUSDC' }),
					buildPair({ base: 'ICP', quote: 'ckBTC' }),
					buildPair({ base: 'ckBTC', quote: 'ckUSDC' })
				])
			).toEqual(['ICP', 'ckUSDC', 'ckBTC']);
		});

		it('returns an empty list when there are no pairs', () => {
			expect(oisyTradeSupportedTokenSymbols([])).toEqual([]);
		});
	});

	describe('mapOisyTradeAssets', () => {
		const exchanges: ExchangesData = { [mockValidIcToken.id]: { usd: 2 } };

		it('resolves a balance to the matching token with totals and fiat values', () => {
			const assets = mapOisyTradeAssets({
				balances: [buildBalance({ free: 100n, reserved: 50n })],
				tokens: [mockValidIcToken],
				exchanges
			});

			expect(assets).toHaveLength(1);

			const [asset] = assets;

			expect(asset.token).toBe(mockValidIcToken);
			expect(asset.free).toBe(100n);
			expect(asset.reserved).toBe(50n);
			expect(asset.total).toBe(150n);
			expect(asset.totalUsd).toBeGreaterThan(0);
			expect(asset.freeUsd).toBeGreaterThan(0);
		});

		it('drops balances whose ledger is unknown', () => {
			const unknownToken: IcToken = {
				...mockValidIcToken,
				id: parseTokenId('UnknownToken'),
				ledgerCanisterId: 'aaaaa-aa'
			};

			expect(
				mapOisyTradeAssets({
					balances: [buildBalance({ free: 100n, reserved: ZERO })],
					tokens: [unknownToken],
					exchanges
				})
			).toEqual([]);
		});

		it('leaves fiat values undefined when no exchange rate is available', () => {
			const [asset] = mapOisyTradeAssets({
				balances: [buildBalance({ free: 100n, reserved: ZERO })],
				tokens: [mockValidIcToken],
				exchanges: {}
			});

			expect(asset.totalUsd).toBeUndefined();
			expect(asset.freeUsd).toBeUndefined();
		});
	});

	describe('sumOisyTradeAssetsUsd', () => {
		it('sums the total fiat value, treating undefined as zero', () => {
			expect(
				sumOisyTradeAssetsUsd([
					buildAsset({ totalUsd: 10 }),
					buildAsset({ totalUsd: undefined }),
					buildAsset({ totalUsd: 5 })
				])
			).toBe(15);
		});
	});

	describe('oisyTradeAssetHasReserved', () => {
		it('is true only when some balance is reserved', () => {
			expect(oisyTradeAssetHasReserved(buildAsset({ reserved: 1n }))).toBeTruthy();
			expect(oisyTradeAssetHasReserved(buildAsset({ reserved: ZERO }))).toBeFalsy();
		});
	});

	describe('oisyTradeDepositableTokens', () => {
		const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
		const LEDGER_CKBTC = 'mxzaz-hqaaa-aaaar-qaada-cai';
		const LEDGER_OTHER = 'mc6ru-gyaaa-aaaar-qaaaq-cai';

		const supported = (ledgerId: string): OisyTradeToken => ({
			id: { ledger_id: Principal.fromText(ledgerId) },
			metadata: { symbol: 'X', decimals: 8 }
		});

		it('resolves supported tokens by ledger id (not symbol) and keeps only held ones', () => {
			const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };
			const ckBtc: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: LEDGER_CKBTC,
				symbol: 'ckBTC'
			};
			// Same symbol as ICP but a different ledger (e.g. a testnet/staging
			// variant): must NOT be collapsed onto the supported mainnet ICP.
			const otherIcp: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: LEDGER_OTHER,
				symbol: 'ICP'
			};

			const result = oisyTradeDepositableTokens({
				supportedTokens: [supported(LEDGER_ICP), supported(LEDGER_CKBTC)],
				tokens: [icp, ckBtc, otherIcp],
				hasBalance: () => true
			});

			expect(result).toEqual([icp, ckBtc]);
		});

		it('drops tokens with no wallet balance', () => {
			const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };

			expect(
				oisyTradeDepositableTokens({
					supportedTokens: [supported(LEDGER_ICP)],
					tokens: [icp],
					hasBalance: () => false
				})
			).toEqual([]);
		});
	});
});
