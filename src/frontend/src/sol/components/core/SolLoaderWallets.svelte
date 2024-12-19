<script lang="ts">
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import { initSolWalletWorker as initWalletWorker } from '$sol/services/worker.sol-wallet.services';
</script>

<WalletWorkers tokens={$enabledSplTokens} {initWalletWorker}>
	<slot />
</WalletWorkers> 