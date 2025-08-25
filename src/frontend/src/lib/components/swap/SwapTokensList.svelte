<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ButtonCancel from '../ui/ButtonCancel.svelte';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { pinTokensWithBalanceAtTop } from '$lib/utils/tokens.utils';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import {
		allCrossChainSwapTokens,
		allKongSwapCompatibleIcrcTokens
	} from '$lib/derived/all-tokens.derived';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { VELORA_SWAP_ENABLED } from '$env/velora-swap.env';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const dispatch = createEventDispatcher<{
		icSelectToken: Token;
		icCloseTokensList: void;
	}>();

	let tokens: TokenUi<Token>[] = $derived(
		pinTokensWithBalanceAtTop({
			$tokens: [
				{ ...ICP_TOKEN, enabled: true },
				...$allKongSwapCompatibleIcrcTokens,
				...(VELORA_SWAP_ENABLED ? $allCrossChainSwapTokens : [])
			].filter(
				(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
			),
			$exchanges,
			$balances: $balancesStore
		})
	);

	$effect(() => {
		setTokens(tokens);
	});

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<TokenUi<Token>>) => {
		dispatch('icSelectToken', token);
	};
</script>

<ModalTokensList
	loading={false}
	on:icSelectNetworkFilter
	on:icTokenButtonClick={onIcTokenButtonClick}
	networkSelectorViewOnly={VELORA_SWAP_ENABLED}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {token} {onClick} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">
			{$i18n.tokens.manage.text.all_tokens_zero_balance}
		</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonCancel fullWidth={true} onclick={() => dispatch('icCloseTokensList')} />
	{/snippet}
</ModalTokensList>
