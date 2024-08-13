<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish } from '@dfinity/utils';
	import { certifyAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import { addressCertified } from '$lib/derived/address.derived';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';

	const validateAddress = async () => {
		if (isNullish($addressStore?.[ETHEREUM_TOKEN_ID])) {
			// No address is loaded, we don't have to verify it
			return;
		}

		if ($addressCertified) {
			// The address is certified, all good
			return;
		}

		const { success, err } = await certifyAddress($addressStore[ETHEREUM_TOKEN_ID].data.address);

		if (success) {
			// The address is valid
			return;
		}

		await warnSignOut(err ?? 'Error while certifying your address');
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
