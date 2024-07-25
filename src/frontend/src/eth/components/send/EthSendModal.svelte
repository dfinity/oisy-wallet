<script lang="ts">
	import EthSendTokenModal from '$eth/components/send/EthSendTokenModal.svelte';
	import SendTokenContext from '$eth/components/send/SendTokenContext.svelte';
	import { token } from '$lib/stores/token.store';
</script>

<SendTokenContext token={$token}>
	<EthSendTokenModal on:nnsClose />
</SendTokenContext>
