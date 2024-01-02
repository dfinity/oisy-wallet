<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { nonNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$lib/stores/ic-transactions.store';

	let transactionsInitialized: boolean;
	$: transactionsInitialized = nonNullish($icTransactionsStore[ICP_TOKEN_ID]);
</script>

{#if !transactionsInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		<slot />
	</div>
{/if}
