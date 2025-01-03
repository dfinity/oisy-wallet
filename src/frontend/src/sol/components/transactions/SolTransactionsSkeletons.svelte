<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { token } from '$lib/stores/token.store';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	let loading: boolean;
	$: loading = isNullish($token) || $solTransactionsStore?.[$token.id] === undefined;
</script>

<TransactionsSkeletons {loading}>
	<slot />
</TransactionsSkeletons>
