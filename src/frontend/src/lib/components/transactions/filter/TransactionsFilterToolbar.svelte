<script lang="ts">
	import TransactionsFilterClearButton from '$lib/components/transactions/filter/TransactionsFilterClearButton.svelte';
	import TransactionsFilterContacts from '$lib/components/transactions/filter/TransactionsFilterContacts.svelte';
	import TransactionsFilterTokens from '$lib/components/transactions/filter/TransactionsFilterTokens.svelte';
	import TransactionsFilterTypes from '$lib/components/transactions/filter/TransactionsFilterTypes.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { TRANSACTIONS_FILTER_TOOLBAR } from '$lib/constants/test-ids.constants';
</script>

<Responsive up="md">
	<div class="mb-4 w-full" data-tid={TRANSACTIONS_FILTER_TOOLBAR}>
		<div class="flex flex-wrap items-center gap-2">
			<TransactionsFilterTypes />

			<TransactionsFilterTokens />

			<TransactionsFilterContacts />

			<TransactionsFilterClearButton />
		</div>
	</div>
</Responsive>
