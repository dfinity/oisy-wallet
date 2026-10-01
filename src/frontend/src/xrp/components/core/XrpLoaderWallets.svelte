<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { isNetworkIdXRPMainnet } from '$lib/utils/network.utils';
	import XrpLoaderTrustLineTokens from '$xrp/components/core/XrpLoaderTrustLineTokens.svelte';
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

{#if XRP_TRUST_LINE_TOKENS_ENABLED}
	<XrpLoaderTrustLineTokens />
{/if}
