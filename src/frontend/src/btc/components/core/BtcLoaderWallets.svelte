<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import type { IcCkToken } from '$icp/types/ic-token';
	import { isIcCkToken } from '$icp/validation/ic-token.validation';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
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

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Find all ckBTC tokens (there may be multiple for different environments)
	let ckBtcTokens = $derived(
		$tokens.filter((token): token is IcCkToken => token.symbol === 'ckBTC' && isIcCkToken(token))
	);

	// Find the mainnet ckBTC token (environment: mainnet)
	let ckBtcMainnetToken = $derived(ckBtcTokens.find((token) => token.network.env === 'mainnet'));

	// Find the testnet ckBTC token (environment: testnet)
	let ckBtcTestnetToken = $derived(ckBtcTokens.find((token) => token.network.env === 'testnet'));

	// Debug ckBTC tokens
	$effect(() => {
		console.warn('Debug ckBTC tokens:', {
			mainnet: ckBtcMainnetToken
				? {
						symbol: ckBtcMainnetToken.symbol,
						network: ckBtcMainnetToken.network.name,
						env: ckBtcMainnetToken.network.env,
						minterCanisterId: ckBtcMainnetToken.minterCanisterId
					}
				: undefined,
			testnet: ckBtcTestnetToken
				? {
						symbol: ckBtcTestnetToken.symbol,
						network: ckBtcTestnetToken.network.name,
						env: ckBtcTestnetToken.network.env,
						minterCanisterId: ckBtcTestnetToken.minterCanisterId
					}
				: undefined
		});
	});

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	let walletWorkerTokens = $derived.by(() =>
		$enabledBitcoinTokens.filter(
			({ network: { id: networkId } }) =>
				(isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest)) ||
				(isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet)) ||
				(isNetworkIdBTCMainnet(networkId) && nonNullish($btcAddressMainnet))
		)
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
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
