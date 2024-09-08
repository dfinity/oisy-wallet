<script lang="ts">
	import EthReceiveModal from '$eth/components/receive/EthReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { ethAddressNotCertified } from '$lib/derived/address.derived';
	import { modalEthReceive } from '$lib/derived/modal.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalStore } from '$lib/stores/modal.store';

	const isDisabled = (): boolean => $ethAddressNotCertified || $metamaskNotInitialized;

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openEthReceive(modalId);
	};
</script>

<ReceiveButtonWithModal open={openReceive} isOpen={$modalEthReceive}>
	<EthReceiveModal slot="modal" />
</ReceiveButtonWithModal>
