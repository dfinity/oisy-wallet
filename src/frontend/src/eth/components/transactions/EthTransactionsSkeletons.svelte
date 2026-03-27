<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading = $derived(isNullish($pageToken) || $ethTransactionsNotInitialized);
</script>

<TransactionsSkeletons {loading}>
	{@render children()}
</TransactionsSkeletons>
