<script lang="ts">
	import { fade } from 'svelte/transition';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import { transactionsNotInitialized } from '$eth/derived/transactions.derived';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
</script>

{#if $tokenNotInitialized || $transactionsNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
