<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { modalKaspaReceive } from '$lib/derived/modal.derived';
	import { networkAddressStore } from '$lib/derived/network-address.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

	let addressData = $derived($networkAddressStore);

	const isDisabled = (): boolean => isNullish(addressData) || !addressData.certified;

	let address = $derived(addressData?.data);

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openKaspaReceive(modalId);
	};
</script>

<ReceiveButtonWithModal isOpen={$modalKaspaReceive} open={openReceive}>
	{#snippet modal()}
		<ReceiveModal
			{address}
			addressToken={token}
			copyAriaLabel={$i18n.receive.kaspa.text.kaspa_address_copied}
			network={token.network}
		/>
	{/snippet}
</ReceiveButtonWithModal>
