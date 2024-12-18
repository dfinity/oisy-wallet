<script lang="ts">
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledSplTokens } from '$lib/derived/tokens.derived';
	import type { InitWalletWorkerFn } from '$lib/types/listener';
	import { initSolWalletWorker } from '$sol/services/worker.sol-wallet.services';


	const initWalletWorker: InitWalletWorkerFn = ({ token }) =>
		initSolWalletWorker({ token });
</script>

<WalletWorkers tokens={$enabledSplTokens} {initWalletWorker}>
	<slot />
</WalletWorkers> 