import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as appConstants from '$lib/constants/app.constants';
import { pageToken, pageTokenStandard, pageTokenToggleable } from '$lib/derived/page-token.derived';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { get } from 'svelte/store';

describe('page-token.derived', () => {
	describe('pageToken', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			mockPage.reset();

			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([{ ...JUP_TOKEN, enabled: true }]);
				return () => {};
			});
		});

		it('should return undefined when no token in route', () => {
			expect(get(pageToken)).toBeUndefined();
		});

		it.each([ICP_TOKEN, BTC_MAINNET_TOKEN, SOLANA_TOKEN, ETHEREUM_TOKEN])(
			'should find $name token',
			(token) => {
				mockPage.mock({ token: token.name, network: token.network.id.description });

				expect(get(pageToken)).toBe(token);
			}
		);

		it.each([BTC_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN, SEPOLIA_TOKEN])(
			'should find $name token',
			(token) => {
				vi.spyOn(testnetsEnabled, 'subscribe').mockImplementation((fn) => {
					fn(true);
					return () => {};
				});

				mockPage.mock({ token: token.name, network: token.network.id.description });

				expect(get(pageToken)).toBe(token);
			}
		);

		it.each([BTC_REGTEST_TOKEN, SOLANA_LOCAL_TOKEN])('should find $name token', (token) => {
			vi.spyOn(testnetsEnabled, 'subscribe').mockImplementation((fn) => {
				fn(true);
				return () => {};
			});
			vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

			mockPage.mock({ token: token.name, network: token.network.id.description });

			expect(get(pageToken)).toBe(token);
		});

		it('should find ERC20 token', () => {
			const mockToken = { ...mockValidErc20Token, enabled: true };
			erc20UserTokensStore.setAll([{ data: mockToken, certified: true }]);
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
		});

		it('should find ICRC token', () => {
			const mockToken = { ...mockIcrcCustomToken, enabled: true };
			icrcCustomTokensStore.setAll([{ data: mockToken, certified: true }]);
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
		});

		it('should find SPL token', () => {
			const mockToken = JUP_TOKEN;
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
		});

		it('should return undefined when token is not found in any list', () => {
			mockPage.mock({ token: 'non-existent-token' });

			expect(get(pageToken)).toBeUndefined();
		});

		it('should return undefined when token name matches but network does not', () => {
			const mockToken = { ...mockValidErc20Token, enabled: true };
			mockPage.mock({ token: mockToken.name, network: 'non-existent-network' });

			expect(get(pageToken)).toBeUndefined();
		});

		it('should return undefined when token network matches but name does not', () => {
			const mockToken = { ...mockValidErc20Token, enabled: true };
			mockPage.mock({ token: 'non-existent-token', network: mockToken.network.name });

			expect(get(pageToken)).toBeUndefined();
		});
	});

	describe('pageTokenStandard', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			mockPage.reset();

			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([{ ...JUP_TOKEN, enabled: true }]);
				return () => {};
			});
		});

		it('should return undefined when page token is undefined', () => {
			expect(get(pageTokenStandard)).toBeUndefined();

			mockPage.mock({ token: 'non-existent-token' });

			expect(get(pageToken)).toBeUndefined();

			mockPage.mock({ token: mockValidErc20Token.name, network: 'non-existent-network' });

			expect(get(pageToken)).toBeUndefined();

			mockPage.mock({ token: 'non-existent-token', network: mockValidErc20Token.network.name });

			expect(get(pageToken)).toBeUndefined();
		});

		it.each([ICP_TOKEN, BTC_MAINNET_TOKEN, SOLANA_TOKEN, ETHEREUM_TOKEN])(
			'should return the standard for $name token',
			(token) => {
				mockPage.mock({ token: token.name, network: token.network.id.description });

				expect(get(pageTokenStandard)).toBe(token.standard);
			}
		);

		it.each([BTC_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN, SEPOLIA_TOKEN])(
			'should return the standard for $name token',
			(token) => {
				vi.spyOn(testnetsEnabled, 'subscribe').mockImplementation((fn) => {
					fn(true);
					return () => {};
				});

				mockPage.mock({ token: token.name, network: token.network.id.description });

				expect(get(pageTokenStandard)).toBe(token.standard);
			}
		);

		it.each([BTC_REGTEST_TOKEN, SOLANA_LOCAL_TOKEN])(
			'should return the standard for $name token',
			(token) => {
				vi.spyOn(testnetsEnabled, 'subscribe').mockImplementation((fn) => {
					fn(true);
					return () => {};
				});
				vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

				mockPage.mock({ token: token.name, network: token.network.id.description });

				expect(get(pageTokenStandard)).toBe(token.standard);
			}
		);

		it('should return the standard for ERC20 token', () => {
			const mockToken = { ...mockValidErc20Token, enabled: true };
			erc20UserTokensStore.setAll([{ data: mockToken, certified: true }]);
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageTokenStandard)).toBe(mockToken.standard);
		});

		it('should return the standard for ICRC token', () => {
			const mockToken = { ...mockIcrcCustomToken, enabled: true };
			icrcCustomTokensStore.setAll([{ data: mockToken, certified: true }]);
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageTokenStandard)).toBe(mockToken.standard);
		});

		it('should return the standard for SPL token', () => {
			const mockToken = JUP_TOKEN;
			mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

			expect(get(pageTokenStandard)).toBe(mockToken.standard);
		});
	});

	describe('pageTokenToggleable', () => {
		const mockErc20UserToken: Erc20UserToken = {
			...mockValidErc20Token,
			id: parseTokenId('ERC20UserTokenId'),
			symbol: 'EUTK',
			address: `${mockValidErc20Token.address}2`,
			version: undefined,
			enabled: true
		};

		const mockIcrcCustomToken: IcrcCustomToken = {
			...mockValidIcToken,
			ledgerCanisterId: `${mockValidIcToken.ledgerCanisterId}2`,
			version: 1n,
			enabled: true
		};

		beforeEach(() => {
			vi.resetAllMocks();

			mockPage.reset();
		});

		it('should return false for nullish token', () => {
			expect(get(pageTokenToggleable)).toBeFalsy();
		});

		it('should return true if default ERC20 user token is toggleable', () => {
			vi.spyOn(enabledErc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockErc20UserToken]);
				return () => {};
			});

			mockPage.mockToken(mockErc20UserToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return true if custom ERC20 user token is toggleable', () => {
			const mockToken = { ...mockErc20UserToken, category: 'custom' as const };

			vi.spyOn(enabledErc20Tokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return false if default Ethereum user token is toggleable', () => {
			const mockToken = {
				...mockErc20UserToken,
				standard: 'ethereum' as const
			} as RequiredTokenWithLinkedData;

			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeFalsy();
		});

		it('should return true if custom Ethereum user token is toggleable', () => {
			const mockToken = {
				...mockErc20UserToken,
				category: 'custom' as const,
				standard: 'ethereum' as const
			} as RequiredTokenWithLinkedData;

			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return false if ICRC default token is toggleable', () => {
			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockIcrcCustomToken]);
				return () => {};
			});

			mockPage.mockToken(mockIcrcCustomToken);

			expect(get(pageTokenToggleable)).toBeFalsy();
		});

		it('should return true if ICRC custom token is toggleable', () => {
			const mockToken = { ...mockIcrcCustomToken, category: 'custom' as const };

			vi.spyOn(enabledIcrcTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return false if BTC token is toggleable', () => {
			mockPage.mockToken(BTC_MAINNET_TOKEN);

			expect(get(pageTokenToggleable)).toBeFalsy();
		});

		it('should return false if Sepolia token is toggleable', () => {
			mockPage.mockToken(SEPOLIA_TOKEN);

			expect(get(pageTokenToggleable)).toBeFalsy();
		});

		it('should return true if BONK token is toggleable', () => {
			const mockToken = { ...BONK_TOKEN, enabled: true };

			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return true if TRUMP token is toggleable', () => {
			const mockToken = { ...TRUMP_TOKEN, enabled: true };

			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return true if TRUMP token is toggleable but not enabled', () => {
			const mockToken = { ...TRUMP_TOKEN, enabled: false };

			vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
				fn([mockToken]);
				return () => {};
			});

			mockPage.mockToken(mockToken);

			expect(get(pageTokenToggleable)).toBeTruthy();
		});

		it('should return false if Solana token is toggleable', () => {
			mockPage.mockToken({ ...SOLANA_TOKEN, enabled: true } as SplCustomToken);

			expect(get(pageTokenToggleable)).toBeFalsy();
		});
	});
});
