<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalCkBTCReceive } from '$lib/derived/modal.derived';
	import IcReceiveModal from '$icp/components/receive/IcReceiveModal.svelte';
	import { loadAllCkBtcInfo } from '$icp/services/ckbtc.services';
	import type { IcToken } from '$icp/types/ic';
	import { authStore } from '$lib/stores/auth.store';
	import IcReceiveInfoCkBTC from '$icp/components/receive/IcReceiveInfoCkBTC.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	export let compact = false;

	const modalId = Symbol();

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const openReceive = async () => {
		await loadAllCkBtcInfo({
			...($token as IcToken),
			identity: $authStore.identity
		});

		modalStore.openCkBTCReceive(modalId);
		return;
	};
</script>

<svelte:window on:oisyReceiveCkBTC={openReceive} />

<ReceiveButton {compact} on:click={async () => await openReceive()} />

{#if $modalCkBTCReceive && $modalStore?.data === modalId}
	<IcReceiveModal infoCmp={IcReceiveInfoCkBTC} />
{/if}
