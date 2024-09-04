<script lang="ts">
	import { ethAddressStore } from '$lib/stores/address.store';
	import { certifyEthAddress, validateAddress } from '$lib/services/address.services';
	import type { EthAddress } from '$lib/types/address';

	const validateEthAddress = async () =>
		await validateAddress<EthAddress>({
			$addressStore: $ethAddressStore,
			certifyAddress: certifyEthAddress
		});

	$: $ethAddressStore, validateEthAddress();
</script>

<slot />
