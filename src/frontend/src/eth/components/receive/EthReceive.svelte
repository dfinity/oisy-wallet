<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { ethAddressNotCertified } from '$lib/derived/address.derived';
	import EthReceiveModal from '$eth/components/receive/EthReceiveModal.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalEthReceive } from '$lib/derived/modal.derived';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';

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
