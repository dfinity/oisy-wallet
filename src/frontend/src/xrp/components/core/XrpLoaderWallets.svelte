<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { isNetworkIdXRPMainnet } from '$lib/utils/network.utils';
	import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
	import { XrpWalletWorker } from '$xrp/services/worker.xrp-wallet.services';

	let walletWorkerTokens = $derived(
		$enabledXrpTokens.filter(
			({ network: { id: networkId } }) =>
				isNetworkIdXRPMainnet(networkId) && nonNullish($xrpAddressMainnet)
		)
	);
</script>

<WalletWorkers initWalletWorker={XrpWalletWorker.init} tokens={walletWorkerTokens} />
