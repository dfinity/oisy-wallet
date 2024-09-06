<script lang="ts">
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
	import { validateBtcAddressMainnet, validateEthAddress } from '$lib/services/address.services';
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';

	$: $btcAddressMainnetStore,
		(async () =>
			NETWORK_BITCOIN_ENABLED
				? await validateBtcAddressMainnet($btcAddressMainnetStore)
				: await Promise.resolve())();

	$: $ethAddressStore, (async () => await validateEthAddress($ethAddressStore))();
</script>

<slot />
