<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import type { InitWalletWorkerFn } from '$lib/types/listener';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		mapBitcoinNetworkIdToMinterCanisterId
	} from '$lib/utils/network.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	let walletWorkerTokens = $derived.by(() =>
		$enabledBitcoinTokens.filter(
			({ network: { id: networkId } }) =>
				(isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest)) ||
				(isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet)) ||
				(isNetworkIdBTCMainnet(networkId) && nonNullish($btcAddressMainnet))
		)
	);

	const initWalletWorker: InitWalletWorkerFn = ({ token }) => {
		const minterCanisterId = mapBitcoinNetworkIdToMinterCanisterId(token.network.id);

		return initBtcWalletWorker({
			token,
			minterCanisterId
		});
	};
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
