<script lang="ts">
	import { setContext } from 'svelte';
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
		onSelectNetwork: () => void;
		filterNetwork?: Network;
	}

	const { onSelect, filterNetwork, onSelectNetwork }: Props = $props();

	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, {
		filterNetwork: readable(filterNetwork)
	} as unknown as ModalTokensListContext);
</script>

<SendNftsList {onSelect} {onSelectNetwork} />
