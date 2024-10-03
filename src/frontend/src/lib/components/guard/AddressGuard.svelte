<script lang="ts">
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
	import { validateBtcAddressMainnet, validateEthAddress } from '$lib/services/address.services';
	import { signOut } from '$lib/services/auth.services';
	import { initSignerAllowance } from '$lib/services/loader.services';
	import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';

	let signerAllowanceLoaded = false;

	const loadSignerAllowanceAndValidateAddresses = async () => {
		const { success: initSignerAllowanceSuccess } = await initSignerAllowance();

		if (!initSignerAllowanceSuccess) {
			await signOut();
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
			...(NETWORK_BITCOIN_ENABLED ? [validateBtcAddressMainnet($btcAddressMainnetStore)] : [])
		]);
	};

	$: $btcAddressMainnetStore, $ethAddressStore, (async () => await validateAddresses())();
</script>

<svelte:window on:oisyValidateAddresses={loadSignerAllowanceAndValidateAddresses} />

<slot />
