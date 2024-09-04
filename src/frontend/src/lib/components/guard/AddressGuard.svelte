<script lang="ts">
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
	import { validateBtcAddressMainnet, validateEthAddress } from '$lib/services/address.services';

	$: $btcAddressMainnetStore,
		(async () => await validateBtcAddressMainnet($btcAddressMainnetStore))();

	$: $ethAddressStore, (async () => await validateEthAddress($ethAddressStore))();
</script>

<slot />
