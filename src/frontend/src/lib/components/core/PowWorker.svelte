<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { EXCHANGE_DISABLED } from '$env/exchange.env';
	import { enabledIcrcLedgerCanisterIdsNoCk } from '$icp/derived/icrc.derived';
	import { type ChallengeWorker, initChallengeWorker } from '$lib/services/worker.pow.services';

	let worker: ChallengeWorker | undefined;

	onMount(async () => {
		if (EXCHANGE_DISABLED) {
			// Using the exchange API during development if not necessary and given its limitation of calls per minute is annoying at it often throws errors on server reload.
			return;
		}

		worker = await initChallengeWorker();
	});

	onDestroy(() => worker?.destroy());

	const syncTimer = () => {
		worker?.stopExchangeTimer();
		worker?.startExchangeTimer({
			icrcCanisterIds: $enabledIcrcLedgerCanisterIdsNoCk
		});
	};

	const debounceSyncTimer = debounce(syncTimer);

	$: worker, $enabledIcrcLedgerCanisterIdsNoCk, debounceSyncTimer();
</script>

<slot />
