<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { slide } from 'svelte/transition';
	import { debounce, isNullish } from '@dfinity/utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';
	import { parseToken } from '$lib/utils/parse.utils';
	import { balance } from '$lib/derived/balances.derived';
	import { BigNumber } from '@ethersproject/bignumber';

	export let amount: number | undefined = undefined;
	export let insufficientFunds: boolean;

	let fee: bigint | undefined;
	$: fee = ($token as IcToken).fee;

	const validate = () => {
		if (invalidAmount(amount)) {
			insufficientFunds = false;
			return;
		}

		if (isNullish(fee)) {
			insufficientFunds = false;
			return;
		}

		const total = parseToken({
			value: `${amount}`,
			unitName: $tokenDecimals
		}).add(fee);

		insufficientFunds = total.gt($balance ?? BigNumber.from(0n));
	};

	const debounceValidate = debounce(validate);

	$: amount, fee, debounceValidate();
</script>

<label for="amount" class="font-bold px-4.5">Amount:</label>
<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

{#if insufficientFunds}
	<p transition:slide class="text-cyclamen pb-3">Insufficient funds</p>
{/if}
