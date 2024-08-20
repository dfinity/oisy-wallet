<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { nonNullish } from '@dfinity/utils';
	import { certifyBtcAddressMainnet, certifyEthAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import {
		btcAddressMainnet,
		btcAddressMainnetNotCertified,
		ethAddress,
		ethAddressNotCertified
	} from '$lib/derived/address.derived';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env.js';

	const validateAddress = async () => {
		if (!$btcAddressMainnetNotCertified && !$ethAddressNotCertified) {
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

		const { success, err } = results.reduce(
			(acc, { success: s, err: e }) => ({
				success: acc.success && s,
				err: nonNullish(e) ? (acc.err ? `${acc.err}, ${e}` : e) : acc.err
			}),
			{ success: true }
		);

		if (success) {
			// The addresses are valid
			return;
		}

		await warnSignOut(err ?? 'Error while certifying your address');
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
