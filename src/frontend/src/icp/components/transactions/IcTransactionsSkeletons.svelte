<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { token } from '$lib/stores/token.store';

	let loading: boolean;
	$: loading = isNullish($token) || isNullish($icTransactionsStore?.[$token.id]);
</script>

<TransactionsSkeletons {loading}>
	<slot />
</TransactionsSkeletons>
