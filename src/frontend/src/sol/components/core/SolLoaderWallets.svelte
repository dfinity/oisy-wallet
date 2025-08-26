<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLMainnet
	} from '$lib/utils/network.utils';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { initSolWalletWorker as initWalletWorker } from '$sol/services/worker.sol-wallet.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let walletWorkerTokens = $derived(
		[...$enabledSolanaTokens, ...$enabledSplTokens].filter(
			({ network: { id: networkId } }) =>
				(isNetworkIdSOLLocal(networkId) && nonNullish($solAddressLocal)) ||
				(isNetworkIdSOLDevnet(networkId) && nonNullish($solAddressDevnet)) ||
				(isNetworkIdSOLMainnet(networkId) && nonNullish($solAddressMainnet))
		)
	);
</script>

<WalletWorkers {initWalletWorker} tokens={walletWorkerTokens}>
	{@render children()}
</WalletWorkers>
