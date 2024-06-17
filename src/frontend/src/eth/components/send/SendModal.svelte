<script lang="ts">
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import { token } from '$lib/stores/token.store';
</script>

<SendTokenContext token={$token}>
	<SendTokenModal />
</SendTokenContext>
