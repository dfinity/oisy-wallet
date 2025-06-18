import { ETH_TOKEN_GROUP, ETH_TOKEN_GROUP_ID } from '$env/tokens/groups/groups.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import { getFilteredTokenGroup, getFilteredTokenList } from '$lib/utils/token-list.utils';
import { describe, expect, it } from 'vitest';

// Mock data for tokens
const token1: TokenUi = BTC_MAINNET_TOKEN;

const token2: TokenUi = ETHEREUM_TOKEN;

const token3: TokenUi = SOLANA_TOKEN;

const tokenGroup: TokenUiGroup = {
	id: ETH_TOKEN_GROUP_ID,
	decimals: token1.decimals,
	groupData: ETH_TOKEN_GROUP,
	tokens: [token2, token3]
};

const tokenGroupUi: TokenUiOrGroupUi = { group: tokenGroup };
const tokenUi: TokenUiOrGroupUi = { token: token1 };

describe('token-list.utils', () => {
	describe('getFilteredTokenList', () => {
		it('should return all tokens when filter is an empty string', () => {
			const list: TokenUiOrGroupUi[] = [tokenUi, tokenGroupUi];
			const result = getFilteredTokenList({ filter: '', list });

			expect(result).toHaveLength(2);
		});

		it('should filter the list based on token name', () => {
			const list: TokenUiOrGroupUi[] = [tokenUi, tokenGroupUi];
			const result = getFilteredTokenList({ filter: 'Bitcoin', list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(tokenUi);
		});

		it('should filter the list based on token symbol', () => {
			const list: TokenUiOrGroupUi[] = [tokenUi, tokenGroupUi];
			const result = getFilteredTokenList({ filter: 'ETH', list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(tokenGroupUi);
		});

		it('should return empty array if no token matches filter', () => {
			const list: TokenUiOrGroupUi[] = [tokenUi, tokenGroupUi];
			const result = getFilteredTokenList({ filter: 'Dogecoin', list });

			expect(result).toHaveLength(0);
		});

		it('should return empty array if no tokens in the list', () => {
			const result = getFilteredTokenList({ filter: 'Bitcoin', list: [] });

			expect(result).toHaveLength(0);
		});
	});

	describe('getFilteredTokenGroup', () => {
		it('should return tokens that match the filter', () => {
			const list: TokenUi[] = [token1, token2, token3];
			const result = getFilteredTokenGroup({ filter: 'ETH', list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(token2);
		});

		it('should return an empty array if no tokens match the filter', () => {
			const list: TokenUi[] = [token1, token2, token3];
			const result = getFilteredTokenGroup({ filter: 'XRP', list });

			expect(result).toHaveLength(0);
		});

		it('should return empty array if no tokens in the list', () => {
			const result = getFilteredTokenGroup({ filter: 'Bitcoin', list: [] });

			expect(result).toHaveLength(0);
		});
	});
});
