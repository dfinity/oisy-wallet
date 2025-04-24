<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLMainnet,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { splTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { initSolWalletWorker as initWalletWorker } from '$sol/services/worker.sol-wallet.services';

	let walletWorkerTokens: Token[];
	$: walletWorkerTokens = [...$enabledSolanaTokens, ...$splTokens].filter(
		({ network: { id: networkId } }) =>
			(isNetworkIdSOLLocal(networkId) && nonNullish($solAddressLocal)) ||
			(isNetworkIdSOLTestnet(networkId) && nonNullish($solAddressTestnet)) ||
			(isNetworkIdSOLDevnet(networkId) && nonNullish($solAddressDevnet)) ||
			(isNetworkIdSOLMainnet(networkId) && nonNullish($solAddressMainnet))
	);
</script>

<WalletWorkers tokens={walletWorkerTokens} {initWalletWorker}>
	<slot />
</WalletWorkers>
