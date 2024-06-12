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
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';

	const { token, tokenId, twinToken } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	let minterInfoLoaded = false;

	const openReceive = async () => {
		// If the minter info has not been loaded yet, we attach the web worker to load that information.
		// Imperatively loading that information has the downside that the user might have to wait a few seconds (busy screen) to access the information.
		// There might also be a race condition when the minter information is called twice if the user clicks really, really quickly on the "Receive" button on a screen where the minter information is already loaded globally.
		// However, this approach is advantageous in terms of performance, as we can assume most users won't access the "Receive" modal for ckBTC that often, potentially sparing many calls.
		// Reusing the web worker is also beneficial if loading the ckBTC minter information ever becomes scheduled again.
		minterInfoLoaded = nonNullish($ckBtcMinterInfoStore?.[$tokenId]);

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

{#if !minterInfoLoaded && nonNullish($twinToken)}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} token={$token} twinToken={$twinToken} />
{/if}

{#if $modalCkBTCReceive}
	<IcReceiveModal infoCmp={IcReceiveInfoCkBTC} />
{/if}
