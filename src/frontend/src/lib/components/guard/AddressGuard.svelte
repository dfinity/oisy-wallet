<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { certifyBtcAddressMainnet, certifyEthAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import {
		btcAddressMainnet,
		btcAddressMainnetData,
		btcAddressMainnetNotCertified,
		ethAddress,
		ethAddressData,
		ethAddressNotCertified
	} from '$lib/derived/address.derived';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env.js';
	import type { ResultSuccess } from '$lib/types/utils';

	const validateAddress = async () => {
		if (isNullish($btcAddressMainnetData) && isNullish($ethAddressData)) {
			// No address is loaded, we don't have to verify it
			return;
		}

		if (!$btcAddressMainnetNotCertified && !$ethAddressNotCertified) {
			// The addresses are certified, all good
			return;
		}

		const results = await Promise.all([
			NETWORK_BITCOIN_ENABLED && nonNullish($btcAddressMainnet) && $btcAddressMainnetNotCertified
				? certifyBtcAddressMainnet($btcAddressMainnet)
				: Promise.resolve<ResultSuccess<never>>({ success: true }),
			nonNullish($ethAddress) && $ethAddressNotCertified
				? certifyEthAddress($ethAddress)
				: Promise.resolve<ResultSuccess<never>>({ success: true })
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
