<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: number | undefined = undefined;
	export let amountError: BtcAmountAssertionError | undefined;

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	$: calculateMax = (): number | undefined =>
		isNullish($sendToken)
			? undefined
			: // TODO: Add fee to the calculation
				getMaxTransactionAmount({
					balance: $sendBalance ?? undefined,
					tokenDecimals: $sendToken.decimals,
					tokenStandard: $sendToken.standard
				});

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		// calculate-UTXOs-fee endpoint only accepts "userAmount > 0"
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return new BtcAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish($sendBalance) && userAmount.gt($sendBalance)) {
			return new BtcAmountAssertionError($i18n.send.assertion.insufficient_funds);
		}
	};
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$tokenDecimals}
	bind:error={amountError}
	{calculateMax}
	{customValidate}
/>
