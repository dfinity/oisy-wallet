<script lang="ts">
	import { setContext, createEventDispatcher } from 'svelte';
	import { readable } from 'svelte/store';
	import SendNftsList from '$lib/components/send/SendNftsList.svelte';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Network } from '$lib/types/network';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		onSelect: (nft: Nft) => void;
		filterNetwork?: Network;
	}

	const { onSelect, filterNetwork }: Props = $props();

	const dispatch = createEventDispatcher();

	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, {
		filterNetwork: readable(filterNetwork)
	} as unknown as ModalTokensListContext);
</script>

<SendNftsList
	{onSelect}
	on:icSelectNetworkFilter={(e) => dispatch('icSelectNetworkFilter', e.detail)}
/>
