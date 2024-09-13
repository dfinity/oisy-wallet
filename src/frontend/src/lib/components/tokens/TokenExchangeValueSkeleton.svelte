<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

{#if token.balance === undefined || !$exchangeInitialized}
	<span class="w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
