<script lang="ts">
	import { validateBtcAddressMainnet } from '$btc/services/btc-address.services';
	import { validateEthAddress } from '$eth/services/eth-address.services';
	import { initSignerAllowance } from '$lib/services/loader.services';
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';

	let signerAllowanceLoaded = false;

	const loadSignerAllowanceAndValidateAddresses = async () => {
		const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

		if (!initSignerAllowanceSuccess) {
			// Sign-out is handled within the service.
			return;
		}

		signerAllowanceLoaded = true;

		await validateAddresses();
	};

	const validateAddresses = async () => {
		if (!signerAllowanceLoaded) {
			return;
		}

		await Promise.allSettled([
			validateEthAddress($ethAddressStore),
			validateBtcAddressMainnet($btcAddressMainnetStore)
		]);
	};

	$: $btcAddressMainnetStore, $ethAddressStore, (async () => await validateAddresses())();
</script>

<svelte:window on:oisyValidateAddresses={loadSignerAllowanceAndValidateAddresses} />

<slot />
