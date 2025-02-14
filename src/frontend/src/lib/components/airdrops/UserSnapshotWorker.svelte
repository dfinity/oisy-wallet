<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import {
		exchangeNotInitialized,
		exchanges
	} from '$lib/derived/exchange.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import {
		initUserSnapshotWorker,
		type UserSnapshotWorker
	} from '$lib/services/worker.user-snapshot.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import { isBusy } from '$lib/derived/busy.derived';
	import { noPositiveBalanceAndNotAllBalancesZero } from '$lib/derived/balances.derived';
	import { sortedIcrcTokens } from '$icp/derived/icrc.derived';
	import { splTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';

	let worker: UserSnapshotWorker | undefined;

	onMount(async () => {
		worker = await initUserSnapshotWorker();
	});

	onDestroy(() => worker?.stop());

	let fistSnapshotDone = false;

	const debounceTrigger = debounce(() => worker?.trigger(), 500);

	const triggerTimer = () => {
		if (
			$authNotSignedIn ||
			$isBusy ||
			isNullish($solAddressMainnet) ||
			isNullish($tokens) ||
			$exchangeNotInitialized ||
			$noPositiveBalanceAndNotAllBalancesZero
		) {
			worker?.stop();
			fistSnapshotDone = false;
			return;
		}

		// The first time we trigger the snapshot, after the user signs in.
		if (!fistSnapshotDone) {
			worker?.stop();
			worker?.start();
			fistSnapshotDone = true;
			return;
		}

		debounceTrigger();
	};

	// The snapshot should be triggered for any change in the following variables (for now).
	// Auth: We should trigger the snapshot when the user is signed in. If the user is not signed in, we should not trigger the snapshot. We should also not trigger the snapshot if the user is busy.
	// Addresses: IC principal and Solana addresses.
	// Tokens: ICRC tokens and Solana tokens.
	// Balances: All balances (since we need to check if the user has any balance).
	// Exchanges: All exchanges (since we have no disclaimer specific for the tokens we are interested in).
	// Transactions: IC and Solana transactions.
	$: $authSignedIn,
		$solAddressMainnet,
		$solAddressDevnet,
		$sortedIcrcTokens,
		$splTokens,
		$enabledSolanaTokens,
		$balancesStore,
		$exchanges,
		$icTransactionsStore,
		$solTransactionsStore,
		triggerTimer();
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
