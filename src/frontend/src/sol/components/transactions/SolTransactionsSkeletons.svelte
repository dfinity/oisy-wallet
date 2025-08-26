<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { SOL_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { solTransactionsNotInitialized } from '$sol/derived/sol-transactions.derived';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading =$derived( isNullish($pageToken) || $solTransactionsNotInitialized);
</script>

<TransactionsSkeletons {loading} testIdPrefix={SOL_TRANSACTION_SKELETON_PREFIX}>
	{@render children()}
</TransactionsSkeletons>
