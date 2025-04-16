<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
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
	on:icSelectNetworkFilter
	on:icTokenButtonClick={onIcTokenButtonClick}
	networkSelectorViewOnly={nonNullish($selectedNetwork)}
>
	{#snippet toolbar()}
		<ButtonCloseModal />
	{/snippet}
</ModalTokensList>
