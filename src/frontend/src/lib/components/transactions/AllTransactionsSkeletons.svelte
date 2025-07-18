<script lang="ts">
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { transactionsStoreWithTokens } from '$lib/derived/transactions.derived';
	import { areTransactionsStoresLoading } from '$lib/utils/transactions.utils';

	export let testIdPrefix: string | undefined = undefined;

	let loading = true;
	$: loading = areTransactionsStoresLoading($transactionsStoreWithTokens);
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
