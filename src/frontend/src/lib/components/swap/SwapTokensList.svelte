<script lang="ts">
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
	import { canPayWithToken } from '$lib/utils/swap.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { sortTokens } from '$lib/utils/tokens.utils';

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

	// Only the networks this side may use (to receive: the ones the pay token reaches), so "All
	// networks" means all of those and never shows a token the swap cannot reach.
	let allowedSwapTokens: TokenToggleable<Token>[] = $derived(
		allSwapTokens.filter(({ network }) => $filteredNetworks.some(({ id }) => id === network.id))
	);

	let tokensUi: TokenToggleable<TokenUi>[] = $derived(
		allowedSwapTokens
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

	const isActive = (token: TokenUi): boolean => !isTokenToggleable(token) || token.enabled;

	// Inactive tokens come last, by symbol: their row shows no balance, so a balance must not move
	// them up the list.
	let tokens: TokenUi[] = $derived([
		...sortTokens({
			$tokens: tokensUi.filter(isActive),
			$tokensToPin,
			$networksToPin: $networks
		}),
		...sortTokens({
			$tokens: tokensUi.filter((token) => !isActive(token)),
			$tokensToPin,
			$networksToPin: $networks,
			primarySortStrategy: 'symbol'
		})
	]);

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
		<ButtonCancel fullWidth={true} onclick={onCloseTokensList} />
	{/snippet}
</ModalTokensList>
