<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Token, TokenId } from '$lib/types/token';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLMainnet
	} from '$lib/utils/network.utils';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { SolWalletWorker } from '$sol/services/worker.sol-wallet.services';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { SolAddress } from '$sol/types/address';
	import type { SplToken } from '$sol/types/spl';

	// The address, the token list and the token ids the worker is started with: a worker never
	// changes them. A custom SPL token's id comes from its symbol, so it can change while its mint
	// and program stay the same, and the worker would go on writing under the old id. Token ids are
	// symbols, equal only to themselves, so the key is compared entry by entry.
	type WorkerKey = (string | TokenId)[];

	interface NetworkWallet {
		token: Token;
		splTokens: SplToken[];
		address: SolAddress;
		key: WorkerKey;
	}

	const sameKey = ({ current, next }: { current: WorkerKey; next: WorkerKey }): boolean =>
		current.length === next.length && current.every((entry, index) => entry === next[index]);

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

			const key: WorkerKey = [
				address,
				token.id,
				...splTokens
					.map(({ address: tokenAddress, owner, id }) => ({
						source: `${tokenAddress}:${owner}`,
						id
					}))
					.sort(({ source: sourceA }, { source: sourceB }) => sourceA.localeCompare(sourceB))
					.flatMap(({ source, id }) => [source, id])
			];

			return [...acc, { token, splTokens, address, key }];
		}, [])
	);

	const workers = new SvelteMap<
		NetworkId,
		{ address: SolAddress; key: WorkerKey; worker: SolWalletWorker }
	>();

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
			wanted.map(async ({ token, splTokens, address, key }) => {
				const {
					network: { id: networkId }
				} = token;

				const current = workers.get(networkId);

				if (nonNullish(current) && sameKey({ current: current.key, next: key })) {
					return;
				}

				destroyWorker(networkId);

				// The stores hold the rows and balances of the address the old worker synced. The new
				// worker's first sync would prepend to them, so they are cleared, and restored from the
				// cache as on a first start.
				const addressChanged = nonNullish(current) && current.address !== address;

				if (addressChanged) {
					new Set([...current.worker.tokenIds, token.id, ...splTokens.map(({ id }) => id)]).forEach(
						(tokenId) => {
							solTransactionsStore.reset(tokenId);
							balancesStore.reset(tokenId);
						}
					);
				}

				const worker = await SolWalletWorker.init({
					token,
					splTokens,
					cachedTokenIds: new Set(addressChanged ? [] : current?.worker.tokenIds)
				});

				if (destroyed) {
					worker.destroy();
					return;
				}

				worker.start();

				workers.set(networkId, { address, key, worker });
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
