<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeleton from '$lib/components/transactions/TransactionsSkeleton.svelte';
	import { token } from '$lib/stores/token.store';

	let loading: boolean;
	$: loading = isNullish($token) || isNullish($icTransactionsStore?.[$token.id]);
</script>

<TransactionsSkeleton {loading}>
	<slot />
</TransactionsSkeleton>
