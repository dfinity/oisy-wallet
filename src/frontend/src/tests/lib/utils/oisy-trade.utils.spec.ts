import type { TradingPairInfo, UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import {
	mapOisyTradeAssets,
	oisyTradeAssetHasReserved,
	oisyTradeDepositableTokens,
	oisyTradeSupportedTokenSymbols,
	sumOisyTradeAssetsUsd,
	toOisyTradeWithdrawTokens
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
					{ totalUsd: 10 },
					{ totalUsd: undefined },
					{ totalUsd: 5 }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				] as any)
			).toBe(15);
		});
	});

	describe('oisyTradeAssetHasReserved', () => {
		it('is true only when some balance is reserved', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(oisyTradeAssetHasReserved({ reserved: 1n } as any)).toBeTruthy();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(oisyTradeAssetHasReserved({ reserved: ZERO } as any)).toBeFalsy();
		});
	});

	describe('oisyTradeDepositableTokens', () => {
		it('keeps only supported, held tokens, first symbol wins', () => {
			const icp: IcToken = { ...mockValidIcToken, id: parseTokenId('ICP'), symbol: 'ICP' };
			const icpDuplicate: IcToken = {
				...mockValidIcToken,
				id: parseTokenId('ICP2'),
				symbol: 'ICP'
			};
			const ckBtc: IcToken = { ...mockValidIcToken, id: parseTokenId('ckBTC'), symbol: 'ckBTC' };
			const unsupported: IcToken = {
				...mockValidIcToken,
				id: parseTokenId('FOO'),
				symbol: 'FOO'
			};

			const result = oisyTradeDepositableTokens({
				symbols: ['ICP', 'ckBTC'],
				tokens: [icp, icpDuplicate, ckBtc, unsupported],
				hasBalance: () => true
			});

			expect(result).toEqual([icp, ckBtc]);
		});

		it('drops tokens with no wallet balance', () => {
			const icp: IcToken = { ...mockValidIcToken, id: parseTokenId('ICP'), symbol: 'ICP' };

			expect(
				oisyTradeDepositableTokens({
					symbols: ['ICP'],
					tokens: [icp],
					hasBalance: () => false
				})
			).toEqual([]);
		});
	});

	describe('toOisyTradeWithdrawTokens', () => {
		const dexBalance = ({
			ledgerCanisterId,
			free,
			reserved
		}: {
			ledgerCanisterId: string;
			free: bigint;
			reserved: bigint;
		}): UserTokenBalance =>
			({
				token: { id: { ledger_id: Principal.fromText(ledgerCanisterId) } },
				balance: { free, reserved }
			}) as unknown as UserTokenBalance;

		it('pairs a DEX balance with the matching OISY token by ledger canister id', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [
					dexBalance({
						ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
						free: 10n,
						reserved: 3n
					})
				],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([{ token: mockValidIcToken, free: 10n, reserved: 3n }]);
		});

		it('drops balances whose ledger is unknown to the wallet', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [
					dexBalance({ ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', free: 10n, reserved: ZERO })
				],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([]);
		});
	});
});
