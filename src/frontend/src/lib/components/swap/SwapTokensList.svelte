<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import ButtonCancel from '../ui/ButtonCancel.svelte';

	const dispatch = createEventDispatcher();

	let loading = $derived<boolean>($erc20UserTokensNotInitialized);

	const onIcTokenButtonClick = ({ detail: token }: CustomEvent<TokenUi<IcTokenToggleable>>) => {
		dispatch('icSelectToken', token);
	};
</script>

<ModalTokensList
	{loading}
	on:icSelectNetworkFilter
	on:icTokenButtonClick={onIcTokenButtonClick}
	networkSelectorViewOnly={false}
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
