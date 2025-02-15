<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { sortedIcrcTokens } from '$icp/derived/icrc.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { USER_SNAPSHOT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { solAddressDevnet, solAddressMainnet } from '$lib/derived/address.derived';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { noPositiveBalanceAndNotAllBalancesZero } from '$lib/derived/balances.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { exchangeNotInitialized } from '$lib/derived/exchange.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { splTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	// TODO: use scheduler instead of setInterval, when we find a way to use the svelte store in the worker,
	//  or pass their value in a way that the worker understands (for example, without BigNumber types),
	//  or even when we cache them and we can fetch them

	let timer: NodeJS.Timeout | undefined = undefined;
	let syncInProgress = false;

	const sync = async () => {
		if (syncInProgress) {
			return;
		}

		syncInProgress = true;

		try {
			await registerUserSnapshot();
		} catch (error: unknown) {
			console.error('Unexpected error while taking user snapshot:', error);
		}

		syncInProgress = false;
	};

	const startTimer = async () => {
		if (nonNullish(timer)) {
			return;
		}

		await sync();

		timer = setInterval(sync, USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);
	};

	const stopTimer = () => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	};

	onDestroy(stopTimer);

	let fistSnapshotDone = false;

	const debounceTrigger = debounce(sync, 500);

	const triggerTimer = () => {
		if (
			$authNotSignedIn ||
			$isBusy ||
			isNullish($solAddressMainnet) ||
			isNullish($tokens) ||
			$exchangeNotInitialized ||
			$noPositiveBalanceAndNotAllBalancesZero
		) {
			stopTimer();
			fistSnapshotDone = false;
			return;
		}

		// The first time we trigger the snapshot, after the user signs in.
		if (!fistSnapshotDone) {
			stopTimer();
			startTimer();
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
	// Exchanges: All exchanges initialized (since we have no disclaimer specific for the tokens we are interested in).
	// Transactions: IC and Solana transactions.
	$: $authSignedIn,
		$solAddressMainnet,
		$solAddressDevnet,
		$sortedIcrcTokens,
		$splTokens,
		$enabledSolanaTokens,
		$balancesStore,
		$exchangeNotInitialized,
		$icTransactionsStore,
		$solTransactionsStore,
		triggerTimer();
</script>

<slot />
