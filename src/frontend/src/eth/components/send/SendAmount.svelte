<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import { getContext } from 'svelte';
	import { debounce, isNullish } from '@dfinity/utils';
	import { minGasFee } from '$eth/utils/fee.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { slide } from 'svelte/transition';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	const { store: storeFeeData } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);

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
			unitName: $sendTokenDecimals
		}).add(minGasFee($storeFeeData));

		insufficientFunds = total.gt($sendBalance ?? BigNumber.from(0n));
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
	decimals={$sendTokenDecimals}
	placeholder="Amount"
/>

{#if insufficientFunds}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">Insufficient funds for gas</p>
{/if}
