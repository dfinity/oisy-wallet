import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import { getFilteredTokenGroup, getFilteredTokenList } from '$lib/utils/token-list.utils';
import { describe, expect, it } from 'vitest';
import type { BRAND } from 'zod';

// Mock data for tokens
const token1: TokenUi = {
	id: 'btc' as unknown as symbol & BRAND<'TokenId'>,
	network: BTC_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Bitcoin',
	symbol: 'BTC',
	decimals: 8,
	icon: ''
};

const token2: TokenUi = {
	id: 'eth' as unknown as symbol & BRAND<'TokenId'>,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Ethereum',
	symbol: 'ETH',
	decimals: 18,
	icon: ''
};

const token3: TokenUi = {
	id: 'sol' as unknown as symbol & BRAND<'TokenId'>,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'custom',
	name: 'Solana',
	symbol: 'SOL',
	decimals: 9,
	icon: ''
};

const tokenGroup: TokenUiGroup = {
	id: 'group1' as unknown as symbol & BRAND<'TokenId'>,
	nativeToken: token1,
	tokens: [token2, token3]
};

const tokenGroupUi: TokenUiOrGroupUi = { group: tokenGroup };
const tokenUi: TokenUiOrGroupUi = { token: token1 };

describe('Token List Utils', () => {
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
