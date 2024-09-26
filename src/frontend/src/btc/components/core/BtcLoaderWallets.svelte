<script lang="ts">
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import { BTC_REGTEST_NETWORK_ID } from '$env/networks.env';
	import LoaderWallets from '$lib/components/core/LoaderWallets.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import { enabledBtcTokens } from '$lib/derived/tokens.derived';
	import type { InitWalletWorkerFn } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';

	let tokens: Token[];

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	$: tokens = $enabledBtcTokens.filter((token) =>
		LOCAL
			? token.network.id === BTC_REGTEST_NETWORK_ID
			: token.network.id !== BTC_REGTEST_NETWORK_ID
	);

	const initWalletWorker: InitWalletWorkerFn = ({ token }) => initBtcWalletWorker(token);
</script>

<LoaderWallets {tokens} {initWalletWorker}>
	<slot />
</LoaderWallets>
