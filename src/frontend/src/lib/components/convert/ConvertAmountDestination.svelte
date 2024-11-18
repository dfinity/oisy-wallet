<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ConvertInputAmount from '$lib/components/convert/ConvertInputAmount.svelte';
	import ConvertInputsContainer from '$lib/components/convert/ConvertInputsContainer.svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken, formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let sendAmount: number | undefined = undefined;
	export let receiveAmount: number | undefined = undefined;
	export let insufficientFunds: boolean;
	export let totalFee: bigint | undefined = undefined;

	const { destinationToken, destinationTokenBalance, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let sendAmountAfterFee: bigint | undefined;
	$: sendAmountAfterFee =
		nonNullish(totalFee) && nonNullish(sendAmount)
			? parseToken({
					value: `${sendAmount}`,
					unitName: $destinationToken.decimals
				}).toBigInt() - totalFee
			: undefined;

	let parsedSendAmountAfterFee: number | undefined;
	$: parsedSendAmountAfterFee = nonNullish(sendAmountAfterFee)
		? formatTokenBigintToNumber({
				value: sendAmountAfterFee,
				unitName: $destinationToken.decimals,
				displayDecimals: $destinationToken.decimals
			})
		: undefined;

	$: receiveAmount =
		insufficientFunds || isNullish(parsedSendAmountAfterFee)
			? undefined
			: Math.max(parsedSendAmountAfterFee, 0);

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
		{$i18n.convert.text.available_balance}:
		{formatToken({
			value: $destinationTokenBalance ?? ZERO,
			unitName: $destinationToken.decimals
		})}
		{$destinationToken.symbol}
	</span>
</ConvertInputsContainer>
