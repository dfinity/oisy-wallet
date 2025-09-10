<script lang="ts">
	import { setContext, createEventDispatcher } from 'svelte';
	import SendNftsList from '$lib/components/send/SendNftsList.svelte';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Nft } from '$lib/types/nft';
	import type { Network } from '$lib/types/network';
	import { readable } from 'svelte/store';

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
