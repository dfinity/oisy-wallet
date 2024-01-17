<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { getContext } from 'svelte';
	import { debounce, isNullish } from '@dfinity/utils';
	import { minGasFee } from '$eth/utils/fee.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { tokenDecimals } from '$lib/derived/token.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import { slide } from 'svelte/transition';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	const { store: storeFeeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	const validate = () => {
		if (invalidAmount(amount)) {
			insufficientFunds = false;
			return;
		}

		if (isNullish($storeFeeData)) {
			insufficientFunds = false;
			return;
		}

		const total = parseToken({
			value: `${amount}`,
			unitName: $tokenDecimals
		}).add(minGasFee($storeFeeData));

		insufficientFunds = total.gt($balance ?? BigNumber.from(0n));
	};

	const debounceValidate = debounce(validate);

	$: amount, $storeFeeData, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">Amount:</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={$tokenDecimals}
	placeholder="Amount"
/>

{#if insufficientFunds}
	<p transition:slide class="text-cyclamen pb-3">Insufficient funds for gas</p>
{/if}
