<script lang="ts" module>
	import type { Token, TokenId } from '$lib/types/token';

	type T = Token;
</script>

<script generics="T extends Token = Token" lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { registerWalletRefresh } from '$lib/services/wallet-refresh.services';
	import type { InitWalletWorkerFn, WalletWorker } from '$lib/types/listener';
	import { cleanWorkers, loadWorker } from '$lib/utils/wallet.utils';

	interface Props {
		tokens: T[];
		initWalletWorker: InitWalletWorkerFn<T>;
		refreshReady?: boolean;
	}

	let { tokens, initWalletWorker, refreshReady = true }: Props = $props();

	const workers = new SvelteMap<TokenId, WalletWorker>();

	let destroyed = false;
	let managing = Promise.resolve();
	const manageWorkers = async () => {
		if (destroyed) {
			return;
		}
		cleanWorkers({ workers, tokens });

		await Promise.allSettled(
			tokens.map(async (token) => await loadWorker({ workers, token, initWalletWorker }))
		);

		// Initialisation may have completed after the component was removed.
		if (destroyed) {
			workers.forEach((worker) => worker.destroy());
			workers.clear();
		}
	};

	const debounceManageWorkers = debounce(() => {
		managing = managing.then(manageWorkers);
	}, 500);

	// TODO: here we debounce the manageWorkers function to avoid multiple calls in a short period
	//  of time due to the several dependencies of enabledIcTokens, that are not strictly only IC tokens.
	//  This is a temporary solution, and we should find a better way to handle this, improving the store.
	$effect(() => {
		// To trigger the manageWorkers function when any of the dependencies change.
		[tokens];
		debounceManageWorkers();
	});

	onDestroy(() => {
		destroyed = true;
		workers.forEach((worker) => worker.destroy());
		workers.clear();
	});

	onMount(() =>
		MOBILE_SHELL
			? registerWalletRefresh({
					kind: 'wallet',
					refresh: async (signal) => {
						if (!refreshReady) {
							throw new Error('Wallet address unavailable');
						}
						managing = managing.then(manageWorkers);
						await managing;
						signal.throwIfAborted();
						await Promise.all(
							tokens.map(({ id }) => {
								const worker = workers.get(id);
								if (!worker?.refresh) {
									throw new Error('Wallet worker unavailable');
								}
								return worker.refresh(signal);
							})
						);
					}
				})
			: undefined
	);

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());

	const debounceTriggerTimer = debounce(triggerTimer, 1000);
</script>

<svelte:window onoisyTriggerWallet={debounceTriggerTimer} />
