import * as exchangeEnv from '$env/exchange.env';
import {
	CKERC20_LEDGER_CANISTER_IDS,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import {
	ARBITRUM_ETH_TOKEN_ID,
	ARBITRUM_SEPOLIA_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import {
	BASE_ETH_TOKEN_ID,
	BASE_SEPOLIA_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN_ID,
	BNB_TESTNET_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	POL_AMOY_TOKEN_ID,
	POL_MAINNET_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { IC_BUILTIN_TOKENS } from '$env/tokens/tokens.ic.env';
import { ICP_TOKEN_ID, TESTICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcCkToken } from '$icp/types/ic-token';
import {
	exchangeInitialized,
	exchangeNotInitialized,
	exchanges
} from '$lib/derived/exchange.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplToken } from '$sol/types/spl';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockSplCustomToken, mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('exchange.derived', () => {
	describe('exchangeInitialized', () => {
		beforeEach(() => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementation(() => false);
		});

		it('should return false when exchange store is empty', () => {
			expect(get(exchangeInitialized)).toBeFalsy();
		});

		it('should return true when exchange is disabled', () => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementationOnce(() => true);

			expect(get(exchangeInitialized)).toBeTruthy();
		});

		it('should return true when exchange store is not empty', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);

			expect(get(exchangeInitialized)).toBeTruthy();
		});

		it('should return false when exchange store is reset', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);
			exchangeStore.reset();

			expect(get(exchangeInitialized)).toBeFalsy();
		});
	});

	describe('exchangeNotInitialized', () => {
		beforeEach(() => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementation(() => false);
		});

		it('should return true when exchange store is empty', () => {
			expect(get(exchangeNotInitialized)).toBeTruthy();
		});

		it('should return false when exchange is disabled', () => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementationOnce(() => true);

			expect(get(exchangeNotInitialized)).toBeFalsy();
		});

		it('should return false when exchange store is not empty', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);

			expect(get(exchangeNotInitialized)).toBeFalsy();
		});

		it('should return true when exchange store is reset', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);
			exchangeStore.reset();

			expect(get(exchangeNotInitialized)).toBeTruthy();
		});
	});

	describe('exchanges', () => {
		const mockErc20DefaultToken: Erc20Token = {
			...mockValidErc20Token,
			id: parseTokenId('Erc20DefaultTokenId'),
			symbol: 'DTK',
			address: `${mockValidErc20Token.address}1`
		};

		const mockEr20UserToken: Erc20UserToken = {
			...mockValidErc20Token,
			id: parseTokenId('Erc20UserTokenId'),
			symbol: 'EUTK',
			address: `${mockValidErc20Token.address}2`,
			version: undefined,
			enabled: true
		};

		const mockCkBtcToken = {
			...mockValidIcCkToken,
			id: parseTokenId('CkBtcTokenId'),
			name: 'ckBTC',
			symbol: BTC_MAINNET_TOKEN.twinTokenSymbol,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			twinToken: BTC_MAINNET_TOKEN
		} as IcCkToken;

		const mockCkEthToken = {
			...mockValidIcCkToken,
			id: parseTokenId('CkEthTokenId'),
			name: 'ckETH',
			symbol: ETHEREUM_TOKEN.twinTokenSymbol,
			ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
			twinToken: ETHEREUM_TOKEN
		} as IcCkToken;

		const mockCkUsdcToken = {
			...mockValidIcCkToken,
			id: parseTokenId('CkUsdcTokenId'),
			name: 'ckUSDC',
			symbol: USDC_TOKEN.twinTokenSymbol,
			ledgerCanisterId: CKERC20_LEDGER_CANISTER_IDS[0],
			twinToken: USDC_TOKEN
		} as IcCkToken;

		const mockSplDefaultToken: SplToken = {
			...mockValidSplToken,
			id: parseTokenId('SplDefaultTokenId1'),
			symbol: 'SplDefaultTokenId1'
		};

		const ethPrice = { usd: 123 };
		const btcPrice = { usd: 123_456 };
		const icpPrice = { usd: 123_456_789 };
		const solPrice = { usd: 987 };
		const bnbPrice = { usd: 987_654 };
		const polPrice = { usd: 987_654_321 };

		const mockErc20TokenPrice1 = { usd: 1.23 };
		const mockErc20TokenPrice2 = { usd: 12.3 };
		const mockIcrcTokenPrice1 = { usd: 4.56 };
		const mockIcrcTokenPrice2 = { usd: 45.6 };
		const mockSplTokenPrice1 = { usd: 7.89 };
		const mockSplTokenPrice2 = { usd: 78.9 };

		const expectedNullishExchangesNative = {
			[BTC_TESTNET_TOKEN_ID]: undefined,
			[BTC_MAINNET_TOKEN_ID]: undefined,
			[BTC_REGTEST_TOKEN_ID]: undefined,
			[ETHEREUM_TOKEN_ID]: undefined,
			[SEPOLIA_TOKEN_ID]: undefined,
			[ICP_TOKEN_ID]: undefined,
			[TESTICP_TOKEN_ID]: undefined,
			[SOLANA_TOKEN_ID]: undefined,
			[SOLANA_DEVNET_TOKEN_ID]: undefined,
			[SOLANA_LOCAL_TOKEN_ID]: undefined,
			[BASE_ETH_TOKEN_ID]: undefined,
			[BASE_SEPOLIA_ETH_TOKEN_ID]: undefined,
			[BNB_MAINNET_TOKEN_ID]: undefined,
			[BNB_TESTNET_TOKEN_ID]: undefined,
			[POL_MAINNET_TOKEN_ID]: undefined,
			[POL_AMOY_TOKEN_ID]: undefined,
			[ARBITRUM_ETH_TOKEN_ID]: undefined,
			[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: undefined
		};

		const expectedNullishExchangesIcrc = IC_BUILTIN_TOKENS.sort((a, b) =>
			a.name.localeCompare(b.name)
		).reduce((acc, { id }) => ({ ...acc, [id]: undefined }), {});

		const expectedNullishExchanges = {
			...expectedNullishExchangesNative,
			[mockCkBtcToken.id]: undefined,
			[mockCkEthToken.id]: undefined,
			...expectedNullishExchangesIcrc
		};

		const expectedExchanges = {
			...expectedNullishExchanges,
			[BTC_TESTNET_TOKEN_ID]: btcPrice,
			[BTC_MAINNET_TOKEN_ID]: btcPrice,
			[BTC_REGTEST_TOKEN_ID]: btcPrice,
			[ETHEREUM_TOKEN_ID]: ethPrice,
			[SEPOLIA_TOKEN_ID]: ethPrice,
			[ICP_TOKEN_ID]: icpPrice,
			[TESTICP_TOKEN_ID]: icpPrice,
			[SOLANA_TOKEN_ID]: solPrice,
			[SOLANA_DEVNET_TOKEN_ID]: solPrice,
			[SOLANA_LOCAL_TOKEN_ID]: solPrice,
			[BASE_ETH_TOKEN_ID]: ethPrice,
			[BASE_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
			[BNB_MAINNET_TOKEN_ID]: bnbPrice,
			[BNB_TESTNET_TOKEN_ID]: bnbPrice,
			[POL_MAINNET_TOKEN_ID]: polPrice,
			[POL_AMOY_TOKEN_ID]: polPrice,
			[ARBITRUM_ETH_TOKEN_ID]: ethPrice,
			[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: ethPrice
		};

		beforeEach(() => {
			vi.clearAllMocks();

			exchangeStore.reset();

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			erc20CustomTokensStore.resetAll();

			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();

			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();

			erc20DefaultTokensStore.add(mockErc20DefaultToken);
			erc20UserTokensStore.setAll([
				{ data: { ...mockErc20DefaultToken, enabled: true }, certified: false },
				{ data: mockEr20UserToken, certified: false }
			]);

			icrcDefaultTokensStore.set({ data: mockCkBtcToken, certified: false });
			icrcCustomTokensStore.set({ data: { ...mockCkBtcToken, enabled: true }, certified: false });
			icrcDefaultTokensStore.set({ data: mockCkEthToken, certified: false });
			icrcCustomTokensStore.set({ data: { ...mockCkEthToken, enabled: true }, certified: false });

			splDefaultTokensStore.add(mockSplDefaultToken);
			splCustomTokensStore.setAll([
				{ data: { ...mockSplDefaultToken, enabled: true }, certified: false },
				{ data: mockSplCustomToken, certified: false }
			]);
		});

		it('should return nullish values when exchange store is nullish', () => {
			exchangeStore.reset();

			expect(get(exchanges)).toStrictEqual(expectedNullishExchanges);
		});

		it('should return nullish values when exchange store is empty', () => {
			exchangeStore.set([]);

			expect(get(exchanges)).toStrictEqual(expectedNullishExchanges);
		});

		it('should return values for some native tokens', () => {
			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedNullishExchanges,
				[BTC_TESTNET_TOKEN_ID]: btcPrice,
				[BTC_MAINNET_TOKEN_ID]: btcPrice,
				[BTC_REGTEST_TOKEN_ID]: btcPrice,
				[ETHEREUM_TOKEN_ID]: ethPrice,
				[SEPOLIA_TOKEN_ID]: ethPrice,
				[ICP_TOKEN_ID]: icpPrice,
				[TESTICP_TOKEN_ID]: icpPrice,
				[BASE_ETH_TOKEN_ID]: ethPrice,
				[BASE_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
				[ARBITRUM_ETH_TOKEN_ID]: ethPrice,
				[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: ethPrice
			});
		});

		it('should return values for all native tokens', () => {
			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice }
			]);

			expect(get(exchanges)).toStrictEqual(expectedExchanges);
		});

		it('should update the prices when exchange store is updated', () => {
			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice }
			]);

			expect(get(exchanges)).toStrictEqual(expectedExchanges);

			const newEthPrice = { usd: ethPrice.usd + 100 };

			exchangeStore.set([{ ethereum: newEthPrice }]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[ETHEREUM_TOKEN_ID]: newEthPrice,
				[SEPOLIA_TOKEN_ID]: newEthPrice,
				[BASE_ETH_TOKEN_ID]: newEthPrice,
				[BASE_SEPOLIA_ETH_TOKEN_ID]: newEthPrice,
				[ARBITRUM_ETH_TOKEN_ID]: newEthPrice,
				[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: newEthPrice
			});
		});

		it('should return values for ERC20 tokens', () => {
			exchangeStore.set([
				{ [mockErc20DefaultToken.address.toUpperCase()]: mockErc20TokenPrice1 },
				{ [mockEr20UserToken.address.toLowerCase()]: mockErc20TokenPrice2 }
			]);

			const result = get(exchanges);

			expect(result?.[mockErc20DefaultToken.id]).toEqual(mockErc20TokenPrice1);
			expect(result?.[mockEr20UserToken.id]).toEqual(mockErc20TokenPrice2);
		});

		it('should return values for SPL tokens', () => {
			exchangeStore.set([
				{ [mockSplDefaultToken.address.toLowerCase()]: mockSplTokenPrice1 },
				{ [mockSplCustomToken.address.toUpperCase()]: mockSplTokenPrice2 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedNullishExchanges,
				[mockSplDefaultToken.id]: mockSplTokenPrice1,
				[mockSplCustomToken.id]: mockSplTokenPrice2
			});
		});

		it('should return values for ERC20 and SPL tokens', () => {
			exchangeStore.set([
				{ [mockErc20DefaultToken.address.toLowerCase()]: mockErc20TokenPrice1 },
				{ [mockEr20UserToken.address.toLowerCase()]: mockErc20TokenPrice2 },
				{ [mockSplDefaultToken.address.toLowerCase()]: mockSplTokenPrice1 },
				{ [mockSplCustomToken.address.toLowerCase()]: mockSplTokenPrice2 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedNullishExchanges,
				[mockErc20DefaultToken.id]: mockErc20TokenPrice1,
				[mockEr20UserToken.id]: mockErc20TokenPrice2,
				[mockSplDefaultToken.id]: mockSplTokenPrice1,
				[mockSplCustomToken.id]: mockSplTokenPrice2
			});
		});

		it('should return values for ERC20 token ICP', () => {
			erc20UserTokensStore.setAll([
				{
					data: { ...mockErc20DefaultToken, exchange: 'icp', enabled: true },
					certified: false
				}
			]);

			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[mockErc20DefaultToken.id]: icpPrice
			});
		});

		it('should return values for ICRC tokens', () => {
			exchangeStore.set([
				{ [mockCkBtcToken.ledgerCanisterId]: mockIcrcTokenPrice1 },
				{ [mockCkEthToken.ledgerCanisterId]: mockIcrcTokenPrice2 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedNullishExchangesNative,
				[mockCkBtcToken.id]: mockIcrcTokenPrice1,
				[mockCkEthToken.id]: mockIcrcTokenPrice2,
				...expectedNullishExchangesIcrc
			});
		});

		it('should be case-sensitive for ICRC tokens', () => {
			exchangeStore.set([
				{ [mockCkBtcToken.ledgerCanisterId.toUpperCase()]: mockIcrcTokenPrice1 },
				{ [mockCkEthToken.ledgerCanisterId]: mockIcrcTokenPrice2 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedNullishExchangesNative,
				[mockCkBtcToken.id]: undefined,
				[mockCkEthToken.id]: mockIcrcTokenPrice2,
				...expectedNullishExchangesIcrc
			});
		});

		it('should not fallback to twin tokens for ICRC tokens when possible', () => {
			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[mockCkEthToken.id]: undefined,
				...expectedNullishExchangesIcrc
			});
		});

		it('should fallback to twin tokens for ICRC tokens when possible', () => {
			icrcDefaultTokensStore.set({
				data: { ...mockCkBtcToken, exchangeCoinId: 'bitcoin' },
				certified: false
			});
			icrcCustomTokensStore.set({
				data: { ...mockCkBtcToken, exchangeCoinId: 'bitcoin', enabled: true },
				certified: false
			});
			icrcDefaultTokensStore.set({
				data: { ...mockCkEthToken, exchangeCoinId: 'ethereum' },
				certified: false
			});
			icrcCustomTokensStore.set({
				data: { ...mockCkEthToken, exchangeCoinId: 'ethereum', enabled: true },
				certified: false
			});

			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[mockCkBtcToken.id]: btcPrice,
				[mockCkEthToken.id]: ethPrice,
				...expectedNullishExchangesIcrc
			});

			const mockErc20Token = {
				...mockCkEthToken,
				exchangeCoinId: 'ethereum',
				twinToken: USDC_TOKEN
			} as IcCkToken;

			icrcDefaultTokensStore.set({
				data: mockErc20Token,
				certified: false
			});
			icrcCustomTokensStore.set({
				data: { ...mockErc20Token, enabled: true },
				certified: false
			});

			const mockTwinTokenAddress = (mockErc20Token.twinToken as Partial<Erc20Token>).address;

			assertNonNullish(mockTwinTokenAddress);

			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice },
				{ [mockTwinTokenAddress]: mockErc20TokenPrice1 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[mockCkBtcToken.id]: btcPrice,
				[mockCkEthToken.id]: undefined,
				...expectedNullishExchangesIcrc
			});

			exchangeStore.set([
				{ ethereum: ethPrice },
				{ bitcoin: btcPrice },
				{ 'internet-computer': icpPrice },
				{ solana: solPrice },
				{ binancecoin: bnbPrice },
				{ 'polygon-ecosystem-token': polPrice },
				{ [mockTwinTokenAddress.toLowerCase()]: mockErc20TokenPrice1 }
			]);

			expect(get(exchanges)).toStrictEqual({
				...expectedExchanges,
				[mockCkBtcToken.id]: btcPrice,
				[mockCkEthToken.id]: mockErc20TokenPrice1,
				...expectedNullishExchangesIcrc
			});
		});
	});
});
