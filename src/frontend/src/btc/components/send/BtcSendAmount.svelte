<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import { BtcAmountAssertionError } from '$btc/types/btc-send';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	export let amount: OptionAmount = undefined;
	export let amountError: BtcAmountAssertionError | undefined;

	const { sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

	// TODO: Enable Max button by passing the `calculateMax` prop - https://dfinity.atlassian.net/browse/GIX-3114

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
	{customValidate}
/>
