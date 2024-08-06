<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import EthReceiveModal from '$eth/components/receive/EthReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalEthReceive } from '$lib/derived/modal.derived';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';

	const modalId = Symbol();

	const isDisabled = (): boolean => $addressNotCertified || $metamaskNotInitialized;

	const openReceive = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openEthReceive(modalId);
	};
</script>

<ReceiveButton on:click={async () => await openReceive()} />

{#if $modalEthReceive && $modalStore?.data === modalId}
	<EthReceiveModal />
{/if}
