<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { slide } from 'svelte/transition';
	import { i18n } from '$lib/stores/i18n.store';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { invalidAmount } from '$lib/utils/input.utils';
	import MaxButton from '$lib/components/common/MaxButton.svelte';

	export let amount: number | undefined = undefined;
	export let tokenDecimals: number | undefined = undefined;
	export let placeholder: string = $i18n.core.text.amount;
	export let customValidate: (userAmount: BigNumber) => Error | undefined = () => undefined;
	export let calculateMax: (() => number | undefined) | undefined = undefined;
	export let error: Error | undefined;

	let onMax = () => {
		amount = calculateMax?.();
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
</script>

<label for="amount" class="font-bold px-4.5">{$i18n.core.text.amount}</label>
<Input
	name="amount"
	inputType="currency"
	required
	bind:value={amount}
	decimals={tokenDecimals}
	{placeholder}
	spellcheck={false}
	testId="amount-input"
>
	<MaxButton slot="inner-end" on:click={onMax} disabled={isNullish(calculateMax)} />
</Input>

{#if nonNullish(error)}
	<p transition:slide={{ duration: 250 }} class="text-cyclamen pb-3">{error.message}</p>
{/if}
