<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLMainnet
	} from '$lib/utils/network.utils';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { SolBatchWalletWorker } from '$sol/services/worker.sol-wallet-batch.services';

	let walletWorkerTokens = $derived(
		[...$enabledSolanaTokens, ...$enabledSplTokens].filter(
			({ network: { id: networkId } }) =>
				(isNetworkIdSOLLocal(networkId) && nonNullish($solAddressLocal)) ||
				(isNetworkIdSOLDevnet(networkId) && nonNullish($solAddressDevnet)) ||
				(isNetworkIdSOLMainnet(networkId) && nonNullish($solAddressMainnet))
		)
	);

	let worker: SolBatchWalletWorker | undefined;

	const manageWorker = async () => {
		if (nonNullish(worker)) {
			worker.stop();
			worker.destroy();
			worker = undefined;
		}

		if (walletWorkerTokens.length === 0) {
			return;
		}

		worker = await SolBatchWalletWorker.init({ tokens: walletWorkerTokens });

		worker.stop();
		worker.start();
	};

	const debounceManageWorker = debounce(manageWorker, 500);

	$effect(() => {
		[walletWorkerTokens];
		debounceManageWorker();
	});

	onDestroy(() => {
		worker?.destroy();
	});

	const triggerTimer = () => worker?.trigger();

	const debounceTriggerTimer = debounce(triggerTimer, 1000);
</script>

<svelte:window onoisyTriggerWallet={debounceTriggerTimer} />
