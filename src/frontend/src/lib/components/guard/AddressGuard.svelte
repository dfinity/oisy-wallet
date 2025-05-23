<script lang="ts">
	import { validateBtcAddressMainnet } from '$btc/services/btc-address.services';
	import { validateEthAddress } from '$eth/services/eth-address.services';
	import {
		networkBitcoinMainnetEnabled,
		networkEthereumEnabled,
		networkEvmMainnetEnabled,
		networkSolanaMainnetEnabled
	} from '$lib/derived/networks.derived';
	import { initSignerAllowance } from '$lib/services/loader.services';
	import {
		btcAddressMainnetStore,
		ethAddressStore,
		solAddressMainnetStore
	} from '$lib/stores/address.store';
	import { validateSolAddressMainnet } from '$sol/services/sol-address.services';

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
		$networkSolanaMainnetEnabled,
		(async () => await validateAddresses())();
</script>

<svelte:window on:oisyValidateAddresses={loadSignerAllowanceAndValidateAddresses} />

<slot />
