<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
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
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { sortTokens } from '$lib/utils/tokens.utils';

	interface Props {
		side?: SwapSelectTokenType;
		onSelectToken: (token: Token) => void;
		onCloseTokensList: () => void;
	}

	let { side, onSelectToken, onCloseTokensList }: Props = $props();

	const { sourceToken, destinationToken, receiveSupportedData } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens, filterNetwork, setFilterNetwork } = getContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY
	);

	const { filteredNetworks } = getContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY
	);

	// On the destination side use the per-source receive data (when available); on the source
	// side fall back to the aggregated source-side data. Both come from the same provider state,
	// just shaped differently.
	let supportedData = $derived(
		side === 'destination' ? $receiveSupportedData : $swapSupportedTokensStore?.aggregated
	);

	let allSwapTokens: TokenToggleable<Token>[] = $derived(
		filterSwapTokens({
			tokens: $allSwapUniverseTokens,
			supportedData
		})
	);

	// This side's own pick stays in the list, checked, so reopening the list shows what is picked
	// and a network with one token (Bitcoin) is never empty. The other side's pick is left out.
	let selectedToken = $derived(side === 'destination' ? $destinationToken : $sourceToken);

	let pairedToken = $derived(side === 'destination' ? $sourceToken : $destinationToken);

	let tokensUi: TokenToggleable<TokenUi>[] = $derived(
		allSwapTokens
			.filter((token: TokenToggleable<Token>) => token.id !== pairedToken?.id)
			.map((token: TokenToggleable<Token>) =>
				mapTokenUi({
					token,
					$balances: $balancesStore,
					$stakeBalances,
					$exchanges
				})
			)
	);

	let tokens: TokenUi[] = $derived(
		sortTokens({
			$tokens: tokensUi,
			$tokensToPin,
			$networksToPin: $networks
		})
	);

	$effect(() => {
		setTokens(tokens);
	});

	// Only networks with something to pick: with BTC on the other side, Bitcoin has nothing left.
	let availableNetworks = $derived(
		$filteredNetworks.filter(({ id }) => tokens.some(({ network }) => network.id === id))
	);

	// A network kept from an earlier visit that has nothing left now (the pay token changed, or ⇅
	// moved its only token to the other side) gives way to all networks. Not while the list is
	// still empty: the tokens may simply not have loaded yet.
	$effect(() => {
		const network = $filterNetwork;

		if (
			tokens.length > 0 &&
			nonNullish(network) &&
			!availableNetworks.some(({ id }) => id === network.id)
		) {
			setFilterNetwork(undefined);
		}
	});
</script>

<ModalTokensList
	networks={availableNetworks}
	onTokenButtonClick={onSelectToken}
	showStakeBalance={false}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} selected={token.id === selectedToken?.id} {token} />
	{/snippet}
	{#snippet toolbar()}
		<ButtonCancel fullWidth={true} onclick={onCloseTokensList} />
	{/snippet}
</ModalTokensList>
