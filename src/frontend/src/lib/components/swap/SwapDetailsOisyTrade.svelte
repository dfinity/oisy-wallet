<script lang="ts">
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import LimitOrderTermsList from '$lib/components/trading/limit-order/LimitOrderTermsList.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';
	import { resolveText } from '$lib/utils/i18n.utils';
	import { feeBpsToPercent } from '$lib/utils/oisy-trade.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.OISY_TRADE }>;
	}

	const { provider }: Props = $props();

	const { fees, takerFeeBps, minNotional, quoteToken } = $derived(provider.swapDetails);

	const takerFee = $derived(feeBpsToPercent(takerFeeBps));

	const formattedMinNotional = $derived(
		formatToken({
			value: minNotional,
			unitName: quoteToken.decimals,
			displayDecimals: quoteToken.decimals
		})
	);
</script>

<!-- The venue / order-type / taker-rate rows are the shipped Trading component,
	 not a rebuild: `takerOnly` is exactly the fill-or-kill case it was written for,
	 and its DEX row is already marked like Swap's provider row. -->
<LimitOrderTermsList
	makerFee={null}
	orderTypeLabel={$i18n.trading.limit_order.order_type_fok}
	{takerFee}
	takerOnly
/>

<!-- Rates and amounts are complementary, not alternatives: the rows above answer
	 "what does this venue charge", these answer "what does this swap cost".
	 Itemized and never summed — the fees span two tokens, so a single total would
	 be a cross-token addition. -->
<!-- Keyed by index, like `SwapFees`' own fee rows: the list is fixed-length and never
	 reordered, and neither field is a safe identity — two of the three fees are
	 denominated in the same token, and a future itemization could reuse a label. -->
{#each fees as { labelPath, fee, token }, index (index)}
	<FeeDisplay
		decimals={token.decimals}
		exchangeRate={$exchanges?.[token.id]?.usd}
		feeAmount={fee}
		symbol={token.symbol}
		zeroAmountLabel={$i18n.fee.text.zero_fee}
	>
		{#snippet label()}{resolveText({ i18n: $i18n, path: labelPath })}{/snippet}
	</FeeDisplay>
{/each}

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.oisy_trade_minimum_notional}
	{/snippet}

	{#snippet mainValue()}
		{formattedMinNotional}
		{quoteToken.symbol}
	{/snippet}
</ModalValue>
