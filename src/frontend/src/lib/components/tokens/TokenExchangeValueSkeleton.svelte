<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<!-- eslint-disable-next-line local-rules/use-nullish-checks -- We want to check for undefined and not null, since they mean different situations -->
{#if token.balance === undefined || !$exchangeInitialized}
	<span class="w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
