<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PayHero from '$lib/components/scanner/PayHero.svelte';
	import ReceiptData from '$lib/components/scanner/PayReceiptData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';
	import SelectedTokenToPay from './SelectedTokenToPay.svelte';
	import ModalValue from '../ui/ModalValue.svelte';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	// import { pay } from '$lib/services/open-crypto-pay.services';
	// import { ethAddress } from '$lib/derived/address.derived';
	// import { authIdentity } from '$lib/derived/auth.derived';

	let { onSelectToken, isTokenSelecting = $bindable() }: any = $props();

	const { data, availableTokens } = getContext<PayContext>(PAY_CONTEXT_KEY);

	console.log({ tokens: $availableTokens });

	// const { data, selectedToken } = getContext<PayContext>(PAY_CONTEXT_KEY);

	// let exchangeFeeBalance = $derived(
	// 	nonNullish($selectedToken)
	// 		? formatCurrency({
	// 				value: $selectedToken.feeInUSD,
	// 				currency: $currentCurrency,
	// 				exchangeRate: $currencyExchangeStore,
	// 				language: $currentLanguage,
	// 				notBelowThreshold: true
	// 			})
	// 		: undefined
	// );

	// let exchangeBalance = $derived(
	// 	nonNullish($selectedToken)
	// 		? formatCurrency({
	// 				value: $selectedToken.amountInUSD + $selectedToken.feeInUSD,
	// 				currency: $currentCurrency,
	// 				exchangeRate: $currencyExchangeStore,
	// 				language: $currentLanguage
	// 			})
	// 		: undefined
	// );

	// const fetchPay = async () => {
	// 	if (
	// 		isNullish($selectedToken) ||
	// 		isNullish($data) ||
	// 		isNullish($ethAddress) ||
	// 		isNullish($authIdentity)
	// 	) {
	// 		return;
	// 	}

	// 	try {
	// 		await pay({ token: $selectedToken, data: $data, from: $ethAddress, identity: $authIdentity });
	// 	} catch (e: unknown) {
	// 		console.log(e);
	// 	}
	// };
</script>

<ContentWithToolbar>
	<div>
		{#if nonNullish($data)}
			<PayHero
				amount={$data.requestedAmount.amount}
				asset={$data.requestedAmount.asset}
				receipt={$data.displayName}
			/>

			<!-- <SelectedTokenToPay {onSelectToken} bind:isTokenSelecting /> -->

			<!-- {#if nonNullish($selectedToken)}
				<ModalValue>
					{#snippet label()}
						Fee
					{/snippet}

					{#snippet secondaryValue()}
						<div class="text-sm">{exchangeFeeBalance}</div>
					{/snippet}
				</ModalValue>
			{/if}

			{#if nonNullish($data.recipient)}
				<ReceiptData recipient={$data.recipient} />
			{/if} -->
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<!-- <Button disabled={isNullish($selectedToken)} onclick={fetchPay}>Pay {exchangeBalance}</Button> -->
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
