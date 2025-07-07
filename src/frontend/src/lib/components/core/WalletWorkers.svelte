<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { InitWalletWorkerFn, WalletWorker } from '$lib/types/listener';
	import type { Token, TokenId } from '$lib/types/token';
	import { cleanWorkers, loadWorker } from '$lib/utils/wallet.utils';

	export let tokens: Token[];
	export let initWalletWorker: InitWalletWorkerFn;

	const workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		cleanWorkers({ workers, tokens });

		await Promise.allSettled(
			tokens.map(async (token) => await loadWorker({ workers, token, initWalletWorker }))
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	// TODO: here we debounce the manageWorkers function to avoid multiple calls in a short period
	//  of time due to the several dependencies of enabledIcTokens, that are not strictly only IC tokens.
	//  This is a temporary solution, and we should find a better way to handle this, improving the store.
	$: tokens, debounceManageWorkers();

	onDestroy(() => {
		workers.forEach((worker) => worker.destroy());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
