<script lang="ts">
	import type { Snippet } from 'svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { transactionsStoreWithTokens } from '$lib/derived/transactions.derived';
	import { areTransactionsStoresLoading } from '$lib/utils/transactions.utils';

	interface Props {
		testIdPrefix?: string;
		children: Snippet;
	}

	let { testIdPrefix, children }: Props = $props();

	let loading = $derived(areTransactionsStoresLoading($transactionsStoreWithTokens));
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	{@render children()}
</TransactionsSkeletons>
