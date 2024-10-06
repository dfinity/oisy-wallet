<script lang="ts">
	import { validateBtcAddressMainnet, validateEthAddress } from '$lib/services/address.services';
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';

	$: $btcAddressMainnetStore,
		(async () => await validateBtcAddressMainnet($btcAddressMainnetStore))();

	$: $ethAddressStore, (async () => await validateEthAddress($ethAddressStore))();
</script>

<slot />
