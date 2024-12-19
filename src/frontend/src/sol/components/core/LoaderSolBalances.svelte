<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { loadSolBalance } from '$sol/services/sol-balance.services';

	const load = async () => {
		await Promise.allSettled([
			...(nonNullish($solAddressMainnet)
				? [
						await loadSolBalance({
							address: $solAddressMainnet,
							token: SOLANA_TOKEN
						})
					]
				: []),
			...(nonNullish($solAddressTestnet)
				? [
						await loadSolBalance({
							address: $solAddressTestnet,
							token: SOLANA_TESTNET_TOKEN
						})
					]
				: []),
			...(nonNullish($solAddressDevnet)
				? [
						await loadSolBalance({
							address: $solAddressDevnet,
							token: SOLANA_DEVNET_TOKEN
						})
					]
				: []),
			...(nonNullish($solAddressLocal)
				? [
						await loadSolBalance({
							address: $solAddressLocal,
							token: SOLANA_LOCAL_TOKEN
						})
					]
				: [])
		]);
	};

	const debounceLoad = debounce(load, 500);

	$: $solAddressMainnet, $solAddressTestnet, $solAddressDevnet, $solAddressLocal, debounceLoad();
</script>

<slot />
