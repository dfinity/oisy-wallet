<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { kaspaAddressMainnet, kaspaAddressTestnet } from '$lib/derived/address.derived';
	import { enabledKaspaTokens } from '$kaspa/derived/tokens.derived';
	import { KaspaWalletWorker } from '$kaspa/services/worker.kaspa-wallet.services';
	import { isNetworkIdKaspaTestnet } from '$kaspa/utils/kaspa-network.utils';

	let walletWorkerTokens = $derived(
		$enabledKaspaTokens.filter(
			({ network: { id: networkId } }) =>
				(isNetworkIdKaspaTestnet(networkId) && nonNullish($kaspaAddressTestnet)) ||
				(!isNetworkIdKaspaTestnet(networkId) && nonNullish($kaspaAddressMainnet))
		)
	);
</script>

<WalletWorkers initWalletWorker={KaspaWalletWorker.init} tokens={walletWorkerTokens} />
