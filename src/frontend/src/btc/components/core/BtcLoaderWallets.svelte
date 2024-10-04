<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { enabledBtcTokens } from '$lib/derived/tokens.derived';
	import type { InitWalletWorkerFn } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet
	} from '$lib/utils/network.utils';

	let tokens: Token[];

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	$: tokens = $enabledBtcTokens.filter(({ network: { id: networkId } }) =>
		LOCAL
			? isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest)
			: !isNetworkIdBTCRegtest(networkId) &&
				((isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet)) ||
					(isNetworkIdBTCMainnet(networkId) && nonNullish($btcAddressMainnet)))
	);

	const initWalletWorker: InitWalletWorkerFn = ({ token }) => initBtcWalletWorker(token);
</script>

<WalletWorkers {tokens} {initWalletWorker}>
	<slot />
</WalletWorkers>
