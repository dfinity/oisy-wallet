<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';

	const modalId = Symbol();

	const openReceive = async () => {
		modalStore.openIcrcReceive(modalId);
	};
</script>

<ReceiveButton on:click={openReceive} />

{#if $modalIcrcReceive && $modalStore?.data === modalId}
	<ReceiveAddressModal infoCmp={IcReceiveInfoIcrc} on:nnsClose={close} />
{/if}
