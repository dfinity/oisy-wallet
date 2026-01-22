<script lang="ts">
	import { setContext } from 'svelte';
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
		onSelectNetwork: () => void;
		filterNetwork?: Network;
	}

	const { onSelect, filterNetwork, onSelectNetwork }: Props = $props();

	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, {
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		filterNetwork: readable(filterNetwork)
	} as unknown as ModalTokensListContext);
</script>

<SendNftsList {onSelect} {onSelectNetwork} />
