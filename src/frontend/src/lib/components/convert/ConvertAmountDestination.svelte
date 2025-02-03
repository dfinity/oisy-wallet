<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let sendAmount: OptionAmount = undefined;
	export let receiveAmount: number | undefined = undefined;
	export let exchangeValueUnit: DisplayUnit = 'usd';
	export let inputUnit: DisplayUnit = 'token';

	const { destinationToken, destinationTokenBalance, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	// receiveAmount will always be equal to sendAmount unless there are some fees on the receiver end (future case)
	$: receiveAmount = nonNullish(sendAmount) ? Number(sendAmount) : undefined;
</script>

<TokenInput
	token={$destinationToken}
	amount={receiveAmount}
	exchangeRate={$destinationTokenExchangeRate}
	disabled={true}
	isSelectable={false}
	displayUnit={inputUnit}
>
	<div slot="amount-info" class="text-tertiary">
		<TokenInputAmountExchange
			amount={receiveAmount}
			exchangeRate={$destinationTokenExchangeRate}
			token={$destinationToken}
			bind:displayUnit={exchangeValueUnit}
		/>
	</div>

	<TokenInputBalance
		slot="balance"
		testId="convert-amount-destination-balance"
		token={$destinationToken}
		balance={$destinationTokenBalance}
	/>
</TokenInput>
