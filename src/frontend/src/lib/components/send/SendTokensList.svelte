<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	const dispatch = createEventDispatcher();

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized;

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<Token>) => {
		dispatch('icSendToken', token);
	};
</script>

<ModalTokensList
	{loading}
	networkSelectorViewOnly={nonNullish($selectedNetwork)}
	on:icSelectNetworkFilter
	on:icTokenButtonClick={onIcTokenButtonClick}
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
		<ButtonCloseModal />
	{/snippet}
</ModalTokensList>
