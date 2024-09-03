<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { WalletWorker } from '$icp/types/ic-listener';
	import { enabledIcNetworkTokens } from '$lib/derived/network-tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import { debounce } from '@dfinity/utils';
	import { cleanWorkers, loadWorker } from '$icp/utils/ic-wallet.utils';
	import type { IcToken } from '$icp/types/ic';

	const workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		cleanWorkers({ workers, tokens: $enabledIcNetworkTokens });

		await Promise.allSettled(
			$enabledIcNetworkTokens.map(async (token: IcToken) => await loadWorker({ workers, token }))
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	$: $enabledIcNetworkTokens, debounceManageWorkers();

	onDestroy(() => {
		workers.forEach((worker) => worker.stop());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
