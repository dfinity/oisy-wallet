<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';

	const modalId = Symbol();
</script>

<ReceiveButton on:click={() => modalStore.openIcrcReceive(modalId)} />

{#if $modalIcrcReceive && $modalStore?.data === modalId}
	<IcReceiveModal infoCmp={IcReceiveInfoIcrc} />
{/if}
