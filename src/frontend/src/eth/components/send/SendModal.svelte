<script lang="ts">
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import { getTokenStoreFromContext } from '$lib/stores/token.store';

	const token = getTokenStoreFromContext();
</script>

<SendTokenContext token={$token}>
	<SendTokenModal on:nnsClose />
</SendTokenContext>
