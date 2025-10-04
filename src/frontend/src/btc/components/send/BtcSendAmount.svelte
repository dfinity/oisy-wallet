<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
	import { BtcAmountAssertionError } from '$btc/types/btc-send';
	import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
	import { invalidSendAmount } from '$btc/utils/input.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		amountError?: BtcAmountAssertionError;
		onTokensList: () => void;
	}

	let { amount = $bindable(), amountError = $bindable(), onTokensList }: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	const { sendBalance, sendToken, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	// TODO: Enable Max button by passing the `calculateMax` prop - https://dfinity.atlassian.net/browse/GIX-3114

	const customValidate = (userAmount: bigint): Error | undefined => {
		// calculate-UTXOs-fee endpoint only accepts "userAmount > 0"
		if (invalidAmount(Number(userAmount)) || userAmount === ZERO) {
			return new BtcAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (invalidSendAmount(Number(userAmount))) {
			return new BtcAmountAssertionError(
				replacePlaceholders($i18n.send.assertion.minimum_btc_amount, {
					$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
				})
			);
		}

		if (userAmount > ($sendBalance ?? ZERO)) {
			return new BtcAmountAssertionError($i18n.send.assertion.insufficient_funds);
		}
	};
</script>

<div class="mb-4">
	<TokenInput
		autofocus={nonNullish($sendToken)}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		onClick={onTokensList}
		onCustomErrorValidate={customValidate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
	>
		{#snippet title()}{$i18n.core.text.amount}{/snippet}

		{#snippet amountInfo()}
			{#if nonNullish($sendToken)}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/if}
		{/snippet}

		{#snippet balance()}
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>
