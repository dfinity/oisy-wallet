<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import {
		SOLANA_DEVNET_NETWORK_ID,
		SOLANA_LOCAL_NETWORK_ID,
		SOLANA_MAINNET_NETWORK_ID,
		SOLANA_TESTNET_NETWORK_ID
	} from '$env/networks/networks.sol.env';
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

	const loadMainnet = debounce(
		() => loadSolBalance({ networkId: SOLANA_MAINNET_NETWORK_ID, tokenId: SOLANA_TOKEN.id }),
		500
	);

	const loadTestnet = debounce(
		() => loadSolBalance({ networkId: SOLANA_TESTNET_NETWORK_ID, tokenId: SOLANA_TESTNET_TOKEN.id }),
		500
	);

	const loadDevnet = debounce(
		() => loadSolBalance({ networkId: SOLANA_DEVNET_NETWORK_ID, tokenId: SOLANA_DEVNET_TOKEN.id }),
		500
	);

	const loadLocal = debounce(
		() => loadSolBalance({ networkId: SOLANA_LOCAL_NETWORK_ID, tokenId: SOLANA_LOCAL_TOKEN.id }),
		500
	);

	// Call the debounced functions when addresses change
	$: $solAddressMainnet && loadMainnet();
	$: $solAddressTestnet && loadTestnet();
	$: $solAddressDevnet && loadDevnet();
	$: $solAddressLocal && loadLocal();
</script>

<slot />
