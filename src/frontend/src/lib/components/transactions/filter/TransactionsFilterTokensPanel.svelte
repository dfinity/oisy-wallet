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

<div class="flex flex-col gap-2">
	<InputSearch
		placeholder={$i18n.transaction.filter.search_tokens_placeholder}
		showResetButton={searchValue.length > 0}
		bind:filter={searchValue}
	/>

	<ul class="m-0 flex list-none flex-col gap-1 p-0">
		{#each filteredTokens as token (token.id.description)}
			{@const key = tokenKey(token)}
			{#if nonNullish(key)}
				<li class="flex items-center gap-2">
					<Checkbox
						checked={selectedSet.has(key)}
						inputId={`transactions-filter-token-${key}`}
						text="inline"
						on:nnsChange={() => transactionsFilterStore.toggleTokenId(key)}
					>
						<span class="flex items-center gap-2">
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
