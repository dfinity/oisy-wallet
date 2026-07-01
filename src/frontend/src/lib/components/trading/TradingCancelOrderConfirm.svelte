<script lang="ts">
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { TRADING_ORDER_CANCEL_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		order: OisyTradeOrderView;
		priceDisplay: string;
		returnsToFree: string;
		onCancel: () => void;
		onConfirm: () => void;
		disabled?: boolean;
	}

	let {
		order,
		priceDisplay,
		returnsToFree,
		onCancel,
		onConfirm,
		disabled = false
	}: Props = $props();

	const orderText = $derived(
		replacePlaceholders(
			order.side === 'sell'
				? $i18n.trading.order_detail.confirm_order_sell
				: $i18n.trading.order_detail.confirm_order_buy,
			{
				$base: getTokenDisplaySymbol(order.base),
				$quote: getTokenDisplaySymbol(order.quote)
			}
		)
	);
</script>

<BottomSheetConfirmationPopup {disabled} {onCancel}>
	{#snippet title()}{$i18n.trading.order_detail.confirm_title}{/snippet}

	{#snippet content()}
		<ContentWithToolbar styleClass="flex flex-col pb-5">
			<p class="mb-4 text-center text-sm text-tertiary">
				{$i18n.trading.order_detail.confirm_description}
			</p>

			<div class="flex flex-col gap-2 rounded-lg border border-disabled px-3.5 py-3 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-tertiary">{$i18n.trading.order_detail.confirm_order}</span>
					<span class="font-medium text-primary">{orderText}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-tertiary">{$i18n.trading.order_detail.confirm_price}</span>
					<span class="font-medium text-primary">{priceDisplay}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-tertiary">{$i18n.trading.order_detail.confirm_returns_to_free}</span>
					<span class="font-medium text-primary">{returnsToFree}</span>
				</div>
			</div>

			{#snippet toolbar()}
				<ButtonGroup>
					<Button colorStyle="secondary" {disabled} onclick={onCancel}>
						{$i18n.trading.order_detail.confirm_keep}
					</Button>
					<Button
						colorStyle="error"
						loading={disabled}
						onclick={onConfirm}
						testId={TRADING_ORDER_CANCEL_CONFIRM_BUTTON}
					>
						{$i18n.trading.order_detail.cancel_order}
					</Button>
				</ButtonGroup>
			{/snippet}
		</ContentWithToolbar>
	{/snippet}
</BottomSheetConfirmationPopup>
