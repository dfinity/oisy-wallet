<script lang="ts">
	import TransactionsFilterTokens from '$lib/components/transactions/filter/TransactionsFilterTokens.svelte';
	import TransactionsFilterTypes from '$lib/components/transactions/filter/TransactionsFilterTypes.svelte';
	import { TRANSACTIONS_FILTER_TOOLBAR } from '$lib/constants/test-ids.constants';
</script>

<div class="mb-4 flex flex-wrap items-center gap-2" data-tid={TRANSACTIONS_FILTER_TOOLBAR}>
	<TransactionsFilterTypes />
	<TransactionsFilterTokens />
</div>
