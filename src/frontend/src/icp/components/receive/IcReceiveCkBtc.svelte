<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import IcReceiveInfoCkBtc from '$icp/components/receive/IcReceiveInfoCkBtc.svelte';
	import { loadAllCkBtcInfo } from '$icp/services/ckbtc.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalCkBTCReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	const { token, tokenId, ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const modalId = Symbol();

	let minterInfoLoaded = $state(false);

	const openReceive = async (modalId: symbol) => {
		// If the minter info has not been loaded yet, we attach the web worker to load that information.
		// Imperatively loading that information has the downside that the user might have to wait a few seconds (busy screen) to access the information.
		// There might also be a race condition when the minter information is called twice if the user clicks really, really quickly on the "Receive" button on a screen where the minter information is already loaded globally.
		// However, this approach is advantageous in terms of performance, as we can assume most users won't access the "Receive" modal for ckBTC that often, potentially sparing many calls.
		// Reusing the web worker is also beneficial if loading the ckBTC minter information ever becomes scheduled again.
		minterInfoLoaded = nonNullish($ckBtcMinterInfoStore?.[$tokenId]);

		await loadAllCkBtcInfo({
			...$token,
			identity: $authIdentity
		});

		modalStore.openCkBTCReceive(modalId);
		return;
	};

	const openModal = async (modalId: symbol) => await open(async () => await openReceive(modalId));
</script>

<svelte:window on:oisyReceiveCkBTC={async () => await openModal(modalId)} />

<ReceiveButtonWithModal isOpen={$modalCkBTCReceive} {modalId} open={openModal}>
	{#snippet modal()}
		<ReceiveAddressModal infoCmp={IcReceiveInfoCkBtc} on:nnsClose={close} />
	{/snippet}
</ReceiveButtonWithModal>

{#if !minterInfoLoaded}
	<IcCkListener
		initFn={initCkBTCMinterInfoWorker}
		token={$token}
		twinToken={$ckEthereumTwinToken}
	/>
{/if}
