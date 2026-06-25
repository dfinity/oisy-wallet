import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { networks } from '$lib/derived/networks.derived';
import { stakeBalances } from '$lib/derived/stake.derived';
import { tokensToPin } from '$lib/derived/tokens.derived';
import type { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { balancesStore } from '$lib/stores/balances.store';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token, TokenStandard } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import {
	filterTokensForSelectedNetwork,
	filterTokensForSelectedNetworks
} from '$lib/utils/network.utils';
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
	filterStandard?: TokenStandard;
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
	const filterStandard = derived([data], ([{ filterStandard }]) => filterStandard);

	const filteredTokens = derived(
		[
			tokens,
			filterQuery,
			filterNetwork,
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

	return {
		filterQuery,
		filterNetwork,
		filterCategoryTag,
		filterStandard,
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
		setFilterStandard: (standard: TokenStandard | undefined) =>
			update((state) => ({
				...state,
				filterStandard: standard
			})),
		resetFilters: () => {
			update((state) => ({
				...state,
				filterQuery: undefined,
				filterNetwork: undefined,
				filterZeroBalance: undefined,
				sortByBalance: undefined,
				filterNetworksIds: undefined,
				filterNfts: undefined,
				filterCategoryTag: undefined,
				filterStandard: undefined
			}));
		}
	};
};

export interface ModalTokensListContext {
	filterQuery: Readable<string | undefined>;
	filterNetwork: Readable<Network | undefined>;
	filterCategoryTag: Readable<TokenCategoryTagValue | undefined>;
	filterStandard: Readable<TokenStandard | undefined>;
	filteredTokens: Readable<TokenUi[]>;
	setTokens: (tokens: Token[]) => void;
	setFilterQuery: (query: string) => void;
	setFilterNetwork: (network: Network | undefined) => void;
	setFilterNetworksIds: (networksIds: NetworkId[] | undefined) => void;
	setFilterCategoryTag: (categoryTag: TokenCategoryTagValue | undefined) => void;
	setFilterStandard: (standard: TokenStandard | undefined) => void;
	resetFilters: () => void;
}

export const MODAL_TOKENS_LIST_CONTEXT_KEY = Symbol('modal-tokens-list');
