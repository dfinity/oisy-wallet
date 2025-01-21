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
