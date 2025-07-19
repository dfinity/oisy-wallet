import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token, TokenUi } from '$lib/types/token';
import {
	filterTokensForSelectedNetwork,
	filterTokensForSelectedNetworks
} from '$lib/utils/network.utils';
import { filterTokens, pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface ModalTokensListData {
	tokens: Token[];
	filterQuery?: string;
	filterNetwork?: Network;
	filterZeroBalance?: boolean;
	sortByBalance?: boolean;
	filterNetworksIds?: NetworkId[];
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

	const filteredTokens = derived(
		[
			tokens,
			filterQuery,
			filterNetwork,
			filterZeroBalance,
			sortByBalance,
			exchanges,
			balancesStore,
			filterNetworksIds
		],
		([
			$tokens,
			$filterQuery,
			$filterNetwork,
			$filterZeroBalance,
			$sortByBalance,
			$exchanges,
			$balances,
			$filterNetworksIds
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

			if (!$sortByBalance) {
				return filteredByNetwork;
			}

			const pinnedWithBalance = pinTokensWithBalanceAtTop({
				$tokens: filteredByNetwork,
				$balances,
				$exchanges
			});

			return $filterZeroBalance
				? pinnedWithBalance.filter(({ balance }) => (balance ?? ZERO) > ZERO)
				: pinnedWithBalance;
		}
	);

	return {
		filterQuery,
		filterNetwork,
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
			}))
	};
};

export interface ModalTokensListContext {
	filterQuery: Readable<string | undefined>;
	filterNetwork: Readable<Network | undefined>;
	filteredTokens: Readable<TokenUi[]>;
	setTokens: (tokens: Token[]) => void;
	setFilterQuery: (query: string) => void;
	setFilterNetwork: (network: Network | undefined) => void;
	setFilterNetworksIds: (networksIds: NetworkId[] | undefined) => void;
}

export const MODAL_TOKENS_LIST_CONTEXT_KEY = Symbol('modal-tokens-list');
