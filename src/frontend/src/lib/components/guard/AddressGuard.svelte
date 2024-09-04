<script lang="ts">
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
	import { validateBtcAddressMainnet, validateEthAddress } from '$lib/services/address.services';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';

	$: $btcAddressMainnetStore,
		(async () =>
			NETWORK_BITCOIN_ENABLED
				? await validateBtcAddressMainnet($btcAddressMainnetStore)
				: await Promise.resolve())();

	$: $ethAddressStore, (async () => await validateEthAddress($ethAddressStore))();
</script>

<slot />
