<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish } from '@dfinity/utils';
	import { certifyAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';
	import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';

	const validateAddress = async () => {
		const ethAddressData = $addressStore?.[ETHEREUM_TOKEN_ID];

		if (isNullish(ethAddressData)) {
			// No address is loaded, we don't have to verify it
			return;
		}

		const { certified, data: ethAddress } = ethAddressData;

		if (certified === true) {
			// The address is certified, all good
			return;
		}

		const { success, err } = await certifyAddress(ethAddress);

		if (success) {
			// The address is valid
			return;
		}

		await warnSignOut(err ?? 'Error while certifying your address');
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
