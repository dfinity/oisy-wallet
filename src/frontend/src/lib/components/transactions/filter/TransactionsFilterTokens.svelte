<script lang="ts">
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TOKENS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));

	const onToggle = (visible: boolean) => {
		trackTransactionFilter({
			modifier: visible
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.OPEN
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLOSE,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN
		});
	};
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.tokens_aria_label}
	count={selectedSet.size}
	{onToggle}
	panelWidthClass="w-full sm:w-80"
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
