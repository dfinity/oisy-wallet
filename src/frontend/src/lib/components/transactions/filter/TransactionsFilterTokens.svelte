<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IconCoins from '$lib/components/icons/lucide/IconCoins.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TOKENS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let searchValue = $state('');

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));

	const tokenKey = (token: Token): string | undefined => token.id.description;

	let sortedTokens = $derived(
		[...$enabledFungibleNetworkTokens].sort((a, b) =>
			(a.name ?? a.symbol).localeCompare(b.name ?? b.symbol, undefined, {
				sensitivity: 'base'
			})
		)
	);

	let filteredTokens = $derived(
		searchValue.length === 0
			? sortedTokens
			: sortedTokens.filter(({ name, symbol }) => {
					const needle = searchValue.toLowerCase();
					return name.toLowerCase().includes(needle) || symbol.toLowerCase().includes(needle);
				})
	);

	let triggerLabel = $derived.by(() => {
		if (selectedSet.size === 0) {
			return $i18n.transaction.filter.tokens_label;
		}

		const first = sortedTokens.find((t) => {
			const key = tokenKey(t);

			return nonNullish(key) && selectedSet.has(key);
		});

		return first?.symbol ?? $i18n.transaction.filter.tokens_label;
	});
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.tokens_aria_label}
	count={selectedSet.size}
	searchPlaceholder={$i18n.transaction.filter.search_tokens_placeholder}
	searchable
	testId={TRANSACTIONS_FILTER_TOKENS_DROPDOWN}
	{triggerLabel}
	bind:searchValue
>
	{#snippet triggerIcon()}
		<IconCoins size="20" />
	{/snippet}

	{#snippet panel()}
		<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
			{#each filteredTokens as token (token.id.description)}
				{@const key = tokenKey(token)}

				{#if nonNullish(key)}
					<li>
						<Checkbox
							checked={selectedSet.has(key)}
							inputId={`transactions-filter-token-${key}`}
							text="inline"
							on:nnsChange={() => transactionsFilterStore.toggleTokenId(key)}
						>
							<span class="inline-flex items-center gap-2">
								<TokenLogo data={token} logoSize="xxs" />

								<span class="text-sm">
									<span class="font-medium">{token.symbol}</span>

									<span class="text-tertiary"
										>{replacePlaceholders($i18n.tokens.text.on_network, {
											$network: token.network.name
										})}</span
									>
								</span>
							</span>
						</Checkbox>
					</li>
				{/if}
			{/each}
		</ul>
	{/snippet}
</MultiSelectDropdown>

<style lang="scss">
	li :global(.checkbox) {
		--checkbox-label-order: 1;
		--checkbox-padding: 6px 8px;
		justify-content: flex-start;
		gap: 8px;
		border-radius: 6px;
		cursor: pointer;
	}

	li :global(.checkbox:hover) {
		background: var(--color-background-brand-subtle-10);
	}

	li :global(label) {
		flex: initial;
	}
</style>
