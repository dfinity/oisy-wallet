<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { tokenStandard } from '$lib/derived/token.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { isRouteTokens } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import IcReceiveInfo from '$icp/components/receive/IcReceiveInfo.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';
	import { modalIcpReceive } from '$lib/derived/modal.derived';

	const openReceive = () => {
		if ($tokenStandard === 'icp' || isRouteTokens($page)) {
			modalStore.openIcpReceive();
			return;
		}

		modalStore.openReceive();
	};
</script>

<IcReceiveButton on:click={openReceive} />

{#if $modalIcpReceive}
	<IcReceiveModal infoCmp={IcReceiveInfo} />
{/if}
