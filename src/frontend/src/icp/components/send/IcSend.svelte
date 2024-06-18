<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalIcSend } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ICP_NETWORK_ID } from '$env/networks.env';
	import SendButton from '$lib/components/send/SendButton.svelte';

	export let compact = false;

	const modalId = Symbol();
</script>

<SendButton on:click={() => modalStore.openIcSend(modalId)} {compact} />

{#if $modalIcSend && $modalStore?.data === modalId}
	<IcSendModal networkId={ICP_NETWORK_ID} />
{/if}
