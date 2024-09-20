<script lang="ts">
	import { initWalletWorker } from '$icp/utils/wallet.utils';
	import LoaderWallets from '$lib/components/core/LoaderWallets.svelte';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
</script>

<LoaderWallets tokens={$enabledIcTokens} {initWalletWorker}>
	<slot />
</LoaderWallets>
