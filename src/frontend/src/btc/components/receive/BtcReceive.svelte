<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { modalBtcReceive } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import {
		btcAddressMainnetStore,
		btcAddressRegtestStore,
		btcAddressTestnetStore,
		type StorageAddressData
	} from '$lib/stores/address.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { BtcAddress } from '$lib/types/address';
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';

	let addressData: StorageAddressData<BtcAddress>;
	$: addressData = isNetworkIdBTCTestnet($networkId)
		? $btcAddressTestnetStore
		: isNetworkIdBTCRegtest($networkId)
			? $btcAddressRegtestStore
			: $btcAddressMainnetStore;

	const isDisabled = (): boolean => isNullish(addressData) || !addressData.certified;

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openBtcReceive(modalId);
	};
</script>

<ReceiveButtonWithModal open={openReceive} isOpen={$modalBtcReceive}>
	<ReceiveModal slot="modal" address={addressData?.data} />
</ReceiveButtonWithModal>
