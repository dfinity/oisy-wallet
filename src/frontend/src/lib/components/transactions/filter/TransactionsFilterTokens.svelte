<script lang="ts">
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TOKENS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.tokens_aria_label}
	count={selectedSet.size}
	panelWidthClass="w-80"
	testId={TRANSACTIONS_FILTER_TOKENS_DROPDOWN}
	triggerLabel={$i18n.transaction.filter.tokens_label}
>
	{#snippet triggerIcon()}
		<IconCoins size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterTokensPanel autofocus />
	{/snippet}
</MultiSelectDropdown>
