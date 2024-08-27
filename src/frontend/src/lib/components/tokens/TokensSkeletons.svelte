<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { TOKENS_SKELETONS_INITIALIZED } from '$lib/constants/test-ids.constants';

	export let loading: boolean;
</script>

{#if loading}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade data-tid={TOKENS_SKELETONS_INITIALIZED}>
		<slot />
	</div>
{/if}
