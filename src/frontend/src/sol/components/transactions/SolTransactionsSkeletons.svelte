<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { SOL_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
	import { token } from '$lib/stores/token.store';
	import { solTransactionsNotInitialized } from '$sol/derived/sol-transactions.derived';

	let loading: boolean;
	$: loading = isNullish($token) || $solTransactionsNotInitialized;
</script>

<TransactionsSkeletons testIdPrefix={SOL_TRANSACTION_SKELETON_PREFIX} {loading}>
	<slot />
</TransactionsSkeletons>
