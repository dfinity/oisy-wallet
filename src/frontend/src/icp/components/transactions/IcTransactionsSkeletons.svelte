<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading = $derived(
		isNullish($pageToken) || $icTransactionsStore?.[$pageToken.id] === undefined
	);
</script>

<TransactionsSkeletons {loading}>
	{@render children()}
</TransactionsSkeletons>
