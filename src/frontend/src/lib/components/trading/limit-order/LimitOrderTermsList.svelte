<script lang="ts">
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// The DEX / order-type / fee info rows shared by the limit-order Review and the
	// order-detail modal. Fees are `null` while the pair is unknown (renders "-").
	interface Props {
		orderTypeLabel: string;
		makerFee: number | null;
		takerFee: number | null;
		// Fill-or-kill only ever pays the taker fee, so show that single rate.
		takerOnly?: boolean;
	}

	let { orderTypeLabel, makerFee, takerFee, takerOnly = false }: Props = $props();

	const feePercent = (value: number | null): string =>
		value === null
			? '-'
			: value === 0
				? $i18n.trading.limit_order.no_fee
				: replacePlaceholders($i18n.trading.limit_order.fee_percent, { $value: value.toString() });
</script>

<ModalValue>
	{#snippet label()}{$i18n.trading.limit_order.dex}{/snippet}
	{#snippet mainValue()}
		<!-- Marked like Swap's provider row, and matching the routing row on the form.
			 Decorative: the mark carries its own `aria-label`, which would otherwise be
			 announced on top of the provider name beside it (same as the deposit form). -->
		<span class="inline-flex items-center gap-2">
			<span class="flex" aria-hidden="true">
				<OisyTradeMark size="16" />
			</span>
			{OISY_TRADE_PROVIDER_NAME}
		</span>
	{/snippet}
</ModalValue>
<ModalValue>
	{#snippet label()}{$i18n.trading.limit_order.order_type}{/snippet}
	{#snippet mainValue()}{orderTypeLabel}{/snippet}
</ModalValue>
<ModalValue>
	{#snippet label()}
		{takerOnly ? $i18n.trading.limit_order.fee_taker : $i18n.trading.limit_order.fee_maker_taker}
	{/snippet}
	{#snippet mainValue()}
		{#if takerOnly}
			{feePercent(takerFee)}
		{:else}
			{replacePlaceholders($i18n.trading.limit_order.fee_maker_taker_value, {
				$maker: feePercent(makerFee),
				$taker: feePercent(takerFee)
			})}
		{/if}
	{/snippet}
</ModalValue>
