<script lang="ts">
	import { initWalletWorker } from '$icp/utils/wallet.utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
</script>

<WalletWorkers {initWalletWorker} tokens={$enabledIcTokens} />
