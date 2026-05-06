<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { allFungibleTokens } from '$lib/derived/all-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let searchValue = $state('');

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));

	const tokenKey = (token: Token): string | undefined => token.id.description;

	let sortedTokens = $derived(
		[...$allFungibleTokens].sort((a, b) =>
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
</script>

<div class="flex flex-col gap-3">
	<InputSearch
		placeholder={$i18n.transaction.filter.search_tokens_placeholder}
		showResetButton={searchValue.length > 0}
		bind:filter={searchValue}
	/>

	<ul class="filter-list">
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
						<span class="row-content">
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
</div>

<style lang="scss">
	ul.filter-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		list-style: none;
		margin: 0;
		padding: 0;

		// See TransactionsFilterTypesPanel for the rationale.
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

		.row-content {
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}
	}
</style>
