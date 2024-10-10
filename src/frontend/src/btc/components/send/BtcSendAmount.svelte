<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { BtcAmountAssertionError } from '$btc/types/btc-send';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
	import { tokenDecimals } from '$lib/derived/token.derived';
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
</script>

<SendInputAmount
	bind:amount
	tokenDecimals={$tokenDecimals}
	bind:error={amountError}
	{calculateMax}
/>
