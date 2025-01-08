<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { token } from '$lib/stores/token.store';
	import { solTransactionsNotInitialized } from '$sol/derived/sol-transactions.derived';

	let loading: boolean;
	$: loading = isNullish($token) || $solTransactionsNotInitialized;
</script>

<TransactionsSkeletons testIdPrefix="sol-txn" {loading}>
	<slot />
</TransactionsSkeletons>
