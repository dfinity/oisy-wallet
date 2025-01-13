<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from 'alchemy-sdk';
	import { getContext } from 'svelte';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { SOLANA_TRANSACTION_FEE_IN_LAMPORTS } from '$sol/constants/sol.constants';
	import { SolAmountAssertionError } from '$sol/types/sol-send';

	export let amount: OptionAmount = undefined;
	export let amountError: SolAmountAssertionError | undefined;

	const { sendToken, sendBalance, sendTokenDecimals, sendTokenStandard } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): Error | undefined => {
		if (invalidAmount(userAmount.toNumber()) || userAmount.isZero()) {
			return new SolAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish($sendBalance) && userAmount.gt($sendBalance)) {
			return new SolAmountAssertionError($i18n.send.assertion.insufficient_funds);
		}

		// TODO: add check for fee, when we will calculate the fees
	};

	$: calculateMax = (): number | undefined =>
		isNullish($sendToken)
			? undefined
			: getMaxTransactionAmount({
					balance: $sendBalance ?? ZERO,
					fee: BigNumber.from(SOLANA_TRANSACTION_FEE_IN_LAMPORTS),
					tokenDecimals: $sendTokenDecimals,
					tokenStandard: $sendTokenStandard
				});
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$sendTokenDecimals}
	{customValidate}
	{calculateMax}
	bind:error={amountError}
/>
