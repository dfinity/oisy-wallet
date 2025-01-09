<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let amountError: SolAmountAssertionError | undefined;

	const { sendBalance, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return new SolAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish($sendBalance) && userAmount.gt($sendBalance)) {
			return new SolAmountAssertionError($i18n.send.assertion.insufficient_funds);
		}

		// TODO: add check for fee, when we will calculate the fees
	};

	// TODO: Enable Max button by passing the `calculateMax` prop
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$sendTokenDecimals}
	{customValidate}
	bind:error={amountError}
/>
