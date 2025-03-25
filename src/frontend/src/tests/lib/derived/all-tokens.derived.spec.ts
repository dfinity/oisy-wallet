import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import type { Erc20TokenToggleable } from '$eth/types/erc20-token-toggleable';
import { enabledIcrcTokens, icrcTokens } from '$icp/derived/icrc.derived';
import * as icrcCustomTokensServices from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appContants from '$lib/constants/app.constants';
import {
	allDisabledKongSwapCompatibleIcrcTokens,
	allKongSwapCompatibleIcrcTokens,
	allTokens
} from '$lib/derived/all-tokens.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
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

	const mockErc20Token: Erc20TokenToggleable = {
		...mockValidErc20Token,
		id: parseTokenId('DUM'),
		address: mockEthAddress,
		exchange: 'erc20',
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

		vi.spyOn(icrcCustomTokensServices, 'buildIcrcCustomTokens').mockReturnValue([]);

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

			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});

			vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockSplToken]);
				return () => {};
			});

			vi.spyOn(icrcCustomTokensServices, 'buildIcrcCustomTokens').mockReturnValue([mockIcrcToken2]);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				mockErc20Token.id.description,
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

			const disabledSplToken = { ...mockSplToken, enabled: false };
			vi.spyOn(splTokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledSplToken]);
				return () => {};
			});

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toContain(disabledErc20Token.id.description);
			expect(tokenSymbols).toContain(disabledSplToken.id.description);
		});

		it('should not include duplicate tokens with same ledger canister ID', () => {
			const duplicateToken = { ...mockIcrcToken, name: 'Duplicate Token' };
			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});
			vi.spyOn(icrcCustomTokensServices, 'buildIcrcCustomTokens').mockReturnValue([duplicateToken]);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols.filter((symbol) => symbol === mockIcrcToken.id.description).length).toBe(
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

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				BTC_TESTNET_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SEPOLIA_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				SOLANA_TESTNET_TOKEN.id.description,
				SOLANA_DEVNET_TOKEN.id.description
			]);
		});

		it('should include local tokens when testnets are enabled and it is local env', () => {
			setupTestnetsStore('enabled');
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => true);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toEqual([
				ICP_TOKEN.id.description,
				BTC_MAINNET_TOKEN.id.description,
				BTC_TESTNET_TOKEN.id.description,
				BTC_REGTEST_TOKEN.id.description,
				ETHEREUM_TOKEN.id.description,
				SEPOLIA_TOKEN.id.description,
				SOLANA_TOKEN.id.description,
				SOLANA_TESTNET_TOKEN.id.description,
				SOLANA_DEVNET_TOKEN.id.description,
				SOLANA_LOCAL_TOKEN.id.description
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
});
