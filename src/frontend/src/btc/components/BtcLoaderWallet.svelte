<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { enabledBtcTokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import type { WalletWorker } from '$lib/types/wallet';
	import { cleanWorkers, loadWorker } from '$lib/utils/wallet.utils';

	const workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		cleanWorkers({ workers, tokens: $enabledBtcTokens });

		await Promise.allSettled(
			$enabledBtcTokens.map(async (token) => await loadWorker({ workers, token }))
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	$: $enabledBtcTokens, debounceManageWorkers();

	onDestroy(() => {
		workers.forEach((worker) => worker.stop());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
