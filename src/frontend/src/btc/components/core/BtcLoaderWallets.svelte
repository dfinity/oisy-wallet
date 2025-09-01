<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { initBtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import {
		IC_CKBTC_MINTER_CANISTER_ID,
		STAGING_CKBTC_MINTER_CANISTER_ID,
		LOCAL_CKBTC_MINTER_CANISTER_ID
	} from '$env/networks/networks.icrc.env';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { LOCAL } from '$lib/constants/app.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
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

	// Debug minter canister IDs
	$effect(() => {
		console.warn('Debug ckBTC minter canister IDs:', {
			mainnet: IC_CKBTC_MINTER_CANISTER_ID,
			testnet: STAGING_CKBTC_MINTER_CANISTER_ID,
			local: LOCAL_CKBTC_MINTER_CANISTER_ID,
			isLocal: LOCAL
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

	const initWalletWorker: InitWalletWorkerFn = ({ token }) => {
		let minterCanisterId;

		if (isNetworkIdBTCMainnet(token.network.id)) {
			minterCanisterId = IC_CKBTC_MINTER_CANISTER_ID;
		} else if (isNetworkIdBTCTestnet(token.network.id)) {
			minterCanisterId = LOCAL ? LOCAL_CKBTC_MINTER_CANISTER_ID : STAGING_CKBTC_MINTER_CANISTER_ID;
		}
		// For regtest, minterCanisterId remains undefined

		return initBtcWalletWorker({
			token,
			minterCanisterId
		});
	};
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
