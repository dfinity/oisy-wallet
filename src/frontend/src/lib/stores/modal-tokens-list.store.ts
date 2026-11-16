import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { networks } from '$lib/derived/networks.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { tokensToPin } from '$lib/derived/tokens.derived';
import type { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { balancesStore } from '$lib/stores/balances.store';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { filterTokensForSelectedNetworks } from '$lib/utils/network.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import { filterTokens, filterTokensByNft, sortTokens } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface ModalTokensListData {
	tokens: Token[];
	filterQuery?: string;
	filterNetwork?: Network;
	filterZeroBalance?: boolean;
	sortByBalance?: boolean;
	filterNetworksIds?: NetworkId[];
	filterNfts?: boolean;
	filterCategoryTag?: TokenCategoryTagValue;
}

export const initModalTokensListContext = (
	modalTokensListData: ModalTokensListData
): ModalTokensListContext => {
	const data = writable<ModalTokensListData>(modalTokensListData);
	const { update } = data;

	// By reference: a plain `derived` passes an array on at every change of `data`, a keystroke in the
	// search included, and `eligibleTokens` would map every token again.
	const tokens = derivedMemo([data], ([{ tokens }]) => tokens, Object.is);
	const filterQuery = derived([data], ([{ filterQuery }]) => filterQuery);
	const filterNetwork = derived([data], ([{ filterNetwork }]) => filterNetwork);
	const filterZeroBalance = derived([data], ([{ filterZeroBalance }]) => filterZeroBalance);
	const sortByBalance = derived([data], ([{ sortByBalance }]) => sortByBalance ?? true);
	const filterNetworksIds = derivedMemo(
		[data],
		([{ filterNetworksIds }]) => filterNetworksIds,
		Object.is
	);
	const filterNfts = derived([data], ([{ filterNfts }]) => filterNfts);
	const filterCategoryTag = derived([data], ([{ filterCategoryTag }]) => filterCategoryTag);

	// The tokens the picker can offer at all: the fixed constraints (networks, NFTs, a balance), before
	// the search and the filters the person picks.
	const eligibleTokens = derived(
		[
			tokens,
			filterZeroBalance,
			sortByBalance,
			exchanges,
			balancesStore,
			stakeBalances,
			tokensToPin,
			networks,
			filterNetworksIds,
			filterNfts
		],
		([
			$tokens,
			$filterZeroBalance,
			$sortByBalance,
			$exchanges,
			$balances,
			$stakeBalances,
			$tokensToPin,
			$networksToPin,
			$filterNetworksIds,
			$filterNfts
		]) => {
			const filteredByNetworkIds =
				nonNullish($filterNetworksIds) && $filterNetworksIds.length > 0
					? filterTokensForSelectedNetworks([
							$tokens,
							$filterNetworksIds,
							isNullish($filterNetworksIds)
						])
					: $tokens;

			const filteredByNft = filterTokensByNft({
				tokens: filteredByNetworkIds,
				filterNfts: $filterNfts
			});

			if (!$sortByBalance) {
				return filteredByNft;
			}

			const tokensUi = filteredByNft.map((token) =>
				mapTokenUi({
					token,
					$balances,
					$stakeBalances,
					$exchanges
				})
			);

			const pinnedWithBalance = sortTokens({
				$tokens: tokensUi,
				$tokensToPin,
				$networksToPin
			});

			return $filterZeroBalance
				? pinnedWithBalance.filter(({ balance }) => (balance ?? ZERO) > ZERO)
				: pinnedWithBalance;
		}
	);

	// The list the picker offers for the current search: the network and asset type the person picks
	// narrow it in `ModalTokensList`, which knows which of them the list can show.
	const filteredTokens = derived(
		[eligibleTokens, filterQuery],
		([$eligibleTokens, $filterQuery]): TokenUi[] =>
			filterTokens({ tokens: $eligibleTokens, filter: $filterQuery ?? '' })
	);

	return {
		eligibleTokens,
		filterQuery,
		filterNetwork,
		filterCategoryTag,
		filteredTokens,
		setTokens: (tokens: Token[]) =>
			update((state) => ({
				...state,
				tokens
			})),
		setFilterQuery: (query: string) =>
			update((state) => ({
				...state,
				filterQuery: query
			})),
		setFilterNetwork: (network: Network | undefined) =>
			update((state) => ({
				...state,
				filterNetwork: network
			})),
		setFilterNetworksIds: (networksIds: NetworkId[] | undefined) =>
			update((state) => ({
				...state,
				filterNetworksIds: networksIds
			})),
		setFilterCategoryTag: (categoryTag: TokenCategoryTagValue | undefined) =>
			update((state) => ({
				...state,
				filterCategoryTag: categoryTag
			})),
		// `sortByBalance` is kept: it is how the list's owner wants it sorted, not a filter the person
		// picks, and a context that outlives its modal would otherwise go back to the balance sort.
		resetFilters: () => {
			update((state) => ({
				...state,
				filterQuery: undefined,
				filterNetwork: undefined,
				filterZeroBalance: undefined,
				filterNetworksIds: undefined,
				filterNfts: undefined,
				filterCategoryTag: undefined
			}));
		}
	};
};

export interface ModalTokensListContext {
	eligibleTokens: Readable<TokenUi[]>;
	filterQuery: Readable<string | undefined>;
	filterNetwork: Readable<Network | undefined>;
	filterCategoryTag: Readable<TokenCategoryTagValue | undefined>;
	filteredTokens: Readable<TokenUi[]>;
	setTokens: (tokens: Token[]) => void;
	setFilterQuery: (query: string) => void;
	setFilterNetwork: (network: Network | undefined) => void;
	setFilterNetworksIds: (networksIds: NetworkId[] | undefined) => void;
	setFilterCategoryTag: (categoryTag: TokenCategoryTagValue | undefined) => void;
	resetFilters: () => void;
}

export const MODAL_TOKENS_LIST_CONTEXT_KEY = Symbol('modal-tokens-list');
