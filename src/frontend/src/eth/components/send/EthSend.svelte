<script lang="ts">
	import EthSendModal from '$eth/components/send/EthSendModal.svelte';
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
	import { modalEthSend } from '$lib/derived/modal.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { loadTokenAndRun } from '$lib/services/token.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	const isDisabled = (): boolean => $ethAddressNotLoaded;

	const openSend = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		const callback = async () => modalStore.openEthSend(modalId);
		await loadTokenAndRun({ token, callback });
	};
</script>

<SendButtonWithModal open={async (modalId) => await openSend(modalId)} isOpen={$modalEthSend}>
	<EthSendModal on:nnsClose slot="modal" />
</SendButtonWithModal>
