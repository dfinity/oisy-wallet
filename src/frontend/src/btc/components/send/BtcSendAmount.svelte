<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
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

	export let amount: OptionAmount = undefined;
	export let amountError: BtcAmountAssertionError | undefined;

	const dispatch = createEventDispatcher();

	let exchangeValueUnit: DisplayUnit = 'usd';
	let inputUnit: DisplayUnit;
	$: inputUnit = exchangeValueUnit === 'token' ? 'usd' : 'token';

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
		customErrorValidate={customValidate}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
		on:click={() => {
			dispatch('icTokensList');
		}}
	>
		<span slot="title">{$i18n.core.text.amount}</span>

		<svelte:fragment slot="amount-info">
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
		</svelte:fragment>

		<svelte:fragment slot="balance">
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		</svelte:fragment>
	</TokenInput>
</div>
