<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotCertified } from '$lib/derived/address.derived';
	import ReceiveModal from '$eth/components/receive/ReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalReceive } from '$lib/derived/modal.derived';
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

		modalStore.openReceive(modalId);
	};
</script>

<ReceiveButton on:click={async () => await openReceive()} />

{#if $modalReceive && $modalStore?.data === modalId}
	<ReceiveModal />
{/if}
