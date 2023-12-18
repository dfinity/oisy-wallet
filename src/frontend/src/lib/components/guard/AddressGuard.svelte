<script lang="ts">
	import { addressStore } from '$lib/stores/address.store';
	import { isNullish } from '@dfinity/utils';
	import { certifyAddress } from '$lib/services/address.services';
	import { warnSignOut } from '$lib/services/auth.services';

	const validateAddress = async () => {
		if (isNullish($addressStore)) {
			// No address is loaded, we don't have to verify it
			return;
		}

		if ($addressStore.certified === true) {
			// The address is certified, all good
			return;
		}

		const { success, err } = await certifyAddress($addressStore.address);

		if (success) {
			// The address is valid
			return;
		}

		await warnSignOut(err ?? 'Error while certifying your address');
	};

	$: $addressStore, (async () => await validateAddress())();
</script>

<slot />
