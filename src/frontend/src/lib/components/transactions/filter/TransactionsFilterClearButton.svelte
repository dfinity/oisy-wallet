<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { TRANSACTIONS_FILTER_CLEAR_BUTTON } from '$lib/constants/test-ids.constants';
	import { hasActiveTransactionsFilter } from '$lib/derived/transactions-filter.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
</script>

{#if $hasActiveTransactionsFilter}
	<Button
		ariaLabel={$i18n.transaction.filter.clear}
		colorStyle="secondary-light"
		onclick={() => transactionsFilterStore.clear()}
		paddingSmall
		styleClass="h-[2.2rem] rounded-lg"
		testId={TRANSACTIONS_FILTER_CLEAR_BUTTON}
		type="button"
	>
		{$i18n.transaction.filter.clear}
	</Button>
{/if}
