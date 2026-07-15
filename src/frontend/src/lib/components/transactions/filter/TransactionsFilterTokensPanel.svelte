<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import { transactionsFilterTokenKey } from '$lib/utils/transactions-filter.utils';

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

	const tokenRenderKey = (token: Token): string | undefined => transactionsFilterTokenKey(token);

	const tokenInputId = (token: Token): string =>
		`transactions-filter-token-${(tokenRenderKey(token) ?? '').replace(/[^A-Za-z0-9_-]/g, '-')}`;

	let sortedTokens = $derived(
		[
			...new Map(
				[...$enabledFungibleNetworkTokens]
					.map((token) => [tokenRenderKey(token), token] as const)
					.filter((entry): entry is [string, Token] => nonNullish(entry[0]))
			).values()
		].sort((a, b) => {
			const bySymbol = a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' });

			return bySymbol !== 0
				? bySymbol
				: a.network.name.localeCompare(b.network.name, undefined, { sensitivity: 'base' });
		})
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

	const onToggleToken = ({ token, key }: { token: Token; key: string }) => {
		trackTransactionFilter({
			modifier: selectedSet.has(key)
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.UNSET
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.SET,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
			token: {
				// Native tokens have no on-chain identifier; ship empty string
				// so the column stays present and is groupable in dashboards.
				network: token.network.id.description ?? '',
				address: getTokenIdentifier(token) ?? '',
				symbol: token.symbol,
				name: token.name
			}
		});

		transactionsFilterStore.toggleTokenId(key);
	};
</script>

<div class="flex flex-col gap-3">
	<!--
		Keep the search input out of any scroll container so it stays put
		when the user scrolls the rows. `MultiSelectDropdown` no longer
		imposes its own scroll wrapper, so the panel owns the layout: the
		`<ul>` is the scroll port (capped at `max-h-80`), the search and
		the "showing N of M" hint live as siblings above / below it.
	-->
	<InputSearch
		{autofocus}
		placeholder={$i18n.transaction.filter.search_tokens_placeholder}
		showResetButton={searchValue.length > 0}
		bind:filter={searchValue}
	/>

	<ul class="m-0 flex max-h-80 list-none flex-col gap-0.5 overflow-y-auto p-0">
		{#each visibleTokens as token (tokenRenderKey(token))}
			{@const key = tokenRenderKey(token)}

			{#if nonNullish(key)}
				<li>
					<Checkbox
						checked={selectedSet.has(key)}
						inputId={tokenInputId(token)}
						onChange={() => onToggleToken({ token, key })}
						text="inline"
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
		<p class="text-xs text-tertiary">
			{replacePlaceholders($i18n.transaction.filter.showing_partial, {
				$shown: `${VISIBLE_LIMIT}`,
				$total: `${filteredTokens.length}`
			})}
		</p>
	{/if}
</div>

<style lang="scss">
	@use '../../../styles/mixins/media';

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

	// On mobile, give each row a comfortable touch target so checkboxes
	// are easier to tap. The desktop dropdown keeps its denser layout.
	@media (max-width: #{media.$breakpoint-medium - 1px}) {
		li :global(.checkbox) {
			--checkbox-padding: 12px;
		}
	}
</style>
