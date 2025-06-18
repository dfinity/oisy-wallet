<script lang="ts">
	import { getContext } from 'svelte';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';

	const { close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<IcReceiveWalletAddress on:icQRCode />

	{#snippet toolbar()}
		<ButtonDone onclick={close} />
	{/snippet}
</ContentWithToolbar>
