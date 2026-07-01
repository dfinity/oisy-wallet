<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		mode: 'base' | 'quote';
		baseSymbol?: string;
		onSelect: (symbol: string) => void;
		onCancel: () => void;
	}

	let { mode, baseSymbol, onSelect, onCancel }: Props = $props();

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const pairs = $derived($oisyTradePairs);

	// The OISY TRADE tokens eligible for this step, deduped by symbol:
	//  - base: every distinct base symbol that has at least one market;
	//  - quote: the quotes paired with the chosen base.
	// Each is resolved to the matching app token (by ledger canister id) so the
	// shared picker renders the real logo, name, network and balance — the same
	// UX as the swap token list. Trade tokens without a matching app token are
	// dropped (they can't be displayed by the shared item).
	const tokens: Token[] = $derived.by(() => {
		// Lookup objects (not Map/Set, which the svelte/prefer-svelte-reactivity
		// rule disallows in components) keep the resolve + dedupe linear.
		const byLedger: Record<string, Token> = {};
		for (const token of $enabledIcTokens) {
			byLedger[token.ledgerCanisterId] = token;
		}

		const tradeTokens =
			mode === 'base'
				? pairs.map((p) => p.base)
				: pairs.filter((p) => p.base.metadata.symbol === baseSymbol).map((p) => p.quote);

		// Resolve each eligible trade token to its app token (by ledger id), drop
		// the ones with no match, then dedupe by symbol (a symbol can recur across
		// several markets) keeping the first occurrence.
		const seen: Record<string, true> = {};
		const result: Token[] = [];
		for (const tradeToken of tradeTokens) {
			const token = byLedger[tradeToken.id.ledger_id.toText()];
			if (nonNullish(token) && !(token.symbol in seen)) {
				seen[token.symbol] = true;
				result.push(token);
			}
		}
		return result;
	});

	$effect(() => {
		setTokens(tokens);
	});

	// OISY TRADE lists IC-network tokens only (mainnet or the testnet ledgers a
	// staging DEX trades), so the network filter stays view-only — the shared
	// picker still renders search and category filters.
	const onSelectNetworkFilter = () => {};
</script>

<ModalTokensList
	networkSelectorViewOnly={true}
	{onSelectNetworkFilter}
	onTokenButtonClick={(token) => onSelect(token.symbol)}
>
	{#snippet tokenListItem(token, onClick)}
		<ModalTokensListItem {onClick} {token} />
	{/snippet}
	{#snippet noResults()}
		<p class="text-primary">{$i18n.core.text.no_results}</p>
	{/snippet}
	{#snippet toolbar()}
		<ButtonBack onclick={onCancel} />
	{/snippet}
</ModalTokensList>
