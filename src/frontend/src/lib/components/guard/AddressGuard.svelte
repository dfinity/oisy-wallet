<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { certifyBtcAddressMainnet, certifyEthAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import {
		addressesCertified,
		btcAddressMainnet,
		btcAddressMainnetNotCertified,
		ethAddress,
		ethAddressNotCertified
	} from '$lib/derived/address.derived';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env.js';

	const validateAddress = async () => {
		if ($addressesCertified) {
			// The addresses are certified, all good
			return;
		}

		const results = await Promise.all([
			NETWORK_BITCOIN_ENABLED && nonNullish($btcAddressMainnet) && $btcAddressMainnetNotCertified
				? certifyBtcAddressMainnet($btcAddressMainnet)
				: Promise.resolve({ success: true, err: null }),
			nonNullish($ethAddress) && $ethAddressNotCertified
				? certifyEthAddress($ethAddress)
				: Promise.resolve({ success: true, err: null })
		]);

		let err: string | undefined = undefined;

		results.map(({ success, err: e }) => {
			if (!success && nonNullish(e)) {
				err = isNullish(err) ? e : `${err}, ${e}`;
			}
		});

		if (nonNullish(err)) {
			await warnSignOut(err);
		}
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
