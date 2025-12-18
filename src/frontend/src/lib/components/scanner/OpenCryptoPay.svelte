<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import SelectedTokenToPay from '$lib/components/scanner/open-crypto-pay/SelectedTokenToPay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import type { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { pay } from '$lib/services/open-crypto-pay.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		onSelectToken: () => void;
		isTokenSelecting: boolean;
		payProgressStep: ProgressStepsPayment;
		onPay: () => void;
		onPaySucceeded: () => void;
		onPayFailed: () => void;
	}

	let {
		onSelectToken,
		onPay,
		onPaySucceeded,
		onPayFailed,
		isTokenSelecting = $bindable(),
		payProgressStep = $bindable()
	}: Props = $props();

	const { data, selectedToken, failedPaymentError } = getContext<PayContext>(PAY_CONTEXT_KEY);

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

		const trackEventBaseParams = {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.OPEN_CRYPTOPAY,
			event_subcontext: PLAUSIBLE_EVENT_CONTEXTS.DFX,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.PRICE,
			event_value: `${$data.requestedAmount.amount} ${$data.requestedAmount.asset}`,
			token_symbol: $selectedToken.symbol,
			token_network: $selectedToken.network.name,
			token_name: $selectedToken.name,
			token_standard: $selectedToken.standard.code,
			token_id: `${$selectedToken.id.toString()}`,
			token_usd_value: `${$selectedToken.amountInUSD}`,
			...(isTokenErc20($selectedToken) && {
				token_address: $selectedToken.address
			})
		};

		const startTime = performance.now();

		const amount = parseToken({
			value: `${$selectedToken.amount}`,
			unitName: $selectedToken.decimals
		});

		try {
			await pay({
				token: $selectedToken,
				data: $data,
				from: $ethAddress,
				identity: $authIdentity,
				progress,
				amount
			});

			const duration = performance.now() - startTime;
			const durationInSeconds = Math.round(duration / 1000);

			trackEvent({
				name: PLAUSIBLE_EVENTS.PAY,
				metadata: {
					...trackEventBaseParams,
					result_status: 'success',
					result_duration_in_seconds: `${durationInSeconds}`
				}
			});

			onPaySucceeded();
		} catch (error: unknown) {
			const duration = performance.now() - startTime;
			const durationInSeconds = Math.round(duration / 1000);
			const errorMessage = errorDetailToString(error) ?? $i18n.send.error.unexpected;

			trackEvent({
				name: PLAUSIBLE_EVENTS.PAY,
				metadata: {
					...trackEventBaseParams,
					result_status: 'error',
					result_error: errorMessage,
					result_duration_in_seconds: `${durationInSeconds}`
				}
			});

			failedPaymentError.set(errorMessage);

			onPayFailed();
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
