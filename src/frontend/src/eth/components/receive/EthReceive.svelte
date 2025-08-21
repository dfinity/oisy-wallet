<script lang="ts">
	import EthReceiveMetamask from '$eth/components/receive/EthReceiveMetamask.svelte';
	import { metamaskNotInitialized } from '$eth/derived/metamask.derived';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { ethAddressNotCertified } from '$lib/derived/address.derived';
	import { modalEthReceive } from '$lib/derived/modal.derived';
	import { networkAddress, networkEthereum } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

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

<ReceiveButtonWithModal isOpen={$modalEthReceive} open={openReceive}>
	{#snippet modal()}
		<ReceiveModal
			address={$networkAddress}
			addressToken={token}
			copyAriaLabel={$i18n.receive.ethereum.text.ethereum_address_copied}
			network={token.network}
		>
			{#snippet content()}
				{#if $networkEthereum}
					<EthReceiveMetamask />
				{/if}
			{/snippet}
		</ReceiveModal>
	{/snippet}
</ReceiveButtonWithModal>
