<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import LimitOrderTokenPill from '$lib/components/trading/limit-order/LimitOrderTokenPill.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		deriveQuoteAmount,
		type LimitOrderPairView,
		type LimitOrderSide,
		validateAmount
	} from '$lib/utils/oisy-trade.utils';

	interface Props {
		side: LimitOrderSide;
		baseSymbol?: string;
		quoteSymbol?: string;
		baseAmount: string;
		price: string;
		pairView?: LimitOrderPairView;
		freeBase: number;
		freeQuote: number;
		onSelectBase: () => void;
		onSelectQuote: () => void;
		onBaseInput: (value: string) => void;
		onMax: () => void;
	}

	let {
		side,
		baseSymbol,
		quoteSymbol,
		baseAmount,
		price,
		pairView,
		freeBase,
		freeQuote,
		onSelectBase,
		onSelectQuote,
		onBaseInput,
		onMax
	}: Props = $props();

	const baseNum = $derived(parseFloat(baseAmount));
	const priceNum = $derived(parseFloat(price));
	const freeSpend = $derived(side === 'sell' ? freeBase : freeQuote);

	const quoteAmount = $derived(deriveQuoteAmount({ baseAmount: baseNum, price: priceNum }));

	const baseLabel = $derived(
		side === 'sell' ? $i18n.trading.limit_order.you_sell : $i18n.trading.limit_order.you_buy
	);
	const quoteLabel = $derived(
		side === 'sell'
			? $i18n.trading.limit_order.you_get_at_least
			: $i18n.trading.limit_order.you_pay_at_most
	);
	const connector = $derived(
		side === 'sell'
			? $i18n.trading.limit_order.connector_for
			: $i18n.trading.limit_order.connector_with
	);

	// Buy Max needs a positive price; disabled otherwise.
	const maxEnabled = $derived(side === 'sell' || priceNum > 0);

	const amountError = $derived.by((): string | undefined => {
		if (!nonNullish(pairView) || !(baseNum > 0)) {
			return undefined;
		}
		const { errorKind } = validateAmount({
			side,
			baseAmount: baseNum,
			price: priceNum,
			freeBalance: freeSpend,
			pair: pairView
		});
		const t = $i18n.trading.limit_order;
		switch (errorKind) {
			case 'balance':
				return side === 'sell'
					? replacePlaceholders(t.error_balance_sell, {
							$amount: freeBase.toString(),
							$symbol: baseSymbol ?? ''
						})
					: replacePlaceholders(t.error_balance_buy, {
							$cost: quoteAmount.toString(),
							$symbol: quoteSymbol ?? '',
							$available: freeQuote.toString()
						});
			case 'lot':
				return replacePlaceholders(t.error_lot_multiple, {
					$step: pairView.lotSize.toString(),
					$symbol: baseSymbol ?? ''
				});
			case 'min_notional':
				return replacePlaceholders(t.error_min_notional, {
					$amount: pairView.minNotional.toString(),
					$symbol: quoteSymbol ?? ''
				});
			case 'max_notional':
				return replacePlaceholders(t.error_max_notional, {
					$amount: (pairView.maxNotional ?? 0).toString(),
					$symbol: quoteSymbol ?? ''
				});
			default:
				return undefined;
		}
	});
</script>

<div class="rounded-lg border border-disabled bg-secondary px-3 py-1">
	<!-- Base row -->
	<div class="py-2">
		<div class="flex items-center justify-between text-xs text-tertiary">
			<span>{baseLabel}</span>
			<span>{$i18n.trading.limit_order.network}</span>
		</div>
		<div class="mt-1.5 flex items-center gap-2">
			<input
				class="w-full rounded-md border border-secondary bg-primary px-2 py-1 text-xl text-primary outline-none focus:border-brand-primary"
				class:border-error-primary={nonNullish(amountError)}
				oninput={(e) => onBaseInput(e.currentTarget.value)}
				placeholder={$i18n.trading.limit_order.amount_placeholder}
				type="text"
				value={baseAmount}
			/>
			<LimitOrderTokenPill onclick={onSelectBase} symbol={baseSymbol} />
		</div>
		{#if nonNullish(amountError)}
			<p class="mt-1 text-xs text-error-primary">{amountError}</p>
		{/if}
		<div class="mt-1 flex items-center justify-end text-xs">
			{#if nonNullish(baseSymbol)}
				{#if side === 'sell'}
					<button
						class="font-medium text-brand-primary"
						disabled={!maxEnabled}
						onclick={onMax}
						type="button"
					>
						{replacePlaceholders($i18n.trading.limit_order.max_with_amount, {
							$amount: freeBase.toString(),
							$symbol: baseSymbol
						})}
					</button>
				{:else}
					<span class="text-tertiary">
						{replacePlaceholders($i18n.trading.limit_order.balance, {
							$amount: freeBase.toString(),
							$symbol: baseSymbol
						})}
					</span>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Connector -->
	<div class="flex items-center gap-2 py-1 text-xs text-secondary">
		<span class="h-px flex-1 bg-disabled"></span>
		<span>{connector}</span>
		<span class="h-px flex-1 bg-disabled"></span>
	</div>

	<!-- Quote row -->
	<div class="py-2">
		<div class="flex items-center justify-between text-xs text-tertiary">
			<span>{quoteLabel}</span>
			<span>{$i18n.trading.limit_order.network}</span>
		</div>
		<div class="mt-1.5 flex items-center gap-2">
			<span class="w-full text-xl text-secondary">
				{quoteAmount > 0 ? quoteAmount : '—'}
			</span>
			<LimitOrderTokenPill
				disabled={!nonNullish(baseSymbol)}
				onclick={onSelectQuote}
				symbol={quoteSymbol}
			/>
		</div>
		<div class="mt-1 flex items-center justify-end text-xs">
			{#if nonNullish(quoteSymbol)}
				{#if side === 'buy'}
					<button
						class="font-medium text-brand-primary"
						disabled={!maxEnabled}
						onclick={onMax}
						type="button"
					>
						{replacePlaceholders($i18n.trading.limit_order.max_with_amount, {
							$amount: freeQuote.toString(),
							$symbol: quoteSymbol
						})}
					</button>
				{:else}
					<span class="text-tertiary">
						{replacePlaceholders($i18n.trading.limit_order.balance, {
							$amount: freeQuote.toString(),
							$symbol: quoteSymbol
						})}
					</span>
				{/if}
			{/if}
		</div>
	</div>
</div>
