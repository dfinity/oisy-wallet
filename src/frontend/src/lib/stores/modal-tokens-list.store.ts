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
import {
	filterTokensForSelectedNetwork,
	filterTokensForSelectedNetworks
} from '$lib/utils/network.utils';
import { mapTokenUi } from '$lib/utils/token.utils';
import { filterTokens, filterTokensByNft, sortTokens } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, get, readable, writable, type Readable } from 'svelte/store';

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

	const tokens = derived([data], ([{ tokens }]) => tokens);
	const filterQuery = derived([data], ([{ filterQuery }]) => filterQuery);
	const filterNetwork = derived([data], ([{ filterNetwork }]) => filterNetwork);
	const filterZeroBalance = derived([data], ([{ filterZeroBalance }]) => filterZeroBalance);
	const sortByBalance = derived([data], ([{ sortByBalance }]) => sortByBalance ?? true);
	const filterNetworksIds = derived([data], ([{ filterNetworksIds }]) => filterNetworksIds);
	const filterNfts = derived([data], ([{ filterNfts }]) => filterNfts);
	const filterCategoryTag = derived([data], ([{ filterCategoryTag }]) => filterCategoryTag);

	const filterTokensFor = ({
		selectedNetwork,
		sorted
	}: {
		selectedNetwork: Readable<Network | undefined>;
		sorted: boolean;
	}): Readable<TokenUi[]> =>
		derived(
			[
				tokens,
				filterQuery,
				selectedNetwork,
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
				$filterQuery,
				$filterNetwork,
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
				const filteredByQuery = filterTokens({ tokens: $tokens, filter: $filterQuery ?? '' });

				const filteredByNetworkIds =
					nonNullish($filterNetworksIds) && $filterNetworksIds.length > 0
						? filterTokensForSelectedNetworks([
								filteredByQuery,
								$filterNetworksIds,
								isNullish($filterNetworksIds)
							])
						: filteredByQuery;

				const filteredByNetwork = filterTokensForSelectedNetwork([
					filteredByNetworkIds,
					$filterNetwork,
					isNullish($filterNetwork)
				]);

				const filteredByNft = filterTokensByNft({
					tokens: filteredByNetwork,
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

				const ordered = sorted
					? sortTokens({
							$tokens: tokensUi,
							$tokensToPin,
							$networksToPin
						})
					: tokensUi;

				return $filterZeroBalance
					? ordered.filter(({ balance }) => (balance ?? ZERO) > ZERO)
					: ordered;
			}
		);

	// Filters set aside under a key, for a modal with more than one list (Swap's pay and receive),
	// so each list reopens on its own. Cleared with the other filters.
	const savedFilters = new Map<
		string,
		Pick<ModalTokensListData, 'filterNetwork' | 'filterCategoryTag'>
	>();

	const filteredTokens = filterTokensFor({ selectedNetwork: filterNetwork, sorted: true });

	// The same list as if no network were picked, to tell an empty list whether clearing the network
	// would bring tokens back. Only its length is used, so it is not sorted; `ModalTokensList` reads it
	// only while a network can be cleared.
	const filteredTokensAllNetworks = filterTokensFor({
		selectedNetwork: readable(undefined),
		sorted: false
	});

	return {
		tokens,
		filteredTokensAllNetworks,
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
		saveFilters: (key: string) => {
			const { filterNetwork, filterCategoryTag } = get(data);

			savedFilters.set(key, { filterNetwork, filterCategoryTag });
		},
		restoreFilters: (key: string): boolean => {
			const saved = savedFilters.get(key);

			if (isNullish(saved)) {
				return false;
			}

			update((state) => ({ ...state, ...saved }));

			return true;
		},
		resetFilters: () => {
			savedFilters.clear();

			update((state) => ({
				...state,
				filterQuery: undefined,
				filterNetwork: undefined,
				filterZeroBalance: undefined,
				sortByBalance: undefined,
				filterNetworksIds: undefined,
				filterNfts: undefined,
				filterCategoryTag: undefined
			}));
		}
	};
};

export interface ModalTokensListContext {
	tokens: Readable<Token[]>;
	filteredTokensAllNetworks: Readable<TokenUi[]>;
	filterQuery: Readable<string | undefined>;
	filterNetwork: Readable<Network | undefined>;
	filterCategoryTag: Readable<TokenCategoryTagValue | undefined>;
	filteredTokens: Readable<TokenUi[]>;
	setTokens: (tokens: Token[]) => void;
	setFilterQuery: (query: string) => void;
	setFilterNetwork: (network: Network | undefined) => void;
	setFilterNetworksIds: (networksIds: NetworkId[] | undefined) => void;
	setFilterCategoryTag: (categoryTag: TokenCategoryTagValue | undefined) => void;
	saveFilters: (key: string) => void;
	// Applies the filters saved under `key`; `false` when there are none.
	restoreFilters: (key: string) => boolean;
	resetFilters: () => void;
}

export const MODAL_TOKENS_LIST_CONTEXT_KEY = Symbol('modal-tokens-list');
