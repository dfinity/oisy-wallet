<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { BtcWalletWorker } from '$btc/services/worker.btc-wallet.services';
	import { IC_CKBTC_MINTER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
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

	// Locally, only the Regtest worker has to be launched, in all other envs - testnet and mainnet
	let walletWorkerTokens = $derived(
		$enabledBitcoinTokens.filter(({ network: { id: networkId } }) =>
			LOCAL
				? isNetworkIdBTCRegtest(networkId) && nonNullish($btcAddressRegtest)
				: !isNetworkIdBTCRegtest(networkId) &&
					((isNetworkIdBTCTestnet(networkId) && nonNullish($btcAddressTestnet)) ||
						(isNetworkIdBTCMainnet(networkId) && nonNullish($btcAddressMainnet)))
		)
	);

	// The minter canister id is only a lookup key into BITCOIN_CANISTER_IDS; reading it from the
	// env constant instead of the loaded ckBTC token keeps the BTC balance independent of the
	// ckBTC ledger, which would otherwise stall the worker whenever that ledger is unreachable.
	const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
		BtcWalletWorker.init({
			token,
			...(isNetworkIdBTCMainnet(token.network.id) && {
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
			})
		});
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens} />
