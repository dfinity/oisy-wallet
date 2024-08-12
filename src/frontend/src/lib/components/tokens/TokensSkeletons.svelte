<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';

	export let rows: number;
</script>

{#if $erc20UserTokensNotInitialized}
	<SkeletonCards {rows} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
