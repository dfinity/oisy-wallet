<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputContent from '$lib/components/tokens/TokenInputContent.svelte';
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
		quoteToken?: IcToken;
		baseExchangeRate?: number;
		quoteExchangeRate?: number;
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
		quoteToken,
		baseExchangeRate,
		quoteExchangeRate,
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

	// The quote leg is a read-only, non-editable readout of the derived amount. Format
	// it to the quote decimals (as a string) so float artifacts from `base × price`
	// (e.g. 0.1 × 3) never leak into the field; below the min notional (or before a
	// base is chosen) it stays empty so the shared input shows its placeholder.
	const quoteAmountValue = $derived<OptionAmount>(
		quoteAmount > 0
			? formatTradeAmount({ amount: quoteAmount, decimals: pairView?.quoteDecimals ?? 8 })
			: undefined
	);

	// The quote can only be chosen once a base is set (the quote list is filtered
	// by the base's markets), mirroring the previous disabled-pill behaviour.
	const onSelectQuoteGuarded = () => {
		if (nonNullish(baseSymbol)) {
			onSelectQuote();
		}
	};

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

	// Each amount error belongs to a specific leg: a balance shortfall is on the token
	// being spent (buy → quote, sell → base), the lot grid is on the base amount, and
	// the notional bounds are on the quote-denominated order value. Surface the message
	// — and the red highlight — under the matching token box.
	const amountErrorField = $derived.by((): 'base' | 'quote' | undefined => {
		switch (amountErrorKind) {
			case 'balance':
				return side === 'buy' ? 'quote' : 'base';
			case 'lot':
				return 'base';
			case 'min_notional':
			case 'max_notional':
				return 'quote';
			default:
				return undefined;
		}
	});

	// Map the error onto the owning leg's `errorType` so only that shared input shows
	// its red highlight. Routed through `TokenInputContent`'s `onCustomValidate` so the
	// component owns (and does not clobber) its own `errorType` state.
	const onBaseCustomValidate = (): TokenActionErrorType =>
		amountErrorField === 'base' ? 'insufficient-funds' : undefined;
	const onQuoteCustomValidate = (): TokenActionErrorType =>
		amountErrorField === 'quote' ? 'insufficient-funds' : undefined;

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

	const baseAmountError = $derived(amountErrorField === 'base' ? amountError : undefined);
	const quoteAmountError = $derived(amountErrorField === 'quote' ? amountError : undefined);
</script>

<div class="rounded-lg border border-disabled bg-secondary px-3 py-1">
	<!-- Base row: shared amount input + token selector -->
	<div class="py-2">
		<TokenInputContent
			displayUnit={inputUnit}
			exchangeRate={baseExchangeRate}
			isSelectable
			onClick={onSelectBase}
			onCustomValidate={onBaseCustomValidate}
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
		</TokenInputContent>
		{#if nonNullish(baseAmountError)}
			<p class="mt-1 text-xs text-error-primary">{baseAmountError}</p>
		{/if}
	</div>

	<!-- Connector -->
	<div class="flex items-center gap-2 py-1 text-xs text-secondary">
		<span class="h-px flex-1 bg-disabled"></span>
		<span>{connector}</span>
		<span class="h-px flex-1 bg-disabled"></span>
	</div>

	<!-- Quote row: shared token selector with a read-only, non-editable derived amount -->
	<div class="py-2">
		<TokenInputContent
			amount={quoteAmountValue}
			disabled={true}
			displayUnit={inputUnit}
			exchangeRate={quoteExchangeRate}
			isSelectable={nonNullish(baseSymbol)}
			onClick={onSelectQuoteGuarded}
			onCustomValidate={onQuoteCustomValidate}
			readOnly={true}
			showTokenNetwork
			token={quoteToken}
		>
			{#snippet title()}{quoteLabel}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					{#if nonNullish(quoteToken)}
						<TokenInputAmountExchange
							amount={quoteAmountValue}
							exchangeRate={quoteExchangeRate}
							token={quoteToken}
							bind:displayUnit={exchangeValueUnit}
						/>
					{/if}
				</div>
			{/snippet}

			{#snippet balance()}
				{#if nonNullish(quoteSymbol)}
					{#if side === 'buy'}
						<button
							class="font-semibold text-brand-primary-alt"
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
			{/snippet}
		</TokenInputContent>
		{#if nonNullish(quoteAmountError)}
			<p class="mt-1 text-xs text-error-primary">{quoteAmountError}</p>
		{/if}
	</div>
</div>
