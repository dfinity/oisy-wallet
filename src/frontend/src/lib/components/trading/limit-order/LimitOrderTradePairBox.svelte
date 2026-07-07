<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import LimitOrderTokenPill from '$lib/components/trading/limit-order/LimitOrderTokenPill.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		deriveQuoteAmount,
		formatTradeAmount,
		type LimitOrderPairView,
		type LimitOrderSide,
		validateAmount
	} from '$lib/utils/oisy-trade.utils';

	interface Props {
		side: LimitOrderSide;
		baseSymbol?: string;
		quoteSymbol?: string;
		baseToken?: IcToken;
		baseExchangeRate?: number;
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
		baseToken,
		baseExchangeRate,
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

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	// `TokenInput` two-way binds the raw amount; bridge it to the parent-owned
	// `baseAmount` (a string), re-normalizing every edit to the pair's lot precision
	// through the limit-order rule the parent applies in `onBaseInput`.
	const getAmount = (): OptionAmount => baseAmount;
	const setAmount = (value: OptionAmount) => onBaseInput(nonNullish(value) ? `${value}` : '');

	const baseNum = $derived(parseFloat(baseAmount));
	const priceNum = $derived(parseFloat(price));
	const freeSpend = $derived(side === 'sell' ? freeBase : freeQuote);

	const quoteAmount = $derived(deriveQuoteAmount({ baseAmount: baseNum, price: priceNum }));

	// Format through the shared token formatter (rounds to the quote decimals,
	// no raw float artifacts).
	const quoteAmountDisplay = $derived(
		quoteAmount > 0
			? formatTradeAmount({ amount: quoteAmount, decimals: pairView?.quoteDecimals ?? 8 })
			: '-'
	);

	// Format amounts to the pair's decimals so the error strings never leak raw
	// float artifacts (e.g. "5.699999999999999").
	const fmtBase = (amount: number): string =>
		formatTradeAmount({ amount, decimals: pairView?.baseDecimals ?? 8 });
	const fmtQuote = (amount: number): string =>
		formatTradeAmount({ amount, decimals: pairView?.quoteDecimals ?? 8 });

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

	const amountErrorKind = $derived.by((): string | undefined => {
		if (isNullish(pairView) || !(baseNum > 0)) {
			return undefined;
		}
		return validateAmount({
			side,
			baseAmount: baseNum,
			price: priceNum,
			freeBalance: freeSpend,
			pair: pairView
		}).errorKind;
	});

	// The limit order reports rich, pair-aware error kinds; map any of them onto a
	// single `errorType` so the shared input shows its red highlight, and render the
	// full pair-aware message below. Routed through `TokenInput`'s `onCustomValidate`
	// so the component owns (and does not clobber) its own `errorType` state.
	const onCustomValidate = (): TokenActionErrorType =>
		nonNullish(amountErrorKind) ? 'insufficient-funds' : undefined;

	const amountError = $derived.by((): string | undefined => {
		const t = $i18n.trading.limit_order;
		switch (amountErrorKind) {
			case 'balance':
				return side === 'sell'
					? replacePlaceholders(t.error_balance_sell, {
							$amount: fmtBase(freeBase),
							$symbol: baseSymbol ?? ''
						})
					: replacePlaceholders(t.error_balance_buy, {
							$cost: fmtQuote(quoteAmount),
							$symbol: quoteSymbol ?? '',
							$available: fmtQuote(freeQuote)
						});
			case 'lot':
				return replacePlaceholders(t.error_lot_multiple, {
					$step: fmtBase(pairView?.lotSize ?? 0),
					$symbol: baseSymbol ?? ''
				});
			case 'min_notional':
				return replacePlaceholders(t.error_min_notional, {
					$amount: fmtQuote(pairView?.minNotional ?? 0),
					$symbol: quoteSymbol ?? ''
				});
			case 'max_notional':
				return replacePlaceholders(t.error_max_notional, {
					$amount: fmtQuote(pairView?.maxNotional ?? 0),
					$symbol: quoteSymbol ?? ''
				});
			default:
				return undefined;
		}
	});
</script>

<div class="rounded-lg border border-disabled bg-secondary px-3 py-1">
	<!-- Base row: shared amount input + token selector -->
	<div class="py-2">
		<TokenInput
			displayUnit={inputUnit}
			exchangeRate={baseExchangeRate}
			isSelectable
			onClick={onSelectBase}
			{onCustomValidate}
			showTokenNetwork
			token={baseToken}
			bind:amount={getAmount, setAmount}
		>
			{#snippet title()}{baseLabel}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					{#if nonNullish(baseToken)}
						<TokenInputAmountExchange
							amount={baseAmount}
							exchangeRate={baseExchangeRate}
							token={baseToken}
							bind:displayUnit={exchangeValueUnit}
						/>
					{/if}
				</div>
			{/snippet}

			{#snippet balance()}
				{#if nonNullish(baseSymbol)}
					{#if side === 'sell'}
						<button
							class="font-semibold text-brand-primary-alt"
							disabled={!maxEnabled}
							onclick={onMax}
							type="button"
						>
							{replacePlaceholders($i18n.trading.limit_order.max_with_amount, {
								$amount: fmtBase(freeBase),
								$symbol: baseSymbol
							})}
						</button>
					{:else}
						<span class="text-tertiary">
							{replacePlaceholders($i18n.trading.limit_order.balance, {
								$amount: fmtBase(freeBase),
								$symbol: baseSymbol
							})}
						</span>
					{/if}
				{/if}
			{/snippet}
		</TokenInput>
		{#if nonNullish(amountError)}
			<p class="mt-1 text-xs text-error-primary">{amountError}</p>
		{/if}
	</div>

	<!-- Connector -->
	<div class="flex items-center gap-2 py-1 text-xs text-secondary">
		<span class="h-px flex-1 bg-disabled"></span>
		<span>{connector}</span>
		<span class="h-px flex-1 bg-disabled"></span>
	</div>

	<!-- Quote row: read-only derived readout (not an input) -->
	<div class="py-2">
		<div class="flex items-center justify-between text-xs text-tertiary">
			<span>{quoteLabel}</span>
			<span>{$i18n.trading.limit_order.network}</span>
		</div>
		<div class="mt-1.5 flex items-center gap-2">
			<span class="w-full text-xl text-secondary">
				{quoteAmountDisplay}
			</span>
			<LimitOrderTokenPill
				disabled={isNullish(baseSymbol)}
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
							$amount: fmtQuote(freeQuote),
							$symbol: quoteSymbol
						})}
					</button>
				{:else}
					<span class="text-tertiary">
						{replacePlaceholders($i18n.trading.limit_order.balance, {
							$amount: fmtQuote(freeQuote),
							$symbol: quoteSymbol
						})}
					</span>
				{/if}
			{/if}
		</div>
	</div>
</div>
