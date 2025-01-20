import * as btcEnv from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import * as solEnv from '$env/networks/networks.sol.env';
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
import { icrcTokens } from '$icp/derived/icrc.derived';
import * as icrcCustomTokensServices from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appContants from '$lib/constants/app.constants';
import { allTokens } from '$lib/derived/all-tokens.derived';
import { testnetsStore } from '$lib/stores/settings.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
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
		...mockValidToken,
		id: parseTokenId('DUM'),
		address: mockEthAddress,
		exchange: 'erc20',
		enabled: false
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => true);
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
				fn([]);
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
				mockIcrcToken.id.description
			]);
		});

		it('should also include disabled ERC20 tokens', () => {
			const disabledErc20Token = { ...mockErc20Token, enabled: false };
			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([disabledErc20Token]);
				return () => {};
			});

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toContain(disabledErc20Token.id.description);
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
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

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
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });
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
});
