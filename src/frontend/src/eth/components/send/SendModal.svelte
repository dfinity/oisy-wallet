<script lang="ts">
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import { getContextToken } from '$lib/stores/token.store';

	const { store: token } = getContextToken();
</script>

<SendTokenContext token={$token}>
	<SendTokenModal on:nnsClose />
</SendTokenContext>
