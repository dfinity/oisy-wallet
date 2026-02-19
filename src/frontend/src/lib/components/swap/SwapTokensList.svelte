<script lang="ts">
	import { getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { VELORA_SWAP_ENABLED } from '$env/velora-swap.env';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { allCrossChainSwapTokens, allSortedIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { stakeBalances } from '$lib/derived/stake.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import type { TokenUi } from '$lib/types/token-ui';
	import { sortTokens } from '$lib/utils/tokens.utils';

	interface Props {
		onSelectToken: (token: Token) => void;
		onSelectNetworkFilter: () => void;
		onCloseTokensList: () => void;
	}

	let { onSelectToken, onSelectNetworkFilter, onCloseTokensList }: Props = $props();

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let tokens: TokenUi[] = $derived(
		sortTokens({
			$tokens: [
				{ ...ICP_TOKEN, enabled: true },
				...$allSortedIcrcTokens,
				...(VELORA_SWAP_ENABLED ? $allCrossChainSwapTokens : [])
			].filter(
				(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
			),
			$exchanges,
			$balances: $balancesStore,
			$stakeBalances,
			$tokensToPin
		})
	);

	$effect(() => {
		setTokens(tokens);
	});

	const onTokenButtonClick = (token: TokenUi) => {
		onSelectToken(token);
	};
</script>

<ModalTokensList
	networkSelectorViewOnly={!VELORA_SWAP_ENABLED}
	{onSelectNetworkFilter}
	{onTokenButtonClick}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonCancel fullWidth={true} onclick={onCloseTokensList} />
	{/snippet}
</ModalTokensList>
