import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import {
	ARBITRUM_ETH_TOKEN,
	ARBITRUM_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_TESTNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	POL_AMOY_TOKEN,
	POL_MAINNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import * as tokensIcEnv from '$env/tokens/tokens.ic.env';
import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { erc721Tokens } from '$eth/derived/erc721.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { Erc20TokenToggleable } from '$eth/types/erc20-token-toggleable';
import type { Erc721TokenToggleable } from '$eth/types/erc721-token-toggleable';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { enabledIcrcTokens, icrcTokens } from '$icp/derived/icrc.derived';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appContants from '$lib/constants/app.constants';
import {
	allCrossChainSwapTokens,
	allDisabledKongSwapCompatibleIcrcTokens,
	allKongSwapCompatibleIcrcTokens,
	allTokens
} from '$lib/derived/all-tokens.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('all-tokens.derived', () => {
	const mockIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		enabled: true
	};

	const mockIcrcToken2: IcrcCustomToken = {
		...mockValidIcCkToken,
		id: parseTokenId('STK'),
		ledgerCanisterId: 'mock-ledger-canister-id',
		name: 'other-dummy-token',
		enabled: true
	};

	const mockDip20Token: IcrcCustomToken = {
		...mockValidIcCkToken,
		standard: 'dip20',
		id: parseTokenId('XTC'),
		symbol: 'XTC',
		ledgerCanisterId: 'mock-ledger-canister-id',
		name: 'dummy-dip20-token',
		enabled: true
	};

	const mockErc20Token: Erc20TokenToggleable = {
		...mockValidErc20Token,
		id: parseTokenId('DUM'),
		address: mockEthAddress,
		exchange: 'erc20',
		enabled: false
	};

	const mockErc721Token: Erc721TokenToggleable = {
		...mockValidErc721Token,
		id: parseTokenId('KUM'),
		address: mockEthAddress,
		enabled: false
	};

	const mockSplToken: SplTokenToggleable = {
		...mockValidSplToken,
		enabled: true
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);

		// Mock the store subscriptions with empty arrays by default
		vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		// Mock the store subscriptions with empty arrays by default
		vi.spyOn(erc721Tokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => []);

		vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});
	});

	describe('allTokens', () => {
		it('should merge all tokens into a single array', () => {
			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc20Token]);
				return () => {};
			});

			vi.spyOn(erc721Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc721Token]);
				return () => {};
			});

			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});

			vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockSplToken]);
				return () => {};
			});

			vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => [
				mockIcrcToken2,
				mockDip20Token
			]);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				BASE_ETH_TOKEN.id.description,
				BNB_MAINNET_TOKEN.id.description,
				POL_MAINNET_TOKEN.id.description,
				ARBITRUM_ETH_TOKEN.id.description,
				mockErc20Token.id.description,
				mockErc721Token.id.description,
				mockDip20Token.id.description,
				mockIcrcToken2.id.description,
				mockIcrcToken.id.description,
				mockSplToken.id.description
			]);
		});

		it('should also include disabled tokens', () => {
			const disabledErc20Token = { ...mockErc20Token, enabled: false };
			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledErc20Token]);
				return () => {};
			});

			const disabledErc721Token = { ...mockErc721Token, enabled: false };
			vi.spyOn(erc721Tokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledErc721Token]);
				return () => {};
			});

			const disabledSplToken = { ...mockSplToken, enabled: false };
			vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledSplToken]);
				return () => {};
			});

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toContain(disabledErc20Token.id.description);
			expect(tokenSymbols).toContain(disabledErc721Token.id.description);
			expect(tokenSymbols).toContain(disabledSplToken.id.description);
		});

		it('should not include duplicate tokens with same ledger canister ID', () => {
			const duplicateToken = { ...mockIcrcToken, name: 'Duplicate Token' };
			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});
			vi.spyOn(tokensIcEnv, 'IC_BUILTIN_TOKENS', 'get').mockImplementation(() => [duplicateToken]);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols.filter((symbol) => symbol === mockIcrcToken.id.description)).toHaveLength(
				1
			);
		});

		it('should preserve token properties in the merged result', () => {
			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});

			const tokens = get(allTokens);
			const testToken = tokens.find(
				(token) => token.id.description === mockIcrcToken.id.description
			);

			expect(testToken).toMatchObject(mockIcrcToken);
		});

		it('should include testnet tokens when testnets are enabled', () => {
			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				TESTICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				BTC_TESTNET_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SEPOLIA_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				SOLANA_DEVNET_TOKEN.id.description,
				BASE_ETH_TOKEN.id.description,
				BASE_SEPOLIA_ETH_TOKEN.id.description,
				BNB_MAINNET_TOKEN.id.description,
				BNB_TESTNET_TOKEN.id.description,
				POL_MAINNET_TOKEN.id.description,
				POL_AMOY_TOKEN.id.description,
				ARBITRUM_ETH_TOKEN.id.description,
				ARBITRUM_SEPOLIA_ETH_TOKEN.id.description
			]);
		});

		it('should include local tokens when testnets are enabled and it is local env', () => {
			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				TESTICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				BTC_TESTNET_TOKEN.id.description,
				BTC_REGTEST_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SEPOLIA_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				SOLANA_DEVNET_TOKEN.id.description,
				SOLANA_LOCAL_TOKEN.id.description,
				BASE_ETH_TOKEN.id.description,
				BASE_SEPOLIA_ETH_TOKEN.id.description,
				BNB_MAINNET_TOKEN.id.description,
				BNB_TESTNET_TOKEN.id.description,
				POL_MAINNET_TOKEN.id.description,
				POL_AMOY_TOKEN.id.description,
				ARBITRUM_ETH_TOKEN.id.description,
				ARBITRUM_SEPOLIA_ETH_TOKEN.id.description
			]);
		});
	});

	describe('allDisabledKongSwapCompatibleIcrcTokens', () => {
		beforeEach(() => {
			vi.spyOn(allKongSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});
			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});
		});

		it('correctly sets store if there are some disabled kong-compatible icrc tokens', () => {
			vi.spyOn(allKongSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken, mockIcrcToken2]);
				return () => {};
			});
			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken2]);
				return () => {};
			});

			expect(get(allDisabledKongSwapCompatibleIcrcTokens)).toStrictEqual([mockIcrcToken]);
		});

		it('correctly sets store if all icrc tokens are enabled', () => {
			vi.spyOn(allKongSwapCompatibleIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken, mockIcrcToken2]);
				return () => {};
			});
			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken, mockIcrcToken2]);
				return () => {};
			});

			expect(get(allDisabledKongSwapCompatibleIcrcTokens)).toStrictEqual([]);
		});

		it('correctly sets store if there are no kong-compatible tokens', () => {
			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken, mockIcrcToken2]);
				return () => {};
			});

			expect(get(allDisabledKongSwapCompatibleIcrcTokens)).toStrictEqual([]);
		});
	});

	describe('allCrossChainSwapTokens', () => {
		const mockErc20Token: Erc20TokenToggleable = {
			...mockValidErc20Token,
			id: parseTokenId('MOCK'),
			address: mockEthAddress,
			enabled: false
		};

		beforeEach(() => {
			vi.resetAllMocks();

			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});

			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});

			vi.spyOn(enabledEvmTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});
		});

		it('should return empty array when all stores are empty', () => {
			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([]);
		});

		it('should include enabled Ethereum tokens with enabled: true', () => {
			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([ETHEREUM_TOKEN, SEPOLIA_TOKEN]);
				return () => {};
			});

			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([
				{ ...ETHEREUM_TOKEN, enabled: true },
				{ ...SEPOLIA_TOKEN, enabled: true }
			]);
		});

		it('should include enabled EVM tokens with enabled: true', () => {
			const mockEvmToken = { ...ETHEREUM_TOKEN, id: parseTokenId('BASE_ETH') };

			vi.spyOn(enabledEvmTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockEvmToken]);
				return () => {};
			});

			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([{ ...mockEvmToken, enabled: true }]);
		});

		it('should include ERC20 tokens with enabled: true', () => {
			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc20Token]);
				return () => {};
			});

			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([{ ...mockErc20Token, enabled: true }]);
		});

		it('should set enabled: true for all tokens regardless of original enabled state', () => {
			const disabledErc20Token = { ...mockErc20Token, enabled: false };

			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledErc20Token]);
				return () => {};
			});

			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([{ ...disabledErc20Token, enabled: true }]);
		});

		it('should handle multiple tokens of the same type', () => {
			const mockErc20Token2 = {
				...mockErc20Token,
				id: parseTokenId('MOCK2'),
				symbol: 'MOCK2'
			};

			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc20Token, mockErc20Token2]);
				return () => {};
			});

			const result = get(allCrossChainSwapTokens);

			expect(result).toEqual([
				{ ...mockErc20Token, enabled: true },
				{ ...mockErc20Token2, enabled: true }
			]);
		});
	});
});
