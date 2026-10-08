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
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
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

		it('should filter the list based on ERC20 contract address', () => {
			const erc20TokenUi: TokenUi = mockValidErc20Token;
			const list: TokenUiOrGroupUi[] = [tokenUi, { token: erc20TokenUi }];
			const result = getFilteredTokenList({ filter: mockValidErc20Token.address, list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ token: erc20TokenUi });
		});

		it('should filter the list based on a partial, case-insensitive ERC20 contract address', () => {
			const erc20TokenUi: TokenUi = mockValidErc20Token;
			const list: TokenUiOrGroupUi[] = [tokenUi, { token: erc20TokenUi }];
			const result = getFilteredTokenList({
				filter: mockValidErc20Token.address.slice(0, 6).toLowerCase(),
				list
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ token: erc20TokenUi });
		});

		it('should filter the list based on SPL contract address', () => {
			const splTokenUi: TokenUi = mockValidSplToken;
			const list: TokenUiOrGroupUi[] = [tokenUi, { token: splTokenUi }];
			const result = getFilteredTokenList({ filter: mockValidSplToken.address, list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ token: splTokenUi });
		});

		it('should filter the list based on ICRC ledger canister id', () => {
			const icrcTokenUi: TokenUi = mockValidIcrcToken;
			const list: TokenUiOrGroupUi[] = [tokenUi, { token: icrcTokenUi }];
			const result = getFilteredTokenList({
				filter: mockValidIcrcToken.ledgerCanisterId,
				list
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ token: icrcTokenUi });
		});

		it('should filter a token group when one of its tokens matches by address', () => {
			const erc20TokenUi: TokenUi = mockValidErc20Token;
			const groupWithErc20: TokenUiGroup = {
				...tokenGroup,
				tokens: [...tokenGroup.tokens, erc20TokenUi]
			};
			const list: TokenUiOrGroupUi[] = [tokenUi, { group: groupWithErc20 }];
			const result = getFilteredTokenList({ filter: mockValidErc20Token.address, list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ group: groupWithErc20 });
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

		it('should return tokens matching the filter by ERC20 contract address', () => {
			const erc20TokenUi: TokenUi = mockValidErc20Token;
			const list: TokenUi[] = [token1, token2, erc20TokenUi];
			const result = getFilteredTokenGroup({ filter: mockValidErc20Token.address, list });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(erc20TokenUi);
		});
	});

	describe('getDisabledOrModifiedTokens', () => {
		vi.mock(import('$lib/utils/network.utils'), async (importOriginal) => {
			const actual = await importOriginal();
			return {
				...actual,
				showTokenFilteredBySelectedNetwork: vi.fn()
			};
		});

		const dummyNetwork: Network = ICP_NETWORK;

		const emptyTokensMap = new SvelteMap<TokenId, Token>();

		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('returns an empty array when no tokens are provided', () => {
			const result = getDisabledOrModifiedTokens({
				tokens: [],
				modifiedTokens: emptyTokensMap
			});

			expect(result).toEqual([]);
		});

		it('returns enabled but modified tokens', () => {
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
				tokens: [token],
				modifiedTokens
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
				tokens: [token],
				modifiedTokens: emptyTokensMap
			});

			expect(result).toEqual([]);
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
				tokens,
				modifiedTokens
			});

			expect(result.map((r) => (!isTokenUiGroup(r) ? r.token.id : undefined))).toEqual([
				tokens[0].id,
				tokens[1].id
			]);
		});
	});
});
