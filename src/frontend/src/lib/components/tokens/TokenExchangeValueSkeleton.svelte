<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import type { TokenUiBalance } from '$lib/types/token';

	export let tokenUiBalance: TokenUiBalance;
</script>

{#if tokenUiBalance.balance === undefined || !$exchangeInitialized}
	<span class="w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
