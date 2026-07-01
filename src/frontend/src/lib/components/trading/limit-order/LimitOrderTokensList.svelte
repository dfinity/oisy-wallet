<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { oisyTradeBalances, oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

	interface Props {
		mode: 'base' | 'quote';
		side: LimitOrderSide;
		baseSymbol?: string;
		onSelect: (symbol: string) => void;
		onCancel: () => void;
	}

	let { mode, side, baseSymbol, onSelect, onCancel }: Props = $props();

	const { setTokens } = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	const pairs = $derived($oisyTradePairs);

	// Only the leg that is sold needs deposited funds (the base on a Sell, the
	// quote on a Buy). For that leg show the free DEX balance — what can actually
	// be traded — instead of the wallet balance; the received leg keeps the wallet
	// balance the user already holds.
	const showDepositBalance = $derived(
		(mode === 'base' && side === 'sell') || (mode === 'quote' && side === 'buy')
	);

	const dexFreeByLedger = $derived(
		$oisyTradeBalances.reduce<Record<string, bigint>>(
			(acc, { token, balance }) => ({ ...acc, [token.id.ledger_id.toText()]: balance.free }),
			{}
		)
	);

	// The OISY TRADE tokens eligible for this step, deduped by symbol:
	//  - base: every distinct base symbol that has at least one market;
	//  - quote: the quotes paired with the chosen base.
	// Each is resolved to the matching app token (by ledger canister id) so the
	// shared picker renders the real logo, name, network and balance — the same
	// UX as the swap token list. Trade tokens without a matching app token are
	// dropped (they can't be displayed by the shared item).
	const tokens: IcToken[] = $derived.by(() => {
		const byLedger: Record<string, IcToken> = $enabledIcTokens.reduce<Record<string, IcToken>>(
			(acc, token) => ({ ...acc, [token.ledgerCanisterId]: token }),
			{}
		);

		const tradeTokens =
			mode === 'base'
				? pairs.map((p) => p.base)
				: pairs.filter((p) => p.base.metadata.symbol === baseSymbol).map((p) => p.quote);

		// Resolve each eligible trade token to its app token (by ledger id), drop
		// the ones with no match, then dedupe by symbol (a symbol can recur across
		// several markets) keeping the first occurrence.
		const resolved = tradeTokens
			.map((tradeToken) => byLedger[tradeToken.id.ledger_id.toText()])
			.filter(nonNullish)
			.filter(
				(token, index, all) => all.findIndex(({ symbol }) => symbol === token.symbol) === index
			);

		// The spend leg can only use funds already on the DEX, so restrict it to
		// tokens with a free balance (and show that balance). The receive leg — what
		// you buy on a Buy, what you're paid on a Sell — has no such requirement, so
		// it lists every supported token regardless of deposit.
		return showDepositBalance
			? resolved
					.map((token) => ({
						...token,
						balance: dexFreeByLedger[token.ledgerCanisterId] ?? ZERO
					}))
					.filter(({ balance }) => balance > ZERO)
			: resolved;
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
