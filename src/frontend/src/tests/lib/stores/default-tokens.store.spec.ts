import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { initDefaultTokensStore, type DefaultTokensStore } from '$lib/stores/default-tokens.store';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidExtV2Token, mockValidExtV2Token2 } from '$tests/mocks/ext-tokens.mock';
import { get } from 'svelte/store';

describe('default-tokens.store', () => {
	describe('initDefaultTokensStore', () => {
		let mockStore: DefaultTokensStore<Token>;

		beforeEach(() => {
			mockStore = initDefaultTokensStore<Token>();
		});

		describe('add', () => {
			it('should set the token if there are no tokens', () => {
				mockStore.add(BTC_MAINNET_TOKEN);

				expect(get(mockStore)).toEqual([BTC_MAINNET_TOKEN]);
			});

			it('should add new tokens to existing ones', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				tokens.forEach((token) => {
					mockStore.add(token);
				});

				expect(get(mockStore)).toEqual(tokens);
			});

			it('should update existing tokens', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				tokens.forEach((token) => {
					mockStore.add(token);
				});

				const newToken = { ...ICP_TOKEN, name: 'mock-name' };
				mockStore.add(newToken);

				const expectedResults = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, SOLANA_TOKEN, newToken];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should add new tokens without duplicating them', () => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				tokens.forEach((token) => {
					mockStore.add(token);
				});

				mockStore.add(BTC_MAINNET_TOKEN);

				const expectedResults = [ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN, BTC_MAINNET_TOKEN];

				expect(get(mockStore)).toEqual(expectedResults);
			});

			it('should use the token address as identifier for ERC20 tokens', () => {
				mockStore.add(USDC_TOKEN);
				const mockErc20Token = { ...PEPE_TOKEN, address: USDC_TOKEN.address };
				mockStore.add(mockErc20Token);

				expect(get(mockStore)).toEqual([mockErc20Token]);
			});

			it('should use the token address as identifier for SPL tokens', () => {
				mockStore.add(BONK_TOKEN);
				const mockSplToken = { ...TRUMP_TOKEN, address: BONK_TOKEN.address };
				mockStore.add(mockSplToken);

				expect(get(mockStore)).toEqual([mockSplToken]);
			});

			it('should use the canister ID as identifier for EXT tokens', () => {
				mockStore.add(mockValidExtV2Token);
				const mockExtToken = {
					...mockValidExtV2Token2,
					canisterId: mockValidExtV2Token.canisterId
				};
				mockStore.add(mockExtToken);

				expect(get(mockStore)).toEqual([mockExtToken]);
			});
		});

		describe('remove', () => {
			let tokens: Token[];

			beforeEach(() => {
				tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				mockStore.set(tokens);
			});

			it('should remove a token given its ID', () => {
				mockStore.remove(tokens[0].id);

				expect(get(mockStore)).toEqual(tokens.slice(1));
			});

			it('should do nothing if the token does not exist', () => {
				mockStore.remove(parseTokenId('non-existing-token-id'));

				expect(get(mockStore)).toEqual(tokens);
			});

			it('should return an empty array if all tokens are removed', () => {
				tokens.forEach(({ id }) => {
					mockStore.remove(id);
				});

				expect(get(mockStore)).toEqual([]);
			});
		});

		describe('reset', () => {
			beforeEach(() => {
				const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];
				mockStore.set(tokens);
			});

			it('should remove all tokens', () => {
				mockStore.reset();

				expect(get(mockStore)).toBeUndefined();
			});

			it('should do nothing if there are no tokens', () => {
				mockStore.reset();
				mockStore.reset();

				expect(get(mockStore)).toBeUndefined();
			});
		});
	});
});
