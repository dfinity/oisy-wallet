<script lang="ts">
	import TransactionsFilterClearButton from '$lib/components/transactions/filter/TransactionsFilterClearButton.svelte';
	import TransactionsFilterContacts from '$lib/components/transactions/filter/TransactionsFilterContacts.svelte';
	import TransactionsFilterMobileButton from '$lib/components/transactions/filter/TransactionsFilterMobileButton.svelte';
	import TransactionsFilterTokens from '$lib/components/transactions/filter/TransactionsFilterTokens.svelte';
	import TransactionsFilterTypes from '$lib/components/transactions/filter/TransactionsFilterTypes.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { TRANSACTIONS_FILTER_TOOLBAR } from '$lib/constants/test-ids.constants';
</script>

<div class="mb-4 w-full" data-tid={TRANSACTIONS_FILTER_TOOLBAR}>
	<Responsive up="md">
		<div class="flex flex-wrap items-center gap-2">
			<TransactionsFilterTypes />

			<TransactionsFilterTokens />

			<TransactionsFilterContacts />

			<TransactionsFilterClearButton />
		</div>
	</Responsive>

	<Responsive down="sm">
		<div class="flex items-center justify-end gap-2">
			<TransactionsFilterMobileButton />
		</div>
	</Responsive>
</div>
