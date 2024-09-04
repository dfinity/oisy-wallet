<script lang="ts">
	import { ethAddressStore } from '$lib/stores/address.store';
	import { isNullish } from '@dfinity/utils';
	import { certifyEthAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';

	const validateAddress = async () => {
		if (isNullish($ethAddressStore)) {
			// No address is loaded, we don't have to verify it
			return;
		}

		if ($ethAddressStore.certified === true) {
			// The address is certified, all good
			return;
		}

		const { success, err } = await certifyEthAddress($ethAddressStore.data);

		if (success) {
			// The address is valid
			return;
		}

		await warnSignOut(err ?? 'Error while certifying your address');
	};

	$: $ethAddressStore, (async () => await validateAddress())();
</script>

<slot />
