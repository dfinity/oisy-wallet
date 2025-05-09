<script lang="ts">
	import { validateBtcAddressMainnet } from '$btc/services/btc-address.services';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import { validateEthAddress } from '$eth/services/eth-address.services';
	import {
		networkBitcoinMainnetEnabled,
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { hasRequiredCycles, initSignerAllowance } from '$lib/services/loader.services';
	import {
		btcAddressMainnetStore,
		ethAddressStore,
		solAddressMainnetStore
	} from '$lib/stores/address.store';
	import { validateSolAddressMainnet } from '$sol/services/sol-address.services';

	let signerAllowanceLoaded = false;

	const loadSignerAllowanceAndValidateAddresses = async () => {
		let initSignerAllowanceSuccess = false;

		if (POW_FEATURE_ENABLED) {
			// The new feature checks whether the user has sufficient cycles to continue
			initSignerAllowanceSuccess = (await hasRequiredCycles()).success;
		} else {
			// Until we remove the feature flag, we must preserve the previous behavior
			initSignerAllowanceSuccess = (await initSignerAllowance()).success;
		}

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
			$networkEthereumEnabled || $networkEvmMainnetEnabled
				? validateEthAddress($ethAddressStore)
				: Promise.resolve(),
			$networkBitcoinMainnetEnabled
				? validateBtcAddressMainnet($btcAddressMainnetStore)
				: Promise.resolve(),
			$networkSolanaMainnetEnabled
				? validateSolAddressMainnet($solAddressMainnetStore)
				: Promise.resolve()
		]);
	};

	$: $btcAddressMainnetStore,
		$ethAddressStore,
		$solAddressMainnetStore,
		$networkBitcoinMainnetEnabled,
		$networkEthereumEnabled,
		$networkEvmMainnetEnabled,
		$networkSolanaMainnetEnabled(async () => await validateAddresses())();
</script>

<svelte:window on:oisyValidateAddresses={loadSignerAllowanceAndValidateAddresses} />

<slot />
