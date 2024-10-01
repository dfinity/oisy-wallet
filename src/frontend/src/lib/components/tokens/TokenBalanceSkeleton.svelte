<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

{#if token.balance === undefined}
	<span class="mt-2 w-full max-w-[100px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
