<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';

	let loading: boolean;
	$: loading =
		($erc20UserTokensNotInitialized && $tokenNotInitialized) || $ethTransactionsNotInitialized;
</script>

<TransactionsSkeletons {loading}>
	<slot />
</TransactionsSkeletons>
