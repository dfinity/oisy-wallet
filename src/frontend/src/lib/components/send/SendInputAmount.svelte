<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import MaxButton from '$lib/components/common/MaxButton.svelte';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let amount: OptionAmount = undefined;
	export let tokenDecimals: number | undefined = undefined;
	export let placeholder: string = $i18n.core.text.amount;
	export let customValidate: (userAmount: BigNumber) => Error | undefined = () => undefined;
	export let calculateMax: (() => number | undefined) | undefined = undefined;
	export let error: Error | undefined = undefined;
	export let amountSetToMax = false;

	let onMax = () => {
		amountSetToMax = true;
		amount = calculateMax?.();
	};

	export const triggerCalculateMax = onMax;

	const dispatch = createEventDispatcher();

	const onInput = () => {
		amountSetToMax = false;

		// Bubble nnsInput as consumers might require the event as well (which is the case in Oisy).
		dispatch('nnsInput');
	};

	const validate = () => {
		if (invalidAmount(amount)) {
			error = undefined;
			return;
		}

		const parsedValue = parseToken({
			value: `${amount}`,
			unitName: tokenDecimals
		});

		error = customValidate(parsedValue);
	};

	const debounceValidate = debounce(validate, 300);

	$: amount, tokenDecimals, debounceValidate();

	export const triggerValidate = debounceValidate;
</script>

<label for="amount" class="px-4.5 font-bold">{$i18n.core.text.amount}</label>
<InputCurrency
	name="amount"
	bind:value={amount}
	decimals={tokenDecimals}
	{placeholder}
	testId="amount-input"
	on:nnsInput={onInput}
>
	<MaxButton slot="inner-end" on:click={onMax} disabled={isNullish(calculateMax)} />
</InputCurrency>

{#if nonNullish(error)}
	<p transition:slide={SLIDE_DURATION} class="pb-3 text-cyclamen">{error.message}</p>
{/if}
