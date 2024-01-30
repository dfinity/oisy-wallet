<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { isBusy } from '$lib/derived/busy.derived';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { modalIcpReceive, modalReceive } from '$lib/derived/modal.derived';
	import IcReceiveIcModal from '$icp/components/receive/IcReceiveIcModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';

	const openReceive = async () => {
		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive();
			return;
		}

		modalStore.openReceive();
	};
</script>

<button
	class="flex-1 hero"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={async () => await openReceive()}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

{#if $modalIcpReceive}
	<IcReceiveIcModal />
{:else if $modalReceive}
	<ReceiveModal />
{/if}
