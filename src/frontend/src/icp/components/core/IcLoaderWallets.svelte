<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import type { WalletWorker } from '$icp/types/ic-listener';
	import { cleanWorkers, loadWorker } from '$icp/utils/ic-wallet.utils';
	import { enabledIcNetworkTokens } from '$lib/derived/network-tokens.derived';
	import type { TokenId } from '$lib/types/token';

	const workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		cleanWorkers({ workers, tokens: $enabledIcNetworkTokens });

		await Promise.allSettled(
			$enabledIcNetworkTokens.map(async (token: IcToken) => await loadWorker({ workers, token }))
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	// TODO: here we debounce the manageWorkers function to avoid multiple calls in a short period
	//  of time due to the several dependencies of enabledIcNetworkTokens, that are not strictly only IC tokens.
	//  This is a temporary solution, and we should find a better way to handle this, improving the store.
	$: $enabledIcNetworkTokens, debounceManageWorkers();

	onDestroy(() => {
		workers.forEach((worker) => worker.stop());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
