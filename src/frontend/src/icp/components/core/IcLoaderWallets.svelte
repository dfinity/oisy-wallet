<script lang="ts">
	import { onDestroy } from 'svelte';
	import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
	import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
	import type { WalletWorker } from '$icp/types/ic-listener';
	import { enabledIcNetworkTokens } from '$lib/derived/network-tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import { debounce, nonNullish } from '@dfinity/utils';

	let workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		const unusedWorkers: TokenId[] = Array.from(workers.keys()).filter(
			(tokenId) => !$enabledIcNetworkTokens.some(({ id: icTokenId }) => icTokenId === tokenId)
		);

		unusedWorkers.forEach((tokenId) => {
			const worker = workers.get(tokenId);

			if (nonNullish(worker)) {
				worker.stop();
				workers.delete(tokenId);
			}
		});

		await Promise.all(
			$enabledIcNetworkTokens.map(async (token) => {
				if (!workers.has(token.id)) {
					const worker = await (token.standard === 'icrc'
						? initIcrcWalletWorker(token)
						: initIcpWalletWorker());

					worker.start();
					workers.set(token.id, worker);
				}
			})
		);
	};

	const debounceManageWorkers = debounce(manageWorkers, 500);

	$: $enabledIcNetworkTokens, debounceManageWorkers();

	onDestroy(() => {
		console.log('onDestroy');
		workers.forEach((worker) => worker.stop());
		workers.clear();
	});

	const triggerTimer = () => workers.forEach((worker) => worker.trigger());
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
