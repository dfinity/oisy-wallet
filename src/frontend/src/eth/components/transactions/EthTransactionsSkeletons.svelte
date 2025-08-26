<script lang="ts">
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';

	let loading: boolean;
	$: loading =
		($tokenNotInitialized) || $ethTransactionsNotInitialized;
</script>

<TransactionsSkeletons {loading}>
	<slot />
</TransactionsSkeletons>
