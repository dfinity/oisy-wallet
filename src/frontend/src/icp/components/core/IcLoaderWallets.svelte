<script lang="ts">
	import { onDestroy } from 'svelte';
	import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
	import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
	import type { WalletWorker } from '$icp/types/ic-listener';
	import { enabledIcNetworkTokens } from '$lib/derived/network-tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let workers: Map<TokenId, WalletWorker> = new Map<TokenId, WalletWorker>();

	const manageWorkers = async () => {
		const unusedWorkers: TokenId[] = Array.from(workers.keys()).filter(
			(tokenId) => !$enabledIcNetworkTokens.some(({ id: icTokenId }) => icTokenId === tokenId)
		);

		unusedWorkers.forEach((tokenId) => {
			workers.get(tokenId)?.stop();
			workers.delete(tokenId);
		});

		await Promise.allSettled(
			$enabledIcNetworkTokens.map(async (token) => {
				if (!workers.has(token.id)) {
					try {
						const worker = await (token.standard === 'icrc'
							? initIcrcWalletWorker(token)
							: initIcpWalletWorker());

						worker.stop();
						worker.start();

						workers.set(token.id, worker);
					} catch (err: unknown) {
						// We show the error to the user, but we keep loading the rest of the workers
						toastsError({
							msg: {
								text: replacePlaceholders($i18n.tokens.error.loading_ic_wallet, {
									$symbol: token.symbol
								})
							},
							err
						});
					}
				}
			})
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
