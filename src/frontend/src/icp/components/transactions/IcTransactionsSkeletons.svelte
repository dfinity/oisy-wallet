<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';

	let loading: boolean;
	$: loading = isNullish($pageToken) || $icTransactionsStore?.[$pageToken.id] === undefined;
</script>

<TransactionsSkeletons {loading}>
	<slot />
</TransactionsSkeletons>
