<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { TokenUi } from '$lib/types/token';

	export let token: TokenUi;
</script>

<!-- eslint-disable-next-line local-rules/use-nullish-checks -- We want to check for undefined and not null, since they mean different situations -->
{#if token.balance === undefined}
	<span class="w-full max-w-[100px] mt-2"><SkeletonText /></span>
{:else}
	<slot />
{/if}
