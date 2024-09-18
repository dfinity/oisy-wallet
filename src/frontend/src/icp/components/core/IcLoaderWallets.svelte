<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import { cleanWorkers, loadWorker } from '$icp/utils/ic-wallet.utils';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import type { WalletWorker } from '$lib/types/listener';
	import type { TokenId } from '$lib/types/token';

	const workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		cleanWorkers({ workers, tokens: $enabledIcTokens });

		await Promise.allSettled(
			$enabledIcTokens.map(async (token: IcToken) => await loadWorker({ workers, token }))
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	// TODO: here we debounce the manageWorkers function to avoid multiple calls in a short period
	//  of time due to the several dependencies of enabledIcTokens, that are not strictly only IC tokens.
	//  This is a temporary solution, and we should find a better way to handle this, improving the store.
	$: $enabledIcTokens, debounceManageWorkers();

	onDestroy(() => {
		workers.forEach((worker) => worker.stop());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
