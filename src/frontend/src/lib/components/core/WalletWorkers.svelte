<script lang="ts" module>
	import type { Token } from '$lib/types/token';

	type T = Token;
</script>

<script generics="T extends Token = Token" lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { InitWalletWorkerFn, WalletWorker } from '$lib/types/listener';
	import type { TokenId } from '$lib/types/token';
	import { cleanWorkers, loadWorker } from '$lib/utils/wallet.utils';

	interface Props {
		tokens: T[];
		initWalletWorker: InitWalletWorkerFn<T>;
		children?: Snippet;
	}

	let { tokens, initWalletWorker, children }: Props = $props();

	const workers = new SvelteMap<TokenId, WalletWorker>();

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
	$effect(() => {
		// To trigger the manageWorkers function when any of the dependencies change.
		[tokens];
		debounceManageWorkers();
	});

	onDestroy(() => {
		workers.forEach((worker) => worker.destroy());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());

	const debounceTriggerTimer = debounce(triggerTimer, 1000);
</script>

<svelte:window onoisyTriggerWallet={debounceTriggerTimer} />

{@render children?.()}
