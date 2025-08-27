<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import type { InitWalletWorkerFn } from '$lib/types/listener';
	import {
		isNetworkIdBTCMainnet,
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet
	} from '$lib/utils/network.utils';
	import { findTwinToken } from '$lib/utils/token.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let ckBtcToken = $derived(
		findTwinToken({
			tokenToPair: BTC_MAINNET_TOKEN,
			tokens: $tokens
		})
	);

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	let walletWorkerTokens = $derived(
		$enabledBitcoinTokens.filter(({ network: { id: networkId } }) =>
			LOCAL
				? isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest)
				: !isNetworkIdBTCRegtest(networkId) &&
					((isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet)) ||
						// To query mainnet BTC balance, we need to wait for ckBtcToken.minterCanisterId to be available
						(nonNullish(ckBtcToken) &&
							isNetworkIdBTCMainnet(networkId) &&
							nonNullish($btcAddressMainnet)))
		)
	);

	const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
		initBtcWalletWorker({
			token,
			...(isNetworkIdBTCMainnet(token.network.id) && {
				minterCanisterId: ckBtcToken?.minterCanisterId
			})
		});
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
