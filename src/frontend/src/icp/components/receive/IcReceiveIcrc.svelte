<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import IcReceiveInfoIcrc from '$icp/components/receive/IcReceiveInfoIcrc.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';
	import { modalIcrcReceive } from '$lib/derived/modal.derived';
</script>

<IcReceiveButton on:click={modalStore.openIcrcReceive} />

{#if $modalIcrcReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoIcrc} />
{/if}
