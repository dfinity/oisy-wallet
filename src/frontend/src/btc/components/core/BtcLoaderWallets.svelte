<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
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

	let ckBtcMainnetToken = $derived(
		findTwinToken({
			tokenToPair: BTC_MAINNET_TOKEN,
			tokens: $tokens
		})
	);

	let ckBtcTestnetToken = $derived(
		findTwinToken({
			tokenToPair: BTC_TESTNET_TOKEN,
			tokens: $tokens
		})
	);

	let walletWorkerTokens = $derived(
		$enabledBitcoinTokens.filter(({ network: { id: networkId } }) => {
			const isRegtest = isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest);
			const isTestnet = isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet);
			const isMainnet = isNetworkIdBTCMainnet(networkId) && nonNullish($btcAddressMainnet);

			// Debug logging
			console.log('Bitcoin token filter:', {
				networkId: networkId.toString(),
				isRegtest: {
					check: isNetworkIdBTCRegtest(networkId),
					address: !!$btcAddressRegtest,
					result: isRegtest
				},
				isTestnet: {
					check: isNetworkIdBTCTestnet(networkId),
					address: !!$btcAddressTestnet,
					result: isTestnet
				},
				isMainnet: {
					check: isNetworkIdBTCMainnet(networkId),
					address: !!$btcAddressMainnet,
					result: isMainnet
				},
				passes: isRegtest || isTestnet || isMainnet
			});

			return isRegtest || isTestnet || isMainnet;
		})
	);

	const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
		initBtcWalletWorker({
			token,
			// Only provide minterCanisterId for mainnet and testnet networks.
			// Regtest networks don't get a minterCanisterId (undefined), which is correct
			// as the initBtcWalletWorker function signature has minterCanisterId as optional,
			// so regtest will fall back to the signer API for balance queries.
			...((isNetworkIdBTCMainnet(token.network.id) || isNetworkIdBTCTestnet(token.network.id)) && {
				minterCanisterId: isNetworkIdBTCMainnet(token.network.id)
					? ckBtcMainnetToken?.minterCanisterId
					: ckBtcTestnetToken?.minterCanisterId
			})
		});

	// Debug the final result
	$effect(() => {
		console.log(
			'Final walletWorkerTokens:',
			walletWorkerTokens.map((t) => ({
				symbol: t.symbol,
				networkId: t.network.id.toString(),
				networkName: t.network.name
			}))
		);
	});
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
