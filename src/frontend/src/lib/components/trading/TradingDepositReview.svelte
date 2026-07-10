<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { getTokenFee } from '$icp/utils/token.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SwapFee from '$lib/components/swap/SwapFee.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import TradingDepositInfoBox from '$lib/components/trading/TradingDepositInfoBox.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: IcToken;
		amount: OptionAmount;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { token, amount, onBack, onConfirm }: Props = $props();

	let exchangeRate = $derived($exchanges?.[token.id]?.usd);

	let ledgerFee = $derived(getTokenFee(token));

	let symbol = $derived(getTokenDisplaySymbol(token));

	// Bare token amount (no symbol) for the per-line breakdown, which renders the
	// symbol separately via the shared `SwapFee` component.
	const feeTokenAmount = (value: bigint): string =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	// Matches the canonical swap fees layout: the total is shown in fiat (with a
	// token fallback when the token has no exchange rate) while the breakdown rows
	// stay in token units.
	const formatTotalFee = (value: bigint): string => {
		if (isNullish(exchangeRate)) {
			return `${feeTokenAmount(value)} ${symbol}`;
		}

		const feeUsd = (Number(value) / 10 ** token.decimals) * exchangeRate;

		return (
			formatCurrency({
				value: feeUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage,
				notBelowThreshold: true
			}) ?? `${feeTokenAmount(value)} ${symbol}`
		);
	};
</script>

<ContentWithToolbar>
	<SendTokenReview {exchangeRate} sendAmount={amount} {token}>
		{#snippet subtitle()}{$i18n.trading.deposit.you_deposit}{/snippet}
	</SendTokenReview>

	<div class="mt-4 flex flex-col gap-2">
		<ModalValue>
			{#snippet label()}{$i18n.trading.deposit.network}{/snippet}
			{#snippet mainValue()}<NetworkWithLogo network={token.network} />{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}{$i18n.trading.deposit.to}{/snippet}
			{#snippet mainValue()}
				<span class="flex items-center gap-2">
					<span class="flex" aria-hidden="true">
						<OisyTradeMark size="22" />
					</span>
					{$i18n.trading.text.provider_name}
				</span>
			{/snippet}
		</ModalValue>

		{#if nonNullish(ledgerFee)}
			<ModalExpandableValues>
				{#snippet listHeader()}
					<ModalValue>
						{#snippet label()}{$i18n.trading.deposit.transaction_fee}{/snippet}
						{#snippet mainValue()}{formatTotalFee(ledgerFee * 2n)}{/snippet}
					</ModalValue>
				{/snippet}

				{#snippet listItems()}
					<SwapFee
						fee={feeTokenAmount(ledgerFee)}
						feeLabel={$i18n.trading.deposit.approval_fee}
						{symbol}
					/>
					<SwapFee
						fee={feeTokenAmount(ledgerFee)}
						feeLabel={$i18n.trading.deposit.transfer_fee}
						{symbol}
					/>
				{/snippet}
			</ModalExpandableValues>
		{/if}
	</div>

	<div class="mt-4">
		<TradingDepositInfoBox />
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />
			<Button onclick={onConfirm} testId={TRADING_DEPOSIT_REVIEW_CONFIRM_BUTTON}>
				{$i18n.trading.deposit.title}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
