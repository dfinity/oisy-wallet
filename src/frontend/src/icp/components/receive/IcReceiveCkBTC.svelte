<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalCkBTCReceive } from '$lib/derived/modal.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { loadAllCkBtcInfo } from '$icp/services/ckbtc.services';
	import type { IcToken } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';
	import IcReceiveInfoCkBTC from '$icp/components/receive/IcReceiveInfoCkBTC.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = async () => {
		await loadAllCkBtcInfo({
			...($token as IcToken),
			identity: $authStore.identity
		});

		modalStore.openCkBTCReceive();
		return;
	};
</script>

<svelte:window on:oisyReceiveCkBTC={openReceive} />

<IcReceiveButton on:click={async () => await openReceive()} />

{#if $modalCkBTCReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoCkBTC} />
{/if}
