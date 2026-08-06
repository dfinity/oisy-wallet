<script lang="ts">
	import SimulatedFailuresRunner from '$icp/components/core/SimulatedFailuresRunner.svelte';
	import { initWalletWorker } from '$icp/utils/wallet.utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { simulatedCanisterFailuresEnabled } from '$lib/utils/simulated-canister-failures.utils';
</script>

<WalletWorkers {initWalletWorker} tokens={$enabledIcTokens} />

<!-- QA harness - DO NOT MERGE. -->
{#if simulatedCanisterFailuresEnabled}
	<SimulatedFailuresRunner />
{/if}
