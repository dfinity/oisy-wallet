<script lang="ts">
	import type { Snippet } from 'svelte';
	import { initWalletWorker } from '$icp/utils/wallet.utils';
	import WalletWorkers from '$lib/components/core/WalletWorkers.svelte';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<WalletWorkers {initWalletWorker} tokens={$enabledIcTokens}>
	{@render children()}
</WalletWorkers>
