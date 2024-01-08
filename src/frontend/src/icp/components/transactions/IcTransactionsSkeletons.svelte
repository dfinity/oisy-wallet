<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { nonNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { tokenId } from '$lib/derived/token.derived';

	let transactionsInitialized: boolean;
	$: transactionsInitialized = nonNullish($icTransactionsStore[$tokenId]);
</script>

{#if !transactionsInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
