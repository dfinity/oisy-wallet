<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import SelectedTokenToPay from '$lib/components/scanner/open-crypto-pay/SelectedTokenToPay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	let { onSelectToken, isTokenSelecting = $bindable() }: any = $props();

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
						{$i18n.fee.text.fee}
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
			<!-- TODO: Implement payment logic and enable Pay button -->
			<Button disabled={true} onclick={() => {}}>{payAmount}</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
