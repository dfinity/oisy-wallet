<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { XRP_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { xrpTransactionsNotInitialized } from '$xrp/derived/xrp-transactions.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading = $derived(isNullish($pageToken) || $xrpTransactionsNotInitialized);
</script>

<TransactionsSkeletons {loading} testIdPrefix={XRP_TRANSACTION_SKELETON_PREFIX}>
	{@render children()}
</TransactionsSkeletons>
