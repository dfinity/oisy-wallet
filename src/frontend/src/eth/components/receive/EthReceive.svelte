<script lang="ts">
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { ethAddressNotCertified } from '$lib/derived/address.derived';
	import { modalEthReceive } from '$lib/derived/modal.derived';
	import { networkAddress, networkEthereum } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	export let token: Token;

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
	<ReceiveModal slot="modal" address={$networkAddress} addressToken={token}>
		<svelte:fragment slot="content">
			{#if $networkEthereum}
				<EthReceiveMetamask />
			{/if}
		</svelte:fragment>
	</ReceiveModal>
</ReceiveButtonWithModal>
