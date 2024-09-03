<script lang="ts">
	import { ethAddressStore } from '$lib/stores/address.store';
	import { certifyEthAddress } from '$lib/services/address.services';
	import { validateAddress } from '$lib/utils/address.utils';
	import type { EthAddress } from '$lib/types/address';

	const validateEthAddress = async () =>
		await validateAddress<EthAddress>({
			$addressStore: $ethAddressStore,
			certifyAddress: certifyEthAddress
		});

	$: $ethAddressStore, validateEthAddress();
</script>

<slot />
