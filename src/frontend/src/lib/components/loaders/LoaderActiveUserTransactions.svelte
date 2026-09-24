<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import {
		TRACK_COUNT_LIQUIDIUM_ERROR,
		TRACK_COUNT_LIQUIDIUM_SUCCESS,
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { activeUserTransactionsPending } from '$lib/derived/active-user-transactions.derived';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadActiveUserTransactions } from '$lib/services/active-user-transactions.services';
	import { trackEvent } from '$lib/services/analytics.services';
	import { pollChainFusionActiveUserTransactions } from '$lib/services/chain-fusion-swap-active-tx.services';
	import { pollLiquidiumActiveUserTransactions } from '$lib/services/liquidium-active-tx.services';
	import { loadLiquidium } from '$lib/services/liquidium.services';
	import { pollNearIntentsActiveUserTransactions } from '$lib/services/near-intents-active-tx.services';
	import { pollOisyTradeActiveUserTransactions } from '$lib/services/oisy-trade-active-tx.services';
	import { pollOneSecActiveUserTransactions } from '$lib/services/onesec-swap.services';
	import { pollVeloraActiveUserTransactions } from '$lib/services/velora-active-tx.services';
	import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
	import { isTerminalActiveUserTransaction } from '$lib/utils/active-user-transactions.utils';
	import {
		buildChainFusionSwapTrackingMetadata,
		isChainFusionActiveUserTransaction
	} from '$lib/utils/chain-fusion-swap-active-tx.utils';
	import { consoleError } from '$lib/utils/console.utils';
	import {
		buildLiquidiumTrackingMetadata,
		isLiquidiumActiveUserTransaction
	} from '$lib/utils/liquidium-active-tx.utils';
	import {
		buildNearIntentsSwapTrackingMetadata,
		isNearIntentsActiveUserTransaction
	} from '$lib/utils/near-intents-active-tx.utils';
	import {
		buildOisyTradeSwapTrackingMetadata,
		isOisyTradeActiveUserTransaction
	} from '$lib/utils/oisy-trade-active-tx.utils';
	import {
		buildOneSecSwapTrackingMetadata,
		isOneSecActiveUserTransaction
	} from '$lib/utils/onesec-swap.utils';
	import {
		buildVeloraSwapTrackingMetadata,
		isVeloraActiveUserTransaction
	} from '$lib/utils/velora-active-tx.utils';
	import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';

	// `loadActiveUserTransactions` resets the store on nullish identity.
	$effect(() => {
		loadActiveUserTransactions({ identity: $authIdentity });
	});

	let timer: ReturnType<typeof setInterval> | undefined;
	let inflight = false;

	// Reads the latest `$authIdentity` at fire time rather than closing over a
	// captured value, so a delegation refresh (new identity object, no nullish
	// in between) doesn't leave the poller authenticating with a stale identity.
	const tick = async () => {
		const identity = $authIdentity;

		if (
			isNullish(identity) ||
			inflight ||
			document.hidden ||
			$activeUserTransactionsPending.length === 0
		) {
			return;
		}

		inflight = true;
		try {
			const oneSec = $activeUserTransactionsPending.filter(isOneSecActiveUserTransaction);

			if (oneSec.length > 0) {
				await pollOneSecActiveUserTransactions({ identity, transactions: oneSec });
			}

			const liquidium = $activeUserTransactionsPending.filter(isLiquidiumActiveUserTransaction);

			if (liquidium.length > 0) {
				await pollLiquidiumActiveUserTransactions({ identity, transactions: liquidium });
			}

			const nearIntents = $activeUserTransactionsPending.filter(isNearIntentsActiveUserTransaction);

			if (nearIntents.length > 0) {
				await pollNearIntentsActiveUserTransactions({ identity, transactions: nearIntents });
			}

			const velora = $activeUserTransactionsPending.filter(isVeloraActiveUserTransaction);

			if (velora.length > 0) {
				await pollVeloraActiveUserTransactions({
					identity,
					transactions: velora,
					userAddress: $ethAddress
				});
			}

			const chainFusion = $activeUserTransactionsPending.filter(isChainFusionActiveUserTransaction);

			if (chainFusion.length > 0) {
				await pollChainFusionActiveUserTransactions({ identity, transactions: chainFusion });
			}

			const oisyTrade = $activeUserTransactionsPending.filter(isOisyTradeActiveUserTransaction);

			if (oisyTrade.length > 0) {
				await pollOisyTradeActiveUserTransactions({ identity, transactions: oisyTrade });
			}
		} catch (err: unknown) {
			consoleError(err);
		} finally {
			inflight = false;
		}
	};

	const stop = () => {
		if (nonNullish(timer)) {
			clearInterval(timer);
			timer = undefined;
		}
	};

	const start = () => {
		if (nonNullish(timer)) {
			return;
		}

		timer = setInterval(tick, ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS);
	};

	$effect(() => {
		const hasPending = $activeUserTransactionsPending.length > 0;

		if (isNullish($authIdentity) || !hasPending) {
			stop();
			return;
		}

		start();
	});

	onDestroy(stop);

	// Fires wallet refresh + analytics exactly once per terminal row.
	// Idempotency lives in `terminalSideEffectsApplied` on the store, so a
	// row that finalizes across a refresh still fires once on next load.
	$effect(() => {
		if (isNullish($activeUserTransactionsStore)) {
			return;
		}

		const newlyAppliedIds: string[] = [];
		let shouldRefresh = false;
		let shouldRefreshLiquidium = false;

		for (const tx of Object.values($activeUserTransactionsStore.data)) {
			const alreadyApplied =
				$activeUserTransactionsStore.terminalSideEffectsApplied[tx.id] === true;

			const isSucceeded = 'Succeeded' in tx.status;

			if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isOneSecActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				trackEvent({
					name: isSucceeded ? TRACK_COUNT_SWAP_SUCCESS : TRACK_COUNT_SWAP_ERROR,
					metadata: buildOneSecSwapTrackingMetadata({ tx })
				});

				if (isSucceeded) {
					shouldRefresh = true;
				}
			} else if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isNearIntentsActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				trackEvent({
					name: isSucceeded ? TRACK_COUNT_SWAP_SUCCESS : TRACK_COUNT_SWAP_ERROR,
					metadata: buildNearIntentsSwapTrackingMetadata({ tx })
				});

				if (isSucceeded) {
					shouldRefresh = true;
				}
			} else if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isVeloraActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				trackEvent({
					name: isSucceeded ? TRACK_COUNT_SWAP_SUCCESS : TRACK_COUNT_SWAP_ERROR,
					metadata: buildVeloraSwapTrackingMetadata({ tx })
				});

				if (isSucceeded) {
					shouldRefresh = true;
				}
			} else if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isChainFusionActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				// A ck conversion started from the Swap modal reports into the swap funnel.
				// The untouched Convert flow keeps firing its own `TRACK_COUNT_CONVERT_*`.
				trackEvent({
					name: isSucceeded ? TRACK_COUNT_SWAP_SUCCESS : TRACK_COUNT_SWAP_ERROR,
					metadata: buildChainFusionSwapTrackingMetadata({ tx })
				});

				if (isSucceeded) {
					shouldRefresh = true;
				}
			} else if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isOisyTradeActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				trackEvent({
					name: isSucceeded ? TRACK_COUNT_SWAP_SUCCESS : TRACK_COUNT_SWAP_ERROR,
					metadata: buildOisyTradeSwapTrackingMetadata({ tx })
				});

				// Unconditional, unlike every other provider's: a failed OISY Trade swap is a
				// killed fill-or-kill order whose *source* token has just been withdrawn back
				// to the wallet. Elsewhere a failure means nothing moved and there is nothing
				// to refresh; here the balance changed either way.
				shouldRefresh = true;
			} else if (
				isTerminalActiveUserTransaction(tx) &&
				!alreadyApplied &&
				isLiquidiumActiveUserTransaction(tx)
			) {
				newlyAppliedIds.push(tx.id);

				trackEvent({
					name: isSucceeded ? TRACK_COUNT_LIQUIDIUM_SUCCESS : TRACK_COUNT_LIQUIDIUM_ERROR,
					metadata: buildLiquidiumTrackingMetadata({ tx })
				});

				if (isSucceeded) {
					shouldRefresh = true;
					shouldRefreshLiquidium = true;
				}
			}
		}

		if (newlyAppliedIds.length > 0) {
			activeUserTransactionsStore.markTerminalSideEffectsApplied({ ids: newlyAppliedIds });
		}

		if (shouldRefresh) {
			waitAndTriggerWallet().catch(consoleError);
		}

		// Refresh Liquidium positions/health once when a Liquidium action settles.
		if (shouldRefreshLiquidium) {
			loadLiquidium({ identity: $authIdentity, ethAddress: $ethAddress }).catch(consoleError);
		}
	});
</script>
