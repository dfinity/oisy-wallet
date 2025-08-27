<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { modalSolReceive } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import {
		solAddressDevnetStore,
		solAddressLocalnetStore,
		solAddressMainnetStore
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

	// TODO: consolidate this logic together with btc into $networkAddress like it's done for ICP and ETH
	let addressData = $derived(
		isNetworkIdSOLDevnet($networkId)
			? $solAddressDevnetStore
			: isNetworkIdSOLLocal($networkId)
				? $solAddressLocalnetStore
				: $solAddressMainnetStore
	);

	const isDisabled = (): boolean => isNullish(addressData) || !addressData.certified;

	// TODO: PRODSEC: provide the ATA address too in the receive modal for SPL tokens
	let address = $derived(addressData?.data);

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openSolReceive(modalId);
	};
</script>

<ReceiveButtonWithModal isOpen={$modalSolReceive} open={openReceive}>
	{#snippet modal()}
		<ReceiveModal
			{address}
			addressToken={token}
			copyAriaLabel={$i18n.receive.solana.text.solana_address_copied}
			network={token.network}
		/>
	{/snippet}
</ReceiveButtonWithModal>
