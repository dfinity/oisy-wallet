import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ETH_TOKEN_GROUP, ETH_TOKEN_GROUP_ID } from '$env/tokens/groups/groups.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Network } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { showTokenFilteredBySelectedNetwork } from '$lib/utils/network.utils';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import {
	getDisabledOrModifiedTokens,
	getFilteredTokenGroup,
	getFilteredTokenList
} from '$lib/utils/token-list.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { SvelteMap } from 'svelte/reactivity';

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

	describe('getDisabledOrModifiedTokens', () => {
		vi.mock('$lib/utils/network.utils.ts', () => ({
			showTokenFilteredBySelectedNetwork: vi.fn()
		}));

		const dummyNetwork: Network = ICP_NETWORK;

		const emptyTokensMap = new SvelteMap<TokenId, Token>();

		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('returns an empty array when no tokens are provided', () => {
			const result = getDisabledOrModifiedTokens({
				$allTokens: [],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([]);
		});

		it('returns only disabled tokens that pass the network filter', () => {
			const token = {
				...ICP_TOKEN,
				enabled: false
			} as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [token],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([{ token }]);
		});

		it('excludes disabled tokens that fail the network filter', () => {
			const token = {
				...ICP_TOKEN,
				enabled: false
			} as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(false);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [token],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([]);
		});

		it('returns enabled but modified tokens that pass the network filter', () => {
			const token = {
				...ICP_TOKEN,
				id: parseTokenId('2'),
				network: dummyNetwork,
				enabled: true
			} as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const modifiedTokens = new SvelteMap<TokenId, Token>();
			modifiedTokens.set(token.id, token);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [token],
				modifiedTokens,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([{ token }]);
		});

		it('excludes enabled and unmodified tokens', () => {
			const token = {
				...ICP_TOKEN,
				enabled: true
			} as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [token],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([]);
		});

		it('handles nullish selectedNetwork (pseudo network case)', () => {
			const token = {
				...ICP_TOKEN,
				enabled: false
			} as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [token],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: undefined
			});

			expect(result).toEqual([{ token }]);
		});

		it('returns multiple matching tokens', () => {
			const tokens = [
				{
					...ICP_TOKEN,
					id: parseTokenId('a'),
					network: dummyNetwork,
					enabled: false
				} as TokenToggleable<Token>,
				{
					...ICP_TOKEN,
					id: parseTokenId('b'),
					network: dummyNetwork,
					enabled: true
				} as TokenToggleable<Token>,
				{
					...ICP_TOKEN,
					id: parseTokenId('c'),
					network: dummyNetwork,
					enabled: true
				} as TokenToggleable<Token>
			];

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const modifiedTokens = new SvelteMap<TokenId, Token>();
			modifiedTokens.set(tokens[1].id, tokens[1]);

			const result = getDisabledOrModifiedTokens({
				$allTokens: tokens,
				modifiedTokens,
				selectedNetwork: dummyNetwork
			});

			expect(result.map((r) => (!isTokenUiGroup(r) ? r.token.id : undefined))).toEqual([
				tokens[0].id,
				tokens[1].id
			]);
		});

		it('gracefully handles null/undefined $allTokens', () => {
			const result = getDisabledOrModifiedTokens({
				$allTokens: null as unknown as TokenToggleable<Token>[],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: dummyNetwork
			});

			expect(result).toEqual([]);
		});

		it('excludes non-fungible tokens when includeNonFungibleTokens is false', () => {
			const nftToken = {
				...ICP_TOKEN,
				id: parseTokenId('nft1'),
				standard: 'erc721',
				enabled: false
			} as unknown as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [nftToken],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: ICP_NETWORK,
				includeNonFungibleTokens: false
			});

			expect(result).toEqual([]); // NFT excluded
		});

		it('includes non-fungible tokens when includeNonFungibleTokens is true', () => {
			const nftToken = {
				...ICP_TOKEN,
				id: parseTokenId('nft2'),
				standard: 'ERC721',
				enabled: false
			} as unknown as TokenToggleable<Token>;

			vi.mocked(showTokenFilteredBySelectedNetwork).mockReturnValue(true);

			const result = getDisabledOrModifiedTokens({
				$allTokens: [nftToken],
				modifiedTokens: emptyTokensMap,
				selectedNetwork: ICP_NETWORK,
				includeNonFungibleTokens: true
			});

			expect(result).toEqual([{ token: nftToken }]); // NFT included
		});
	});
});
