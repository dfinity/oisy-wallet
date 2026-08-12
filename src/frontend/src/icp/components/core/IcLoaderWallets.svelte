<script lang="ts">
	import SimulatedFailuresRunner from '$icp/components/core/SimulatedFailuresRunner.svelte';
	import { tokensWithRecoveredIndexCanister } from '$icp/derived/ic-transactions-status.derived';
	import { icTransactionsWarningStore } from '$icp/stores/ic-transactions-warning.store';
	import { initWalletWorker } from '$icp/utils/wallet.utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { simulatedCanisterFailuresEnabled } from '$lib/utils/simulated-canister-failures.utils';

	// A dismissed warning covers one outage, not the session: a token whose Index canister answers
	// again is forgotten, so a later failure is surfaced afresh.
	//
	// Here rather than in either page that raises the warning, because a token can recover while
	// neither is mounted - and rather than at module scope, because the store chain reaches
	// SvelteKit's `page`, whose subscribe needs a component context.
	$effect(() => {
		icTransactionsWarningStore.forget(
			$tokensWithRecoveredIndexCanister.map(({ ledgerCanisterId }) => ledgerCanisterId)
		);
	});
</script>

<WalletWorkers {initWalletWorker} tokens={$enabledIcTokens} />

<!-- QA harness - DO NOT MERGE. -->
{#if simulatedCanisterFailuresEnabled}
	<SimulatedFailuresRunner />
{/if}
