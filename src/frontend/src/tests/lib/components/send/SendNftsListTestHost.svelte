<script lang="ts">
	import { setContext } from 'svelte';
	import SendNftsList from '$lib/components/send/SendNftsList.svelte';
	import {
		initModalTokensListContext,
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

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- set once, as the modal does
		initModalTokensListContext({ tokens: [], filterNetwork })
	);
</script>

<SendNftsList {onSelect} />
