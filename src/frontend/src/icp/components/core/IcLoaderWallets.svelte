<!--<script lang="ts">-->
<!--	import { onDestroy } from 'svelte';-->
<!--	import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';-->
<!--	import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';-->
<!--	import type { WalletWorker } from '$icp/types/ic-listener';-->
<!--	import { enabledIcNetworkTokens } from '$lib/derived/network-tokens.derived';-->
<!--	import type { TokenId } from '$lib/types/token';-->
<!--	import { debounce, isNullish, nonNullish } from '@dfinity/utils';-->

<!--	let workers: { [key: TokenId]: WalletWorker } | undefined;-->

<!--	const load = async () => {-->
<!--		nonNullish(workers) &&-->
<!--			Object.entries(workers as { [key: TokenId]: WalletWorker }).forEach(([tokenId, worker]) => {-->
<!--				if (isNullish($enabledIcNetworkTokens.find(({ id }) => id === tokenId))) {-->
<!--					worker.stop();-->
<!--					workers?.[tokenId];-->
<!--				}-->
<!--			});-->

<!--		await Promise.all([-->
<!--			...$enabledIcNetworkTokens.map(async (token) => {-->
<!--				if (isNullish(workers?.get(token.id))) {-->
<!--					const worker: WalletWorker | undefined = await (token.standard === 'icrc'-->
<!--						? initIcrcWalletWorker(token)-->
<!--						: initIcpWalletWorker());-->
<!--					workers?.set(token.id, worker);-->
<!--				}-->
<!--			})-->
<!--		]);-->
<!--	};-->

<!--	const debounceLoad = debounce(load, 500);-->

<!--	$: $enabledIcNetworkTokens, debounceLoad();-->

<!--	onDestroy(() => workers?.forEach((worker) => worker.stop()));-->

<!--	const syncTimer = () => {-->
<!--		workers?.forEach((worker) => {-->
<!--			worker.start();-->
<!--			worker.stop();-->
<!--		});-->
<!--	};-->

<!--	$: workers, syncTimer();-->

<!--	const triggerTimer = () => workers?.forEach((worker) => worker.trigger());-->
<!--</script>-->

<!--<svelte:window on:oisyTriggerWallet={triggerTimer} />-->

<slot />
