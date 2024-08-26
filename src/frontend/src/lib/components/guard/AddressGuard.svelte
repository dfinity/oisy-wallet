<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { certifyBtcAddressMainnet, certifyEthAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import {
		btcAddressMainnet,
		btcAddressMainnetCertified,
		btcAddressMainnetData,
		btcAddressMainnetNotCertified,
		ethAddress,
		ethAddressCertified,
		ethAddressData,
		ethAddressNotCertified
	} from '$lib/derived/address.derived';
	import type { ResultSuccess } from '$lib/types/utils';
	import { reduceResults } from '$lib/utils/results.utils';

	const validateAddress = async () => {
		if (isNullish($btcAddressMainnetData) && isNullish($ethAddressData)) {
			// No address is loaded, we don't have to verify it
			return;
		}

		if ($btcAddressMainnetCertified && $ethAddressCertified) {
			// The addresses are certified, all good
			return;
		}

		const results = await Promise.all([
			nonNullish($btcAddressMainnet) && $btcAddressMainnetNotCertified
				? certifyBtcAddressMainnet($btcAddressMainnet)
				: Promise.resolve<ResultSuccess<never>>({ success: true }),
			nonNullish($ethAddress) && $ethAddressNotCertified
				? certifyEthAddress($ethAddress)
				: Promise.resolve<ResultSuccess<never>>({ success: true })
		]);

		const { success, err } = reduceResults<string>(results);

		if (success) {
			// The addresses are valid
			return;
		}

		await warnSignOut(nonNullish(err) ? err.join(', ') : 'Error while certifying your address');
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
