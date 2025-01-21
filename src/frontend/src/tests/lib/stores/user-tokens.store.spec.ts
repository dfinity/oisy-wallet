import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	initCertifiedUserTokensStore,
	type CertifiedUserTokensStore
} from '$lib/stores/user-tokens.store';
import type { CertifiedData } from '$lib/types/store';
import type { Token } from '$lib/types/token';
import type { UserToken } from '$lib/types/user-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { get } from 'svelte/store';

describe('user-token.store', () => {
	const certified = false;
	const enabled = true;

	describe('initCertifiedUserTokensStore', () => {
		let mockStore: CertifiedUserTokensStore<Token>;

		beforeEach(() => {
			mockStore = initCertifiedUserTokensStore<Token>();
		});

		describe('setAll', () => {
			it('should set all tokens correctly', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);

				expect(get(mockStore)).toEqual(mockTokens);
			});

			it('should add new tokens', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);

				const otherTokens = [SOLANA_TOKEN];
				const otherMockTokens = otherTokens.map((token) => ({
					data: { ...token, enabled: false },
					certified
				}));
				mockStore.setAll(otherMockTokens);

				const expectedResults = [...mockTokens, ...otherMockTokens];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should update existing tokens', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);

				const otherTokens = [BTC_MAINNET_TOKEN];
				const otherMockTokens = otherTokens.map((token) => ({
					data: { ...token, enabled: false },
					certified
				}));
				mockStore.setAll(otherMockTokens);

				const expectedResults = [...mockTokens.slice(1), ...otherMockTokens];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should add new tokens without duplicating them', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);

				const otherTokens = [BTC_MAINNET_TOKEN, SOLANA_TOKEN];
				const otherMockTokens = otherTokens.map((token) => ({
					data: { ...token, enabled: false },
					certified
				}));
				mockStore.setAll(otherMockTokens);

				const expectedResults = [...mockTokens.slice(1), ...otherMockTokens];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should use the token address as identifier for ERC20 tokens', () => {
				mockStore.setAll([{ data: { ...USDC_TOKEN, enabled }, certified }]);
				const erc20Token2 = { ...PEPE_TOKEN, address: USDC_TOKEN.address };
				mockStore.setAll([{ data: { ...erc20Token2, enabled }, certified }]);

				const expectedResults = [
					{ data: { ...erc20Token2, enabled, id: USDC_TOKEN.id }, certified }
				];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should use the token address as identifier for SPL tokens', () => {
				mockStore.setAll([{ data: { ...BONK_TOKEN, enabled }, certified }]);
				const erc20Token2 = { ...TRUMP_TOKEN, address: BONK_TOKEN.address };
				mockStore.setAll([{ data: { ...erc20Token2, enabled }, certified }]);

				const expectedResults = [
					{ data: { ...erc20Token2, enabled, id: BONK_TOKEN.id }, certified }
				];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			// TODO: solve this test
			it('should duplicate a token if it is already given as duplicate', () => {
				const tokens = [BTC_MAINNET_TOKEN, BTC_MAINNET_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);

				expect(get(mockStore)).toEqual(mockTokens);
			});
		});

		describe('reset', () => {
			let mockTokens: CertifiedData<UserToken<Token>>[];

			beforeEach(() => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);
			});

			it('should remove a token given its ID', () => {
				mockStore.reset(mockTokens[0].data.id);

				expect(get(mockStore)).toEqual(mockTokens.slice(1));
			});

			it('should do nothing if the token does not exist', () => {
				mockStore.reset(parseTokenId('non-existing-token-id'));

				expect(get(mockStore)).toEqual(mockTokens);
			});

			it('should return an empty array if all tokens are removed', () => {
				mockTokens.forEach(({ data: { id } }) => {
					mockStore.reset(id);
				});

				expect(get(mockStore)).toEqual([]);
			});
		});

		describe('resetAll', () => {
			beforeEach(() => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				const mockTokens = tokens.map((token) => ({
					data: { ...token, enabled },
					certified
				}));
				mockStore.setAll(mockTokens);
			});

			it('should remove all tokens', () => {
				mockStore.resetAll();

				expect(get(mockStore)).toBeNull();
			});

			it('should do nothing if there are no tokens', () => {
				mockStore.resetAll();
				mockStore.resetAll();

				expect(get(mockStore)).toBeNull();
			});
		});
	});
});
