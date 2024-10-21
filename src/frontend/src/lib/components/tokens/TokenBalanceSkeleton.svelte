<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { TokenUiBalance } from '$lib/types/token';

	export let token: TokenUiBalance;
</script>

{#if token.balance === undefined}
	<span class="mt-2 w-full max-w-[100px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
