<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { onLoadTransactionsError } from '$icp/services/ic-transactions.services';
	import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import {
		isSimulatedFailure,
		qaLog,
		simulatedCanisterFailuresEnabled,
		simulatedFailuresStore
	} from '$lib/utils/simulated-canister-failures.utils';

	// QA harness - DO NOT MERGE.
	//
	// A healthy token posts nothing when neither its balance nor its transactions changed
	// (`IcWalletBalanceAndTransactionsScheduler.syncTransactions`), so there is no message to rewrite
	// for the token we want to break. The simulation therefore drives its own tick, on the same
	// interval as the wallet, and produces the same signals the real failure paths do.

	// Only the tokens this harness failed itself. Clearing the field has to reset them - a quiet token
	// gets no real sync to reset it, so the warning would never go away - but a token failing for
	// real, like one with a genuinely broken index canister, must keep its count.
	const simulatedTokenIds = new SvelteSet<TokenId>();

	const tick = () => {
		const failures = $simulatedFailuresStore;

		// The same list the warning reads. `enabledIcrcTokens` looks like the natural choice but
		// concatenates the default and custom lists without excluding default ledgers from the custom
		// half, so a toggled default token appears twice, under two different token ids - and the
		// harness would then count a failure the warning never looks at.
		$enabledFungibleNetworkTokens.forEach(({ id: tokenId, symbol }) => {
			if (isSimulatedFailure({ tokenId, kind: 'ledger', failures })) {
				qaLog(`${symbol}: simulating a Ledger canister failure`);

				onLoadTransactionsError({
					tokenId,
					error: new Error(`[QA harness] Simulated failure: Ledger canister of ${symbol}`)
				});

				return;
			}

			if (isSimulatedFailure({ tokenId, kind: 'index', failures })) {
				icTransactionsStatusStore.fail(tokenId);
				simulatedTokenIds.add(tokenId);

				qaLog(
					`${symbol}: simulating an Index canister failure, consecutive failures now`,
					$icTransactionsStatusStore[tokenId]
				);

				return;
			}

			if (simulatedTokenIds.has(tokenId)) {
				simulatedTokenIds.delete(tokenId);
				icTransactionsStatusStore.succeed(tokenId);

				qaLog(`${symbol}: no longer simulated, failure count reset`);
			}
		});
	};

	onMount(() => {
		if (!simulatedCanisterFailuresEnabled) {
			return;
		}

		const interval = setInterval(tick, WALLET_TIMER_INTERVAL_MILLIS);

		return () => clearInterval(interval);
	});
</script>
