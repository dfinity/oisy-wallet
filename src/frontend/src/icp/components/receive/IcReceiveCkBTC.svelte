<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/derived/token.derived';
	import { modalCkBTCReceive } from '$lib/derived/modal.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { loadAllCkBtcInfo } from '$icp/services/ckbtc.services';
	import type { IcToken } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';
	import IcReceiveInfoCkBTC from '$icp/components/receive/IcReceiveInfoCkBTC.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';

	const openReceive = async () => {
		await loadAllCkBtcInfo({
			...($token as IcToken),
			identity: $authStore.identity
		});

		modalStore.openCkBTCReceive();
		return;
	};
</script>

<IcReceiveButton on:click={async () => await openReceive()} />

{#if $modalCkBTCReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoCkBTC} />
{/if}
