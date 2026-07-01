<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { getTokenFee } from '$icp/utils/token.utils';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
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

	const formatFeeToken = (value: bigint): string =>
		`${formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })} ${getTokenDisplaySymbol(token)}`;

	// Fees are shown in fiat to match the rest of the app (hero, My-assets, the
	// canonical `TokenFeeValue`). Falls back to the token amount when the token has
	// no exchange rate, so the breakdown is never blank.
	const formatFee = (value: bigint): string => {
		if (isNullish(exchangeRate)) {
			return formatFeeToken(value);
		}

		const feeUsd = (Number(value) / 10 ** token.decimals) * exchangeRate;

		return (
			formatCurrency({
				value: feeUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage,
				notBelowThreshold: true
			}) ?? formatFeeToken(value)
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
			{#snippet mainValue()}{$i18n.trading.text.provider_name}{/snippet}
		</ModalValue>

		{#if nonNullish(ledgerFee)}
			<ModalExpandableValues>
				{#snippet listHeader()}
					<ModalValue>
						{#snippet label()}{$i18n.trading.deposit.transaction_fee}{/snippet}
						{#snippet mainValue()}{formatFee(ledgerFee * 2n)}{/snippet}
					</ModalValue>
				{/snippet}

				{#snippet listItems()}
					<ModalValue>
						{#snippet label()}{$i18n.trading.deposit.approval_fee}{/snippet}
						{#snippet mainValue()}{formatFee(ledgerFee)}{/snippet}
					</ModalValue>
					<ModalValue>
						{#snippet label()}{$i18n.trading.deposit.transfer_fee}{/snippet}
						{#snippet mainValue()}{formatFee(ledgerFee)}{/snippet}
					</ModalValue>
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
