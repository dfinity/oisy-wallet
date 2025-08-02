<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { TRACK_SNAPSHOT_SEND_ERROR } from '$lib/constants/analytics.contants';
	import { USER_SNAPSHOT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import {
		btcAddressMainnet,
		btcAddressTestnet,
		ethAddress,
		solAddressDevnet,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { noPositiveBalanceAndNotAllBalancesZero } from '$lib/derived/balances.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { exchangeNotInitialized } from '$lib/derived/exchange.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { mapIcErrorMetadata } from '$lib/utils/error.utils';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

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
			trackEvent({
				name: TRACK_SNAPSHOT_SEND_ERROR,
				metadata: mapIcErrorMetadata(error),
				warning: `Unexpected error while taking user snapshot: ${error}`
			});
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
			isNullish($btcAddressMainnet) ||
			isNullish($ethAddress) ||
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
	// Addresses: the addresses of each network.
	// Tokens: any new token added to the list of tokens or any change in the token list.
	// Balances: All balances (since we need to check if the user has any balance).
	// Exchanges: All exchanges initialized (since we have no disclaimer specific for the tokens we are interested in).
	// Transactions: all transactions related to each network.
	$effect(() => {
		[
			$authSignedIn,
			$btcAddressMainnet,
			$btcAddressTestnet,
			$ethAddress,
			$solAddressMainnet,
			$solAddressDevnet,
			$tokens,
			$balancesStore,
			$exchangeNotInitialized,
			$btcTransactionsStore,
			$ethTransactionsStore,
			$icTransactionsStore,
			$solTransactionsStore
		];
		triggerTimer();
	});
</script>

{@render children()}
