import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { Erc20TokenToggleable } from '$eth/types/erc20-token-toggleable';
import { icrcTokens } from '$icp/derived/icrc.derived';
import * as icrcCustomTokensServices from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { allTokens } from '$lib/derived/all-tokens.derived';
import { parseTokenId } from '$lib/validation/token.validation';
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

		// Mock the store subscriptions with empty arrays by default
		vi.spyOn(enabledBitcoinTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});

		vi.spyOn(icrcCustomTokensServices, 'buildIcrcCustomTokens').mockReturnValue([]);

		vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
			fn([]);
			return () => {};
		});
	});

	describe('allTokens', () => {
		it('should merge all tokens into a single array', () => {
			vi.spyOn(enabledBitcoinTokens, 'subscribe').mockImplementation((fn) => {
				fn([BTC_MAINNET_TOKEN]);
				return () => {};
			});

			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([ETHEREUM_TOKEN]);
				return () => {};
			});

			vi.spyOn(erc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc20Token]);
				return () => {};
			});

			vi.spyOn(icrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcToken]);
				return () => {};
			});

			vi.spyOn(icrcCustomTokensServices, 'buildIcrcCustomTokens').mockReturnValue([mockIcrcToken2]);

			const tokens = get(allTokens);
			const tokenSymbols = tokens.map((token) => token.id.description);

			expect(tokenSymbols).toContain('STK');
			expect(tokenSymbols).toContain(ICP_TOKEN.id.description);
			expect(tokenSymbols).toContain(BTC_MAINNET_TOKEN.id.description);
			expect(tokenSymbols).toContain(ETHEREUM_TOKEN.id.description);
			expect(tokenSymbols).toContain(mockErc20Token.id.description);
			expect(tokenSymbols).toContain(mockIcrcToken.id.description);
			expect(tokenSymbols).toContain(mockIcrcToken2.id.description);
			expect(tokenSymbols.length).toEqual(6);
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
	});
});
