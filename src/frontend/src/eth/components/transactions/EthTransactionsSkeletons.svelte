<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { ethTransactionsNotInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import TransactionsSkeleton from '$lib/components/transactions/TransactionsSkeleton.svelte';

	let loading: boolean;
	$: loading =
		($erc20UserTokensNotInitialized && $tokenNotInitialized) || $ethTransactionsNotInitialized;
</script>

<TransactionsSkeleton {loading}>
	<slot />
</TransactionsSkeleton>
