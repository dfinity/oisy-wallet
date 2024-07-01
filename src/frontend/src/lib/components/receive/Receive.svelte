<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalReceive } from '$lib/derived/modal.derived';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';

	const modalId = Symbol();

	const openReceive = async () => {
		modalStore.openReceive(modalId);
	};
</script>

<ReceiveButton on:click={openReceive} />

{#if $modalReceive && $modalStore?.data === modalId}
	<ReceiveAddressModal infoCmp={ReceiveAddresses} on:nnsClose={modalStore.close} />
{/if}
