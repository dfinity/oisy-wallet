<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';

	export let loading: boolean;
	export let testIdPrefix: string | undefined = undefined;
</script>

{#if loading}
	<SkeletonCards rows={5} {testIdPrefix} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
