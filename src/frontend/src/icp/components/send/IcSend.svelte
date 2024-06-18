<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ICP_NETWORK_ID } from '$env/networks.env';
	import SendButton from '$lib/components/send/SendButton.svelte';
</script>

<SendButton on:click={modalStore.openIcSend} />

{#if $modalIcSend}
	<IcSendModal networkId={ICP_NETWORK_ID} />
{/if}
