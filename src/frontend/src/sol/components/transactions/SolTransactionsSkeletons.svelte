<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { SOL_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { solTransactionsNotInitialized } from '$sol/derived/sol-transactions.derived';

	let loading: boolean;
	$: loading = isNullish($pageToken) || $solTransactionsNotInitialized;
</script>

<TransactionsSkeletons {loading} testIdPrefix={SOL_TRANSACTION_SKELETON_PREFIX}>
	<slot />
</TransactionsSkeletons>
