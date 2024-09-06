<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { token } from '$lib/stores/token.store';

	let transactionsInitialized: boolean;
	$: transactionsInitialized = nonNullish($token) && nonNullish($icTransactionsStore?.[$token.id]);
</script>

{#if !transactionsInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
