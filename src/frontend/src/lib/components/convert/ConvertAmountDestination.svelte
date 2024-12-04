<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ConvertInputAmount from '$lib/components/convert/ConvertInputAmount.svelte';
	import ConvertInputsContainer from '$lib/components/convert/ConvertInputsContainer.svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';

	export let sendAmount: OptionAmount = undefined;
	export let receiveAmount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	const { destinationToken, destinationTokenBalance, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	// receiveAmount will always be equal to sendAmount unless there are some fees on the receiver end (future case)
	$: receiveAmount = insufficientFunds || isNullish(sendAmount) ? undefined : Number(sendAmount);

	let receiveAmountUSD: number;
	$: receiveAmountUSD =
		nonNullish(receiveAmount) && nonNullish($destinationTokenExchangeRate)
			? receiveAmount * $destinationTokenExchangeRate
			: 0;
</script>

<ConvertInputsContainer>
	<ConvertToken slot="token-info" token={$destinationToken} />
	<ConvertInputAmount slot="amount" token={$destinationToken} amount={receiveAmount} disabled />

	<span slot="amount-info" data-tid="convert-amount-destination-amount-info">
		{formatUSD({ value: receiveAmountUSD })}
	</span>

	<span slot="balance" data-tid="convert-amount-destination-balance">
		{$i18n.send.text.balance}:
		{formatToken({
			value: $destinationTokenBalance ?? ZERO,
			unitName: $destinationToken.decimals
		})}
		{$destinationToken.symbol}
	</span>
</ConvertInputsContainer>
