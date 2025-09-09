<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';

	interface Props {
		sendAmount?: OptionAmount;
		receiveAmount?: number;
		destinationTokenFee?: bigint;
		exchangeValueUnit?: DisplayUnit;
		inputUnit?: DisplayUnit;
	}

	let {
		sendAmount = undefined,
		receiveAmount = $bindable(),
		destinationTokenFee = undefined,
		exchangeValueUnit = $bindable('usd'),
		inputUnit = 'token'
	}: Props = $props();

	const { destinationToken, destinationTokenBalance, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	run(() => {
		receiveAmount = nonNullish(sendAmount)
			? nonNullish(destinationTokenFee)
				? Math.max(
						Number(sendAmount) -
							formatTokenBigintToNumber({
								value: destinationTokenFee,
								displayDecimals: $destinationToken.decimals,
								unitName: $destinationToken.decimals
							}),
						0
					)
				: Number(sendAmount)
			: undefined;
	});
</script>

<TokenInput
	amount={receiveAmount}
	disabled={true}
	displayUnit={inputUnit}
	exchangeRate={$destinationTokenExchangeRate}
	isSelectable={false}
	token={$destinationToken}
>
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<div slot="amount-info" class="text-tertiary">
		<TokenInputAmountExchange
			amount={receiveAmount}
			exchangeRate={$destinationTokenExchangeRate}
			token={$destinationToken}
			bind:displayUnit={exchangeValueUnit}
		/>
	</div>

	{#snippet balance()}
		<TokenInputBalance
			balance={$destinationTokenBalance}
			testId="convert-amount-destination-balance"
			token={$destinationToken}
		/>
	{/snippet}
</TokenInput>
