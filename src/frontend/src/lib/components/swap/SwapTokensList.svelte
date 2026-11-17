<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { allSwapUniverseTokens } from '$lib/derived/swap.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import {
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		type ModalNetworksListContext
	} from '$lib/stores/modal-networks-list.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import type { TokenToggleable } from '$lib/types/token-toggleable';
	import type { TokenUi } from '$lib/types/token-ui';
	import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';
	import { canPayWithToken, getReceiveSwapTokens, sortSwapListTokens } from '$lib/utils/swap.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';

	interface Props {
		side?: SwapSelectTokenType;
		onSelectToken: (token: Token) => void;
		onCloseTokensList: () => void;
		onFiltersChange?: () => void;
	}

	let { side, onSelectToken, onCloseTokensList, onFiltersChange }: Props = $props();

	const { sourceToken, destinationToken, receiveSupportedData } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const { filteredNetworks } = getContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY
	);

	// This side's own pick stays in the list, checked, so reopening the list shows what is picked
	// and a network with one token (Bitcoin) is never empty. The other side's pick is left out.
	let selectedToken = $derived(side === 'destination' ? $destinationToken : $sourceToken);

	let pairedToken = $derived(side === 'destination' ? $sourceToken : $destinationToken);

	// To receive, what the pay token reaches, from the function the receive shortcuts read too. To
	// pay, the aggregated source-side data, on the networks this side may use, so "All networks"
	// never shows a token the swap cannot use.
	let swapTokens: TokenToggleable<Token>[] = $derived(
		side === 'destination' && nonNullish($sourceToken)
			? getReceiveSwapTokens({
					sourceToken: $sourceToken,
					supportedData: $receiveSupportedData,
					networks: $filteredNetworks,
					tokens: $allSwapUniverseTokens
				})
			: filterSwapTokens({
					tokens: $allSwapUniverseTokens,
					supportedData:
						side === 'destination' ? $receiveSupportedData : $swapSupportedTokensStore?.aggregated
				}).filter(
					({ id, network }) =>
						id !== pairedToken?.id && $filteredNetworks.some(({ id }) => id === network.id)
				)
	);

	let tokens: TokenUi[] = $derived(
		sortSwapListTokens({
			tokens: swapTokens.map((token) =>
				mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			),
			$tokensToPin,
			$networksToPin: $networks
		})
	);

	$effect(() => {
		setTokens(tokens);
	});

	// Listed, but not to be picked to pay with: a token that is not enabled, or has a balance of zero.
	let unpayableTokenIds = $derived(
		new Set(
			side === 'source' ? tokens.filter((token) => !canPayWithToken(token)).map(({ id }) => id) : []
		)
	);

	// Only networks with something to pick: with BTC on the other side, Bitcoin has nothing left. A
	// network kept from an earlier visit that is not among them reads as all networks in the list.
	let availableNetworks = $derived(
		$filteredNetworks.filter(({ id }) => tokens.some(({ network }) => network.id === id))
	);
</script>

<ModalTokensList
	networks={availableNetworks}
	{onFiltersChange}
	onTokenButtonClick={onSelectToken}
	showStakeBalance={false}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem
			disabled={unpayableTokenIds.has(token.id)}
			{onClick}
			selected={token.id === selectedToken?.id}
			{token}
		/>
	{/snippet}
	{#snippet toolbar()}
		<ButtonBack fullWidth={true} onclick={onCloseTokensList} />
	{/snippet}
</ModalTokensList>
