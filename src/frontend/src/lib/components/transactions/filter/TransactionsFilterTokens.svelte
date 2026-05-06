<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TOKENS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));

	let triggerLabel = $derived.by(() => {
		if (selectedSet.size === 0) {
			return $i18n.transaction.filter.tokens_label;
		}
		const first = $enabledFungibleNetworkTokens.find((t) => {
			const key = t.id.description;
			return nonNullish(key) && selectedSet.has(key);
		});
		return first?.symbol ?? $i18n.transaction.filter.tokens_label;
	});
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.tokens_aria_label}
	count={selectedSet.size}
	testId={TRANSACTIONS_FILTER_TOKENS_DROPDOWN}
	{triggerLabel}
>
	{#snippet triggerIcon()}
		<IconCoins size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterTokensPanel />
	{/snippet}
</MultiSelectDropdown>
