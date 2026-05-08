<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// When the panel is rendered inside a desktop dropdown popover the
		// caller wants the search input to grab focus on open; when it's
		// rendered inside the mobile bottom sheet we leave it unfocused so
		// the on-screen keyboard does not pop up unprompted.
		autofocus?: boolean;
	}

	const { autofocus = false }: Props = $props();

	// Cap the visible list when the user has not searched yet.
	// Mounting hundreds of <Checkbox> + <TokenLogo> rows synchronously when
	// the popover opens blocks the main thread and the dropdown feels frozen.
	// We render at most this many rows by default; users can search to find
	// any token by name or symbol and the cap is then bypassed.
	const VISIBLE_LIMIT = 50;

	let searchValue = $state('');

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.tokenIds));

	const tokenFilterKey = (token: Token): string | undefined => token.id.description;

	const tokenRenderKey = (token: Token): string =>
		`${token.id.description}-${token.network.id.description}`;

	const tokenInputId = (token: Token): string =>
		`transactions-filter-token-${tokenRenderKey(token).replace(/[^A-Za-z0-9_-]/g, '-')}`;

	let sortedTokens = $derived(
		[
			...new Map(
				[...$enabledFungibleNetworkTokens].map((token) => [tokenRenderKey(token), token])
			).values()
		].sort((a, b) =>
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

	let visibleTokens = $derived(
		searchValue.length === 0 ? filteredTokens.slice(0, VISIBLE_LIMIT) : filteredTokens
	);

	let isCapped = $derived(searchValue.length === 0 && filteredTokens.length > VISIBLE_LIMIT);
</script>

<div class="flex flex-col">
	<!--
		The popover scrolls the panel as a whole (`MultiSelectDropdown`'s
		wrapper has `max-h-80 overflow-y-auto`), so we make the search input
		`sticky` with the popover background to keep it pinned at the top
		while the rows scroll under it. `pb-3` reproduces the previous
		`gap-3` spacing while also covering scrolled rows so they don't
		bleed visually behind the input.
	-->
	<div class="sticky top-0 z-1 bg-primary pb-3">
		<InputSearch
			{autofocus}
			placeholder={$i18n.transaction.filter.search_tokens_placeholder}
			showResetButton={searchValue.length > 0}
			bind:filter={searchValue}
		/>
	</div>

	<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
		{#each visibleTokens as token (tokenRenderKey(token))}
			{@const key = tokenFilterKey(token)}

			{#if nonNullish(key)}
				<li>
					<Checkbox
						checked={selectedSet.has(key)}
						inputId={tokenInputId(token)}
						text="inline"
						on:nnsChange={() => transactionsFilterStore.toggleTokenId(key)}
					>
						<span class="inline-flex items-center gap-2">
							<span class="flex shrink-0 items-center">
								<TokenLogo data={token} logoSize="xxs" />
							</span>
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

	{#if isCapped}
		<p class="pt-3 text-xs text-tertiary">
			{replacePlaceholders($i18n.transaction.filter.showing_partial, {
				$shown: `${VISIBLE_LIMIT}`,
				$total: `${filteredTokens.length}`
			})}
		</p>
	{/if}
</div>

<style lang="scss">
	li :global(.checkbox) {
		--checkbox-label-order: 1;
		--checkbox-padding: 6px 8px;
		justify-content: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		border-radius: 6px;
		cursor: pointer;
	}

	li :global(.checkbox:hover) {
		background: var(--color-background-brand-subtle-10);
	}

	li :global(label) {
		flex: initial;
		display: inline-flex;
		align-items: center;
	}
</style>
