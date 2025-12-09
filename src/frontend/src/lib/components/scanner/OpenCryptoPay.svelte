<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import SelectedTokenToPay from '$lib/components/scanner/open-crypto-pay/SelectedTokenToPay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { ethAddress } from '$lib/derived/address.derived';
	import { pay } from '$lib/services/open-crypto-pay.services';
	import { authIdentity } from '$lib/derived/auth.derived';

	interface Props {
		onSelectToken: () => void;
		isTokenSelecting: boolean;
		payProgressStep: ProgressStepsPayment;
		onPay: () => void;
	}

	let {
		onSelectToken,
		onPay,
		isTokenSelecting = $bindable(),
		payProgressStep = $bindable()
	}: Props = $props();

	const { data, selectedToken } = getContext<PayContext>(PAY_CONTEXT_KEY);

	let exchangeFeeBalance = $derived(
		nonNullish($selectedToken)
			? formatCurrency({
					value: $selectedToken.feeInUSD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage,
					notBelowThreshold: true
				})
			: undefined
	);

	let exchangeBalance = $derived(
		nonNullish($selectedToken)
			? formatCurrency({
					value: $selectedToken.amountInUSD + $selectedToken.feeInUSD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	let payAmount = $derived(
		nonNullish(exchangeBalance)
			? replacePlaceholders($i18n.scanner.text.pay_amount, {
					$amount: exchangeBalance
				})
			: $i18n.scanner.text.pay
	);

	const progress = (step: ProgressStepsPayment) => (payProgressStep = step);

	const fetchPay = async () => {
		if (
			isNullish($selectedToken) ||
			isNullish($data) ||
			isNullish($ethAddress) ||
			isNullish($authIdentity)
		) {
			return;
		}

		onPay();

		try {
			await pay({
				token: $selectedToken,
				data: $data,
				from: $ethAddress,
				identity: $authIdentity,
				progress
			});
		} catch (e: unknown) {
			// TODO: add steps to redirect to Payment Failed screen and add event
			console.warn(e);
		}
	};
</script>

<ContentWithToolbar>
	<div>
		{#if nonNullish($data)}
			<PayHero
				amount={$data.requestedAmount.amount}
				asset={$data.requestedAmount.asset}
				receipt={$data.displayName}
			/>

			<SelectedTokenToPay {onSelectToken} bind:isTokenSelecting />

			{#if nonNullish($selectedToken)}
				<ModalValue>
					{#snippet label()}
						{$i18n.fee.text.network_fee}
					{/snippet}

					{#snippet secondaryValue()}
						<div class="text-sm">{exchangeFeeBalance}</div>
					{/snippet}
				</ModalValue>
			{/if}

			{#if nonNullish($data.recipient)}
				<ReceiptData recipient={$data.recipient} />
			{/if}
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<Button disabled={isNullish($selectedToken)} onclick={fetchPay}>{payAmount}</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
