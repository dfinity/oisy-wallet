<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLMainnet
	} from '$lib/utils/network.utils';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { SolWalletWorker } from '$sol/services/worker.sol-wallet.services';
	import type { SplToken } from '$sol/types/spl';

	interface NetworkWallet {
		token: Token;
		splTokens: SplToken[];
		// The address and the token list the worker is started with: a worker never changes them.
		key: string;
	}

	// One worker per Solana network with an address: its native token and its enabled SPL tokens.
	let networkWallets: NetworkWallet[] = $derived(
		$enabledSolanaTokens.reduce<NetworkWallet[]>((acc, token) => {
			const {
				network: { id: networkId }
			} = token;

			const address = isNetworkIdSOLLocal(networkId)
				? $solAddressLocal
				: isNetworkIdSOLDevnet(networkId)
					? $solAddressDevnet
					: isNetworkIdSOLMainnet(networkId)
						? $solAddressMainnet
						: undefined;

			if (isNullish(address)) {
				return acc;
			}

			const splTokens = $enabledSplTokens.filter(({ network: { id } }) => id === networkId);

			const key = JSON.stringify([
				address,
				splTokens.map(({ address: tokenAddress, owner }) => `${tokenAddress}:${owner}`).sort()
			]);

			return [...acc, { token, splTokens, key }];
		}, [])
	);

	const workers = new SvelteMap<NetworkId, { key: string; worker: SolWalletWorker }>();

	let destroyed = false;

	const destroyWorker = (networkId: NetworkId) => {
		workers.get(networkId)?.worker.destroy();
		workers.delete(networkId);
	};

	const manageWorkers = async () => {
		const wanted = networkWallets;

		[...workers.keys()]
			.filter((networkId) => !wanted.some(({ token: { network } }) => network.id === networkId))
			.forEach(destroyWorker);

		await Promise.allSettled(
			wanted.map(async ({ token, splTokens, key }) => {
				const {
					network: { id: networkId }
				} = token;

				const current = workers.get(networkId);

				if (current?.key === key) {
					return;
				}

				destroyWorker(networkId);

				const worker = await SolWalletWorker.init({
					token,
					splTokens,
					cachedTokenIds: new Set(current?.worker.tokenIds)
				});

				if (destroyed) {
					worker.destroy();
					return;
				}

				worker.start();

				workers.set(networkId, { key, worker });
			})
		);
	};

	// Runs one pass at a time: an init awaits the IndexedDB cache, and two overlapping passes would
	// both start a worker for the same network.
	let managing = Promise.resolve();

	const debounceManageWorkers = debounce(() => {
		managing = managing.then(manageWorkers);
	}, 500);

	$effect(() => {
		// To trigger the manageWorkers function when any of the dependencies change.
		[networkWallets];
		debounceManageWorkers();
	});

	onDestroy(() => {
		destroyed = true;
		workers.forEach(({ worker }) => worker.destroy());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach(({ worker }) => worker.trigger());

	const debounceTriggerTimer = debounce(triggerTimer, 1000);
</script>

<svelte:window onoisyTriggerWallet={debounceTriggerTimer} />
