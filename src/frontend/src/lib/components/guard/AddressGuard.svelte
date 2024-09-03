<script lang="ts">
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
	import { certifyBtcAddressMainnet, certifyEthAddress } from '$lib/services/address.services';
	import { validateAddress } from '$lib/utils/address.utils';
	import type { BtcAddress, EthAddress } from '$lib/types/address';

	const validateBtcAddressMainnet = async () =>
		await validateAddress<BtcAddress>({
			$addressStore: $btcAddressMainnetStore,
			certifyAddress: certifyBtcAddressMainnet
		});

	const validateEthAddress = async () =>
		await validateAddress<EthAddress>({
			$addressStore: $ethAddressStore,
			certifyAddress: certifyEthAddress
		});

	$: $btcAddressMainnetStore, validateBtcAddressMainnet();

	$: $ethAddressStore, validateEthAddress();
</script>

<slot />
