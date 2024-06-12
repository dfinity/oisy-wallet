<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';
</script>

<ReceiveButton on:click={modalStore.openIcrcReceive} />

{#if $modalIcrcReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoIcrc} />
{/if}
